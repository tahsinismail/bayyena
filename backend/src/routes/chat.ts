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
        const caseDocs = await db.select().from(documents).where(and(eq(documents.caseId, caseId), eq(documents.processingStatus, 'PROCESSED')));
        if (caseDocs.length === 0) return res.status(400).json({ answer: "No processed documents to chat with." });

        // Get conversation history for context
        const chatHistory = await db.select().from(chatMessages)
            .where(eq(chatMessages.caseId, caseId))
            .orderBy(asc(chatMessages.createdAt))
            .limit(20); // Last 20 messages for context

        const context = caseDocs.map(doc => `--- Document: ${doc.fileName} ---\n${doc.extractedText}`).join('\n\n');
        
        const conversationHistory = chatHistory.length > 0 
            ? chatHistory.map(msg => `${msg.sender.toUpperCase()}: ${msg.text}`).join('\n')
            : "This is the first message in this case conversation.";
        
        const prompt = `You are a professional legal AI assistant helping a lawyer analyze case documents. Your role is to provide accurate, helpful, and legally-informed responses based strictly on the provided case documents.

IMPORTANT GUIDELINES:
1. **Accuracy First**: Only provide information that is directly supported by the case documents
2. **Legal Context**: Frame responses in legal terminology and consider legal implications
3. **Law(s) for Analysis**: Perform a search on official government websites or reputable legal resources to identify relevant laws for consideration in the analysis of the facts presented. The jurisdiction for the search will be determined by the content of the uploaded documents or by a user-specified location in the chat conversation.
4. **Professional Tone**: Maintain a formal, professional tone appropriate for legal practice
5. **Memory**: Remember the entire conversation context within this case
6. **Cite Sources**: When referencing information, mention which document it comes from
7. **No Speculation**: If information is not in the documents, clearly state this limitation and avoid making assumptions. Ask the user if they want to search online for relevant information.
8. **Court Memos**: If user asks for it, draft content that can be integrated into court memos, complete with legal citations and a clear, logical flow based on case jurisdiction.
9. **Confidentiality**: Treat all case information as strictly confidential

CASE DOCUMENTS:
${context}

PREVIOUS CONVERSATION CONTEXT:
${conversationHistory}

USER QUESTION: "${message}"

Please provide a comprehensive, legally-informed response based on the case documents and conversation context.`;
        
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
