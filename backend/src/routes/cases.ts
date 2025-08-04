// backend/src/routes/cases.ts
import { Router } from 'express';
import { db } from '../db';
import { cases, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

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

    if (!title || !type) {
        return res.status(400).json({ message: 'Title and case type are required.' });
    }

    // Generate a unique case number (simple version)
    const caseNumber = `CASE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
        const newCase = await db.insert(cases).values({
            title,
            description,
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

export default router;
