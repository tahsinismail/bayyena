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

        const context = caseDocs.map(doc => `--- Document: ${doc.fileName} ---\n${doc.extractedText}`).join('\n\n');
        const prompt = `Based only on the following documents, answer the user's question. If the answer is not in the documents, say so.\n\n--- DOCUMENTS ---\n${context}\n--- END DOCUMENTS ---\n\nUSER QUESTION: "${message}"`;
        
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
