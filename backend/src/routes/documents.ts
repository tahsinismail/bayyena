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
import { OCRProcessor } from '../services/ocrProcessor';

const router = Router();

// Configure Multer for file storage with better file filtering
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

// File filter function to validate supported file types
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const supportedTypes = [
    // Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/csv',
    'text/tab-separated-values',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/rtf',
    'text/html',
    'text/xml',
    'application/json',
    'text/markdown',
    'text/yaml',
    'text/javascript',
    'text/css',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/bmp',
    'image/tiff',
    'image/webp',
    // Videos
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm'
  ];

  if (supportedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types: ${supportedTypes.join(', ')}`));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Apply auth middleware to all document routes
router.use(isAuthenticated);

// POST /:caseId/documents - Upload a new document for a case
router.post('/:caseId/documents', upload.single('document'), async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    // Validate file size
    if (file.size > 100 * 1024 * 1024) { // 100MB
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'File size exceeds 100MB limit.' });
    }

    // Check if the case exists (you might want to add this validation)
    // const caseExists = await db.select().from(cases).where(eq(cases.id, caseId));
    // if (caseExists.length === 0) {
    //   fs.unlinkSync(file.path);
    //   return res.status(404).json({ message: 'Case not found.' });
    // }

    // Determine if the file is processable (images, videos, PDFs, Word docs, text files)
    const isProcessable = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/csv',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/rtf',
      'text/html',
      'text/xml',
      'application/json',
      'text/markdown',
      'text/yaml',
      'text/javascript',
      'text/css'
    ].includes(file.mimetype);

    // Insert document record into database
    const [newDocument] = await db.insert(documents).values({
      caseId: caseId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath: file.path,
      processingStatus: isProcessable ? 'PENDING' : 'PROCESSED',
      extractedText: isProcessable ? null : 'File type not supported for text extraction'
    }).returning();

    // If the file is processable, start background processing
    if (isProcessable) {
      // Start background processing
      processDocument(newDocument.id, file.path, file.mimetype).catch(error => {
        console.error(`[DOCUMENT_PROCESSOR] Error processing document ${newDocument.id}:`, error);
        
        // Update the document with detailed error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
        const detailedError = errorMessage.includes('FFprobe not available') || errorMessage.includes('Cannot find ffprobe')
          ? 'Video processing failed: FFmpeg is not installed on the server. Please contact your administrator to install FFmpeg for video OCR support.'
          : errorMessage;
        
        db.update(documents).set({ 
          processingStatus: 'FAILED',
          extractedText: `PROCESSING_ERROR: ${detailedError}`
        }).where(eq(documents.id, newDocument.id)).catch(dbError => {
          console.error(`[DOCUMENT_PROCESSOR] Failed to update error status for document ${newDocument.id}:`, dbError);
        });
      });
    }

    res.status(201).json({
      message: 'Document uploaded successfully.',
      document: {
        id: newDocument.id,
        fileName: newDocument.fileName,
        fileType: newDocument.fileType,
        fileSize: newDocument.fileSize,
        processingStatus: newDocument.processingStatus,
        createdAt: newDocument.createdAt
      }
    });

  } catch (error) {
    // Clean up uploaded file if database insertion fails
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    console.error('[DOCUMENT_UPLOAD] Error:', error);
    res.status(500).json({ message: 'Failed to upload document.' });
  }
});

// GET /:caseId/documents - Get all documents for a case
router.get('/:caseId/documents', async (req, res, next) => {
    const caseId = parseInt(req.params.caseId);
    try {
        const caseDocuments = await db.select().from(documents).where(eq(documents.caseId, caseId));
        res.status(200).json(caseDocuments);
    } catch (err) {
        next(err);
    }
});

// GET /:caseId/documents/:docId - Get detailed information about a specific document
router.get('/:caseId/documents/:docId', async (req, res, next) => {
    const caseId = parseInt(req.params.caseId);
    const docId = parseInt(req.params.docId);

    if (isNaN(caseId) || isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid case or document ID.' });
    }

    try {
        const docResult = await db.select().from(documents).where(
            and(eq(documents.id, docId), eq(documents.caseId, caseId))
        );
        
        if (docResult.length === 0) {
            return res.status(404).json({ message: 'Document not found in this case.' });
        }

        const document = docResult[0];
        
        // Check if there's a processing error and provide helpful information
        let errorDetails = null;
        if (document.processingStatus === 'FAILED' && document.extractedText?.startsWith('PROCESSING_ERROR:')) {
            const errorMessage = document.extractedText.replace('PROCESSING_ERROR:', '').trim();
            
            if (errorMessage.includes('FFmpeg') || errorMessage.includes('ffprobe')) {
                errorDetails = {
                    type: 'FFMPEG_MISSING',
                    message: errorMessage,
                    solution: 'FFmpeg needs to be installed on the server for video processing. Contact your administrator.',
                    userAction: 'Try uploading an image or document file instead, or contact support for video processing.'
                };
            } else {
                errorDetails = {
                    type: 'PROCESSING_ERROR',
                    message: errorMessage,
                    solution: 'The file could not be processed due to a technical issue.',
                    userAction: 'Try uploading the file again or contact support if the problem persists.'
                };
            }
        }

        res.status(200).json({
            ...document,
            errorDetails
        });
    } catch (err) {
        next(err);
    }
});

// DELETE /:caseId/documents/:docId - Delete a single document
router.delete('/:caseId/documents/:docId', async (req, res, next) => {
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
