// backend/src/routes/cases.ts
import { Router } from 'express';
import { db } from '../db';
import { cases, users, documents } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL! });

// Use the middleware for all routes in this file
router.use(isAuthenticated);

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
    const { title, description, type } = req.body;

    // Only type is required now, title defaults to "Untitled"
    if (!type) {
        return res.status(400).json({ message: 'Matter type is required.' });
    }

    // Generate a unique case number (simple version)
    const caseNumber = `MATTER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
        const newCase = await db.insert(cases).values({
            title: title || 'Untitled',
            description: description || '',
            type,
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

    if (!status || !['Open', 'Closed', 'Pending', 'Archived'].includes(status)) {
        return res.status(400).json({ message: 'Valid status is required. Must be one of: Open, Closed, Pending, Archived' });
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

// PATCH /api/cases/:id - Update case title, description, and type
router.patch('/:id', async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);
    const { title, description, type } = req.body;

    if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid matter ID.' });
    }

    if (!title && !description && !type) {
        return res.status(400).json({ message: 'At least title, description, or type must be provided.' });
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
        if (type !== undefined) updateData.type = type;

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

// Helper: Normalize AI case type to one of our allowed enums
const ALLOWED_CASE_TYPES = ['Civil Dispute', 'Criminal Defense', 'Family Law', 'Intellectual Property', 'Corporate Law', 'Other'] as const;
type AllowedCaseType = typeof ALLOWED_CASE_TYPES[number];

function mapToAllowedCaseType(raw: string | undefined): AllowedCaseType {
  if (!raw) return 'Other';
  const value = raw.trim().toLowerCase();
  // Direct matches
  for (const allowed of ALLOWED_CASE_TYPES) {
    if (allowed.toLowerCase() === value) return allowed;
  }
  // Heuristic mapping for common synonyms
  if (/(contract|tort|civil|breach|negligence|damages|property dispute)/i.test(raw)) return 'Civil Dispute';
  if (/(criminal|felony|misdemeanor|prosecution|defense|arrest|indictment)/i.test(raw)) return 'Criminal Defense';
  if (/(family|divorce|custody|alimony|marriage|guardianship|adoption)/i.test(raw)) return 'Family Law';
  if (/(trademark|patent|copyright|ip|intellectual property|licensing)/i.test(raw)) return 'Intellectual Property';
  if (/(corporate|shareholder|merger|acquisition|company|director|officer)/i.test(raw)) return 'Corporate Law';
  return 'Other';
}

// Helper: Fallback generation when AI fails
function basicFallbackFromDocs(docs: Array<{ fileName: string; summary?: string; extractedText?: string }>): { title: string; description: string; type: AllowedCaseType } {
  const docCount = docs.length;
  const firstDoc = docs[0];
  const baseTitle = firstDoc?.fileName?.replace(/[_-]+/g, ' ').replace(/\.[a-zA-Z0-9]+$/, '') || 'Matter';
  const title = `${baseTitle} – ${docCount > 1 ? 'Multi-Document' : 'Document'} Review`;
  const snippet = (firstDoc?.summary || firstDoc?.extractedText || '').replace(/\s+/g, ' ').slice(0, 160);
  const description = snippet
    ? `${snippet}${snippet.endsWith('.') ? '' : '...'}`
    : `This matter involves ${docCount} document${docCount > 1 ? 's' : ''} under review.`;
  // Very light heuristic for type
  const textAll = docs.map(d => `${d.summary || ''} ${d.extractedText || ''}`).join(' ').toLowerCase();
  let type: AllowedCaseType = 'Other';
  if (/(contract|civil|negligence|dispute)/.test(textAll)) type = 'Civil Dispute';
  else if (/(criminal|prosecution|defense|arrest)/.test(textAll)) type = 'Criminal Defense';
  else if (/(divorce|custody|family)/.test(textAll)) type = 'Family Law';
  else if (/(patent|trademark|copyright|intellectual property|licensing)/.test(textAll)) type = 'Intellectual Property';
  else if (/(corporate|shareholder|merger|acquisition|board)/.test(textAll)) type = 'Corporate Law';
  return { title, description, type };
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
 3. Type: Choose the most appropriate case type from the available options (must match exactly)
4. Use legal terminology appropriately
5. Be specific about the type of legal issue (contract dispute, personal injury, family law, etc.)
6. Avoid overly technical jargon that would confuse non-lawyers

AVAILABLE CASE TYPES:
- Civil Dispute
- Criminal Defense
- Family Law
- Intellectual Property
- Corporate Law
- Other

DOCUMENT SUMMARIES:
${documentSummaries}

CURRENT CASE TYPE: ${currentCase.type}

Respond ONLY with minified JSON (no markdown, no code fences):
{
  "title": "Generated professional case title",
  "description": "Generated professional case description",
  "type": "Most appropriate case type from the available options"
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        let generatedData: { title?: string; description?: string; type?: string } = {};
        try {
            generatedData = JSON.parse(responseText);
        } catch (parseError) {
            // Ignore parse error; fallback below after validation
        }

        // Validate and normalize outputs; fallback if missing/invalid
        const mappedType = mapToAllowedCaseType(generatedData.type) || currentCase.type as AllowedCaseType;
        let finalTitle = (generatedData.title || '').trim();
        let finalDescription = (generatedData.description || '').trim();
        let finalType: AllowedCaseType = mapToAllowedCaseType(mappedType);

        if (!finalTitle || !finalDescription) {
            const fallback = basicFallbackFromDocs(caseDocs.map(d => ({
              fileName: d.fileName,
              summary: d.summary ?? undefined,
              extractedText: d.extractedText ?? undefined,
            })));
            finalTitle = finalTitle || fallback.title;
            finalDescription = finalDescription || fallback.description;
            if (!finalType) finalType = fallback.type;
        }

        // Ensure type belongs to our enum; if not, pick Other
        if (!ALLOWED_CASE_TYPES.includes(finalType)) {
            finalType = 'Other';
        }

        // Update the case with generated title, description, and type (mapped)
        const updatedCase = await db.update(cases)
            .set({
                title: finalTitle,
                description: finalDescription,
                type: finalType,
                updatedAt: new Date()
            })
            .where(eq(cases.id, caseId))
            .returning();

        res.status(200).json({
            case: updatedCase[0],
            generated: { title: finalTitle, description: finalDescription, type: finalType }
        });
    } catch (err) {
        console.error('Error auto-generating case data:', err);
        next(err);
    }
});

export default router;
