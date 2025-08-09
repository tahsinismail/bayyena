// backend/src/routes/cases.ts
import { Router } from 'express';
import { db } from '../db';
import { cases, users, documents } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';

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

// DELETE /api/cases/:id - Delete a case and its associated files
router.delete('/:id', isAuthenticated, async (req, res, next) => {
    const user = req.user as typeof users.$inferSelect;
    const caseId = parseInt(req.params.id);

    if (isNaN(caseId)) {
        return res.status(400).json({ message: 'Invalid case ID.' });
    }

    try {
        // Step 1: Find the case to ensure it belongs to the logged-in user
        const caseResult = await db.select().from(cases).where(
            and(eq(cases.id, caseId), eq(cases.userId, user.id))
        );
        const caseToDelete = caseResult[0];

        if (!caseToDelete) {
            return res.status(404).json({ message: 'Case not found or you do not have permission to delete it.' });
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

        res.status(200).json({ message: 'Case and all associated documents deleted successfully.' });

    } catch (err) {
        next(err);
    }
});

export default router;
