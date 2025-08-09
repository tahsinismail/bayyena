// backend/src/routes/documents.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';
import { processDocument } from '../services/documentProcessor';


const router = Router();

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    // Create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename to avoid overwriting files
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Apply auth middleware to all document routes
router.use(isAuthenticated);

// POST /api/cases/:caseId/documents - Upload a new document for a case
router.post('/:caseId/documents', upload.single('document'), async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const newDocRecord = await db.insert(documents).values({
      caseId,
      fileName: file.originalname,
      storagePath: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
    }).returning();

    // Here is where we will add text extraction (OCR, etc.) in the next step
    const newDocument = newDocRecord[0];

    // Trigger processing in the background (fire and forget)
    processDocument(newDocument.id, newDocument.storagePath, newDocument.fileType);
    res.status(201).json(newDocument);
  } catch (err) {
    // If there's a DB error, delete the orphaned file from storage
    fs.unlinkSync(file.path);
    next(err);
  }
});

// GET /api/cases/:caseId/documents - Get all documents for a case
router.get('/:caseId/documents', async (req, res, next) => {
    const caseId = parseInt(req.params.caseId);
    try {
        const caseDocuments = await db.select().from(documents).where(eq(documents.caseId, caseId));
        res.status(200).json(caseDocuments);
    } catch (err) {
        next(err);
    }
});

// DELETE /api/cases/:caseId/documents/:docId - Delete a single document
router.delete('/:caseId/documents/:docId', isAuthenticated, async (req, res, next) => {
    const caseId = parseInt(req.params.caseId);
    const docId = parseInt(req.params.docId);

    if (isNaN(caseId) || isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid case or document ID.' });
    }

    try {
        // Step 1: Find the document to ensure it exists and belongs to the specified case.
        // This also prevents users from deleting documents from other cases.
        const docResult = await db.select().from(documents).where(
            and(eq(documents.id, docId), eq(documents.caseId, caseId))
        );
        const docToDelete = docResult[0];

        if (!docToDelete) {
            return res.status(404).json({ message: 'Document not found in this case.' });
        }

        // Step 2: Delete the physical file from storage
        const filePath = path.resolve(docToDelete.storagePath);
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    // Log the error but continue, as the DB record deletion is more critical
                    console.error(`Failed to delete file from storage: ${filePath}`, err);
                }
            });
        }

        // Step 3: Delete the document record from the database
        await db.delete(documents).where(eq(documents.id, docId));

        res.status(200).json({ message: 'Document deleted successfully.' });

    } catch (err) {
        next(err);
    }
});

export default router;
