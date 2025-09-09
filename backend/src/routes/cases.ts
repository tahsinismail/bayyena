// backend/src/routes/cases.ts
import { Router } from 'express';
import { db } from '../db';
import { cases, users, documents, chatMessages } from '../db/schema';
import { eq, and, count, gte } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiProcessor } from '../services/geminiProcessor';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL! });

// Use the middleware for all routes in this file
router.use(isAuthenticated);

// GET /api/cases/dashboard-stats - Get dashboard statistics for the logged-in user
router.get('/dashboard-stats', async (req, res, next) => {
  const user = req.user as typeof users.$inferSelect;
  try {
    // Get total cases count for this user
    const totalCasesResult = await db.select({ count: count() })
      .from(cases)
      .where(eq(cases.userId, user.id));
    const totalCases = totalCasesResult[0]?.count || 0;

    // Get cases by priority
    const highPriorityCasesResult = await db.select({ count: count() })
      .from(cases)
      .where(and(eq(cases.userId, user.id), eq(cases.priority, 'High')));
    const highPriorityCases = highPriorityCasesResult[0]?.count || 0;

    const normalPriorityCasesResult = await db.select({ count: count() })
      .from(cases)
      .where(and(eq(cases.userId, user.id), eq(cases.priority, 'Normal')));
    const normalPriorityCases = normalPriorityCasesResult[0]?.count || 0;

    const lowPriorityCasesResult = await db.select({ count: count() })
      .from(cases)
      .where(and(eq(cases.userId, user.id), eq(cases.priority, 'Low')));
    const lowPriorityCases = lowPriorityCasesResult[0]?.count || 0;

    // Get cases by status
    const openCasesResult = await db.select({ count: count() })
      .from(cases)
      .where(and(eq(cases.userId, user.id), eq(cases.status, 'Open')));
    const openCases = openCasesResult[0]?.count || 0;

    const closedCasesResult = await db.select({ count: count() })
      .from(cases)
      .where(and(eq(cases.userId, user.id), eq(cases.status, 'Closed')));
    const closedCases = closedCasesResult[0]?.count || 0;

    // Get total documents across all user's cases
    const totalDocumentsResult = await db.select({ count: count() })
      .from(documents)
      .innerJoin(cases, eq(documents.caseId, cases.id))
      .where(eq(cases.userId, user.id));
    const totalDocuments = totalDocumentsResult[0]?.count || 0;

    // Get processed documents
    const processedDocumentsResult = await db.select({ count: count() })
      .from(documents)
      .innerJoin(cases, eq(documents.caseId, cases.id))
      .where(and(eq(cases.userId, user.id), eq(documents.processingStatus, 'PROCESSED')));
    const processedDocuments = processedDocumentsResult[0]?.count || 0;

    // Get recent cases (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCasesResult = await db.select({ count: count() })
      .from(cases)
      .where(and(eq(cases.userId, user.id), gte(cases.createdAt, sevenDaysAgo)));
    const recentCases = recentCasesResult[0]?.count || 0;

    // Get recent chat messages (last 7 days) across all user's cases
    const recentMessagesResult = await db.select({ count: count() })
      .from(chatMessages)
      .innerJoin(cases, eq(chatMessages.caseId, cases.id))
      .where(and(eq(cases.userId, user.id), gte(chatMessages.createdAt, sevenDaysAgo)));
    const recentMessages = recentMessagesResult[0]?.count || 0;

    res.json({
      totalCases,
      casesByPriority: {
        high: highPriorityCases,
        normal: normalPriorityCases,
        low: lowPriorityCases
      },
      casesByStatus: {
        open: openCases,
        closed: closedCases
      },
      totalDocuments,
      processedDocuments,
      recentActivity: {
        recentCases,
        recentMessages
      }
    });
  } catch (err) {
    console.error('Error fetching user dashboard stats:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/cases - Get all cases for the logged-in user
router.get('/', async (req, res, next) => {
  const user = req.user as typeof users.$inferSelect;
  try {
    const userCases = await db.select().from(cases).where(eq(cases.userId, user.id));
    res.status(200).json(userCases);
  } catch (err) {
    next(err);
  }
});

// POST /api/cases - Create a new case
router.post('/', async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const { title, description, priority } = req.body;

    // Priority defaults to "Normal" if not provided
    const casePriority = priority || 'Normal';

    // Generate a unique case number (simple version)
    const caseNumber = `MATTER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
        const newCase = await db.insert(cases).values({
            title: title || 'Untitled',
            description: description || '',
            priority: casePriority,
            userId: user.id,
            caseNumber,
        }).returning();

        res.status(201).json(newCase[0]);
    } catch (err) {
        next(err);
    }
});

// GET /api/cases/:id - Get a single case by ID
router.get('/:id', async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);

    try {
        const result = await db.select().from(cases).where(
            and(eq(cases.id, caseId), eq(cases.userId, user.id))
        );
        
        const aCase = result[0];
        if (!aCase) {
            return res.status(404).json({ message: 'Case not found or you do not have permission to view it.' });
        }
        res.status(200).json(aCase);
    } catch(err) {
        next(err);
    }
});

// DELETE /api/cases/:id - Delete a case and its associated files
router.delete('/:id', isAuthenticated, async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);

    if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid matter ID.' });
    }

    try {
        // Step 1: Find the case to ensure it belongs to the logged-in user
        const caseResult = await db.select().from(cases).where(
            and(eq(cases.id, caseId), eq(cases.userId, user.id))
        );
        const caseToDelete = caseResult[0];

        if (!caseToDelete) {
            return res.status(404).json({ message: 'Matter not found or you do not have permission to delete it.' });
        }

        // Step 2: Find all documents associated with this case
        const docsToDelete = await db.select().from(documents).where(eq(documents.caseId, caseId));

        // Step 3: Delete the physical files from the server's storage
        docsToDelete.forEach(doc => {
            // Construct the full path and delete the file
            const filePath = path.resolve(doc.storagePath);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        // Log the error, but don't stop the process.
                        // The database record will still be deleted.
                        console.error(`Failed to delete file: ${filePath}`, err);
                    }
                });
            }
        });

        // Step 4: Delete the case record from the database.
        // Due to 'onDelete: cascade', this will also delete all associated document records from the DB.
        await db.delete(cases).where(eq(cases.id, caseId));

        res.status(200).json({ message: 'The matter and all associated documents deleted successfully.' });

    } catch (err) {
        next(err);
    }
});

// PATCH /api/cases/:id/status - Update case status
router.patch('/:id/status', async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid matter ID.' });
    }

    if (!status || !['Open', 'Closed', 'Archived'].includes(status)) {
        return res.status(400).json({ message: 'Valid status is required. Must be one of: Open, Closed, Archived' });
    }

    try {
        // Find the case to ensure it belongs to the logged-in user
        const caseResult = await db.select().from(cases).where(
            and(eq(cases.id, caseId), eq(cases.userId, user.id))
        );
        
        if (caseResult.length === 0) {
            return res.status(404).json({ message: 'Matter not found or you do not have permission to update it.' });
        }

        // Update the case status
        const updatedCase = await db.update(cases)
            .set({ 
                status,
                updatedAt: new Date()
            })
            .where(eq(cases.id, caseId))
            .returning();

        res.status(200).json(updatedCase[0]);
    } catch (err) {
        next(err);
    }
});

// PATCH /api/cases/:id - Update case title, description, priority, and status
router.patch('/:id', async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);
    const { title, description, priority, status } = req.body;

    if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid matter ID.' });
    }

    if (!title && !description && !priority && !status) {
        return res.status(400).json({ message: 'At least title, description, priority, or status must be provided.' });
    }

    try {
        // Find the case to ensure it belongs to the logged-in user
        const caseResult = await db.select().from(cases).where(
            and(eq(cases.id, caseId), eq(cases.userId, user.id))
        );
        
        if (caseResult.length === 0) {
            return res.status(404).json({ message: 'Matter not found or you do not have permission to update it.' });
        }

        // Prepare update data
        const updateData: any = { updatedAt: new Date() };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;

        // Update the case
        const updatedCase = await db.update(cases)
            .set(updateData)
            .where(eq(cases.id, caseId))
            .returning();

        res.status(200).json(updatedCase[0]);
    } catch (err) {
        next(err);
    }
});

// Helper: Normalize AI priority to one of our allowed enums
const ALLOWED_PRIORITIES = ['High', 'Normal', 'Low'] as const;
type AllowedPriority = typeof ALLOWED_PRIORITIES[number];

function mapToAllowedPriority(raw: string | undefined): AllowedPriority {
  if (!raw) return 'Normal';
  const value = raw.trim().toLowerCase();
  // Direct matches
  for (const allowed of ALLOWED_PRIORITIES) {
    if (allowed.toLowerCase() === value) return allowed;
  }
  // Heuristic mapping for common synonyms
  if (/(urgent|critical|high|important|immediate|rush|emergency)/i.test(raw)) return 'High';
  if (/(low|minor|routine|standard|regular|simple)/i.test(raw)) return 'Low';
  return 'Normal';
}

// Helper: Fallback generation when AI fails
function basicFallbackFromDocs(docs: Array<{ fileName: string; summary?: string; extractedText?: string }>): { title: string; description: string; priority: AllowedPriority } {
  const docCount = docs.length;
  const firstDoc = docs[0];
  const baseTitle = firstDoc?.fileName?.replace(/[_-]+/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '') || 'Matter';
  const title = `${baseTitle} – ${docCount > 1 ? 'Multi-Document' : 'Document'} Review`;
  const snippet = (firstDoc?.summary || firstDoc?.extractedText || '').replace(/\s+/g, ' ').slice(0, 160);
  const description = snippet
    ? `${snippet}${snippet.endsWith('.') ? '' : '...'}`
    : `This matter involves ${docCount} document${docCount > 1 ? 's' : ''} under review.`;
  // Very light heuristic for priority
  const textAll = docs.map(d => `${d.summary || ''} ${d.extractedText || ''}`).join(' ').toLowerCase();
  let priority: AllowedPriority = 'Normal';
  if (/(urgent|critical|emergency|immediate|asap|rush|high priority)/.test(textAll)) priority = 'High';
  else if (/(routine|simple|basic|standard|low priority|minor)/.test(textAll)) priority = 'Low';
  return { title, description, priority };
}

// POST /api/cases/:id/auto-generate - Auto-generate case title and description based on documents
router.post('/:id/auto-generate', async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);

    if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid case ID.' });
    }

    try {
        // Find the case to ensure it belongs to the logged-in user
        const caseResult = await db.select().from(cases).where(
            and(eq(cases.id, caseId), eq(cases.userId, user.id))
        );
        
        if (caseResult.length === 0) {
            return res.status(404).json({ message: 'Matter not found or you do not have permission to update it.' });
        }

        const currentCase = caseResult[0];

        // Get processed documents for this case (include fields used for richer context)
        const caseDocs = await db.select({
            id: documents.id,
            fileName: documents.fileName,
            fileType: documents.fileType,
            summary: documents.summary,
            extractedText: documents.extractedText,
        }).from(documents).where(
            and(eq(documents.caseId, caseId), eq(documents.processingStatus, 'PROCESSED'))
        );

        if (caseDocs.length === 0) {
            return res.status(400).json({ message: 'No processed documents found to generate title and description.' });
        }

        // Prepare document context for AI analysis – grounded and explicit
        const documentSummaries = caseDocs.map((doc, idx) => {
            const summary = (doc.summary || '').replace(/\s+/g, ' ').slice(0, 1500);
            const snippet = (doc.extractedText || '').replace(/\s+/g, ' ').slice(0, 1000);
            return [
              `# Document ${idx + 1}`,
              `fileName: ${doc.fileName}`,
              `fileType: ${doc.fileType}`,
              `summary: ${summary || 'N/A'}`,
              `excerpt: ${snippet || 'N/A'}`,
            ].join('\n');
        }).join('\n\n');

        const prompt = `You are a professional legal case assistant. BASE YOUR OUTPUT STRICTLY on the provided documents. Do not add facts not present in the inputs.

Generate a concise, professional case title, a 1–2 sentence description, and the most appropriate case type. The result MUST:
- Derive language only from document summaries/excerpts below (no hallucinations)
- Reflect the scenario indicated by the documents (parties, dispute nature, subject matter) where apparent
- Keep the title 3–8 words, professional, and specific
- Keep the description 1–2 sentences, precise and neutral
- For case type, choose EXACTLY one from the allowed list. If none fits, use "Other".

REQUIREMENTS:
1. Title: Should be 3-8 words, professional, and clearly indicate the nature of the legal matter
2. Description: Should be 1-2 sentences, professional, and provide a brief overview of the case
3. Priority: Choose the most appropriate priority level (High, Normal, or Low) based on urgency and importance
4. Use legal terminology appropriately
5. Be specific about the type of legal issue (contract dispute, personal injury, family law, etc.)
6. Avoid overly technical jargon that would confuse non-lawyers

AVAILABLE PRIORITIES:
- High: Urgent matters requiring immediate attention (deadlines, emergencies, court dates)
- Normal: Standard legal matters with typical timelines
- Low: Routine matters or long-term projects

DOCUMENT SUMMARIES:
${documentSummaries}

CURRENT CASE PRIORITY: ${currentCase.priority}

Respond ONLY with minified JSON (no markdown, no code fences):
{
  "title": "Generated professional case title",
  "description": "Generated professional case description",
  "priority": "Most appropriate priority level (High, Normal, or Low)"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        let generatedData: { title?: string; description?: string; priority?: string } = {};
        try {
            generatedData = JSON.parse(responseText);
        } catch (parseError) {
            // Ignore parse error; fallback below after validation
        }

        // Validate and normalize outputs; fallback if missing/invalid
        const mappedPriority = mapToAllowedPriority(generatedData.priority) || currentCase.priority as AllowedPriority;
        let finalTitle = (generatedData.title || '').trim();
        let finalDescription = (generatedData.description || '').trim();
        let finalPriority: AllowedPriority = mapToAllowedPriority(mappedPriority);

        if (!finalTitle || !finalDescription) {
            const fallback = basicFallbackFromDocs(caseDocs.map(d => ({
              fileName: d.fileName,
              summary: d.summary ?? undefined,
              extractedText: d.extractedText ?? undefined,
            })));
            finalTitle = finalTitle || fallback.title;
            finalDescription = finalDescription || fallback.description;
            if (!finalPriority) finalPriority = fallback.priority;
        }

        // Ensure priority belongs to our enum; if not, pick Normal
        if (!ALLOWED_PRIORITIES.includes(finalPriority)) {
            finalPriority = 'Normal';
        }

        // Update the case with generated title, description, and priority (mapped)
        const updatedCase = await db.update(cases)
            .set({
                title: finalTitle,
                description: finalDescription,
                priority: finalPriority,
                updatedAt: new Date()
            })
            .where(eq(cases.id, caseId))
            .returning();

        res.status(200).json({
            case: updatedCase[0],
            generated: { title: finalTitle, description: finalDescription, priority: finalPriority }
        });
    } catch (err) {
        console.error('Error auto-generating case data:', err);
        next(err);
    }
});

// POST /api/cases/:id/generate-title - Generate case title based on documents and chat
router.post('/:id/generate-title', async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);

    if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid matter ID.' });
    }

    try {
        // Find the case to ensure it belongs to the logged-in user
        const caseResult = await db.select().from(cases).where(
            and(eq(cases.id, caseId), eq(cases.userId, user.id))
        );
        
        if (caseResult.length === 0) {
            return res.status(404).json({ message: 'Matter not found or you do not have permission to update it.' });
        }

        const currentCase = caseResult[0];

        // Get processed documents for this case
        const caseDocuments = await db.select().from(documents).where(
            and(eq(documents.caseId, caseId), eq(documents.processingStatus, 'PROCESSED'))
        );

        // Collect document summaries
        const documentSummaries: string[] = [];
        for (const doc of caseDocuments) {
            if (doc.summary) {
                documentSummaries.push(doc.summary);
            }
        }

        // Get recent chat messages from request body (optional)
        const { chatMessages = [] } = req.body;

        // Generate the title using Gemini
        const generatedTitle = await geminiProcessor.generateCaseTitle({
            documentSummaries,
            chatMessages: Array.isArray(chatMessages) ? chatMessages : [],
            existingTitle: currentCase.title
        });

        // Update the case with the new title
        const updatedCase = await db.update(cases)
            .set({ 
                title: generatedTitle,
                updatedAt: new Date()
            })
            .where(eq(cases.id, caseId))
            .returning();

        res.status(200).json({
            title: generatedTitle,
            case: updatedCase[0]
        });

    } catch (err) {
        console.error('Error generating case title:', err);
        next(err);
    }
});

export default router;
