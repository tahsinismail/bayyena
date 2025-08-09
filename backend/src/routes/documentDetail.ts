// backend/src/routes/documentDetail.ts
import { Router } from 'express';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();
router.use(isAuthenticated);

// This route will handle GET /api/documents/:id
router.get('/:id', async (req, res, next) => {
    const docId = parseInt(req.params.id);
    if (isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid document ID.' });
    }

    try {
        const result = await db.select().from(documents).where(eq(documents.id, docId));
        const document = result[0];

        if (!document) {
            return res.status(404).json({ message: 'Document not found.' });
        }
        
        res.status(200).json(document);
    } catch (err) {
        next(err);
    }
});

export default router;
