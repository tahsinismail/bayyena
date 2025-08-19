// backend/src/routes/chat.ts
import { Router } from 'express';
import { db } from '../db';
import { documents, chatMessages } from '../db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL! });

router.use(isAuthenticated);

// POST /api/chat/:caseId
router.post('/:caseId', async (req, res, next) => {
    const caseId = parseInt(req.params.caseId);
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required.' });

    try {
        // Get case documents if available
        const caseDocs = await db.select().from(documents).where(and(eq(documents.caseId, caseId), eq(documents.processingStatus, 'PROCESSED')));
        
        // Get conversation history for context
        const chatHistory = await db.select().from(chatMessages)
            .where(eq(chatMessages.caseId, caseId))
            .orderBy(asc(chatMessages.createdAt))
            .limit(20); // Last 20 messages for context

        // Build document context if available
        const context = caseDocs.length > 0 
            ? caseDocs.map(doc => `--- Document: ${doc.fileName} ---\n${doc.extractedText}`).join('\n\n')
            : null;
        
        const conversationHistory = chatHistory.length > 0 
            ? chatHistory.map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n')
            : "This is the first message in this case conversation.";
        
        const prompt = `You are a professional legal AI assistant helping lawyers and legal professionals with legal analysis and document review. You provide comprehensive legal guidance while maintaining strict adherence to legal ethics and accuracy.

CORE CAPABILITIES:
1. **Document Analysis**: Analyze and interpret uploaded case documents with legal precision
2. **General Legal Guidance**: Answer legal questions across various practice areas
3. **Legal Research**: Identify relevant laws, regulations, and precedents
4. **Case Strategy**: Provide insights on legal strategy and case development
5. **Court Documents**: Draft memos, briefs, and other legal documents

IMPORTANT GUIDELINES:
1. **Legal Context**: Always frame responses within appropriate legal framework
2. **Document-Aware**: When case documents are available, reference them when relevant to the query
3. **Jurisdiction**: Determine jurisdiction from documents or user input for accurate legal guidance
4. **Professional Standards**: Maintain formal, professional tone suitable for legal practice
5. **Cite Sources**: Reference specific documents and legal authorities when applicable
6. **Ethical Boundaries**: Never provide advice that could constitute unauthorized practice of law
7. **Accuracy**: Only provide information you can verify; acknowledge limitations clearly
8. **Confidentiality**: Treat all case information as strictly confidential

RESPONSE FRAMEWORK:
- For document-related queries: Analyze documents and provide detailed legal interpretation
- For general legal questions: Provide comprehensive legal information while noting any relevant case documents
- For procedural questions: Explain legal processes and requirements
- For research requests: Identify applicable laws and precedents based on jurisdiction
- For drafting requests: Create professional legal content with proper citations

AVAILABLE CASE DOCUMENTS:
${context || "No case documents have been uploaded yet."}

CONVERSATION HISTORY:
${conversationHistory}

USER QUERY: "${message}"

Please provide a comprehensive legal response. If the query relates to general legal matters, provide thorough guidance while noting any connections to uploaded documents when relevant.`;
        
        const result = await model.generateContent(prompt);
        const answer = result.response.text();

        await db.insert(chatMessages).values([
            { caseId, sender: 'user', text: message },
            { caseId, sender: 'bot', text: answer },
        ]);

        res.status(200).json({ answer });
    } catch (err) {
        console.error("Gemini chat error:", err);
        next(err);
    }
});

// GET /api/chat/:caseId/history
router.get('/:caseId/history', async (req, res, next) => {
    const caseId = parseInt(req.params.caseId);
    if (isNaN(caseId)) return res.status(400).json({ message: 'Invalid Case ID.' });

    try {
        const history = await db.select().from(chatMessages).where(eq(chatMessages.caseId, caseId)).orderBy(asc(chatMessages.createdAt));
        res.status(200).json(history);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/chat/:caseId/history
router.delete('/:caseId/history', async (req, res, next) => {
    const caseId = parseInt(req.params.caseId);
    if (isNaN(caseId)) return res.status(400).json({ message: 'Invalid Case ID.' });

    try {
        await db.delete(chatMessages).where(eq(chatMessages.caseId, caseId));
        res.status(200).json({ message: 'Chat history cleared.' });
    } catch (err) {
        next(err);
    }
});

export default router;
