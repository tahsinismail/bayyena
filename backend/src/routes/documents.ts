// backend/src/routes/documents.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';
import { QueueService } from '../services/queueService';
import { OCRProcessor } from '../services/ocrProcessor';
import { GeminiProcessor } from '../services/geminiProcessor';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const titleModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL! });

// GET /supported-types - Get information about supported file types (no auth required)
router.get('/supported-types', async (req, res) => {
  try {
    const ocrTypes = OCRProcessor.getSupportedTypes();
    const geminiTypes = GeminiProcessor.getSupportedMimeTypes();
    const allTypes = [...new Set([...ocrTypes, ...geminiTypes])];
    
    // Categorize file types for better UX
    const categorized = {
      documents: allTypes.filter(type => 
        type.includes('pdf') || 
        type.includes('word') || 
        type.includes('document') || 
        type.includes('spreadsheet') || 
        type.includes('presentation') || 
        type.includes('text') || 
        type.includes('rtf') || 
        type.includes('csv') || 
        type.includes('json') || 
        type.includes('html') || 
        type.includes('xml')
      ),
      images: allTypes.filter(type => type.startsWith('image/')),
      videos: allTypes.filter(type => type.startsWith('video/')),
      audio: allTypes.filter(type => type.startsWith('audio/'))
    };
    
    res.json({
      total: allTypes.length,
      categories: categorized,
      processing: {
        ocr: {
          count: ocrTypes.length,
          description: 'Traditional OCR and text extraction'
        },
        gemini: {
          count: geminiTypes.length,
          description: 'AI-powered multimodal analysis including audio transcription and advanced OCR'
        }
      },
        limits: {
          maxFileSize: '512MB',
          maxFileSizeBytes: 512 * 1024 * 1024
        }
    });
  } catch (error) {
    console.error('[Routes] Error getting supported types:', error);
    res.status(500).json({ message: 'Failed to get supported file types' });
  }
});

// Apply auth middleware to all other document routes
router.use(isAuthenticated);
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
  console.log(`[Upload] File filter check: ${file.originalname} (${file.mimetype})`);
  
  // Get all supported types from both OCR processor and Gemini processor
  const ocrSupportedTypes = OCRProcessor.getSupportedTypes();
  const geminiSupportedTypes = GeminiProcessor.getSupportedMimeTypes();
  
  // Combine both sets of supported types
  const allSupportedTypes = [...new Set([...ocrSupportedTypes, ...geminiSupportedTypes])];
  
  // Log for debugging
  console.log(`[Upload] Checking MIME type: ${file.mimetype} against ${allSupportedTypes.length} supported types`);
  console.log(`[Upload] Audio types supported:`, allSupportedTypes.filter(t => t.startsWith('audio/')));

  // Check if file type is supported
  if (allSupportedTypes.includes(file.mimetype)) {
    console.log(`[Upload] ✅ File accepted: ${file.mimetype}`);
    cb(null, true);
  } else {
    // For audio files, try to be more permissive with common variations
    const fileExt = path.extname(file.originalname).toLowerCase();
    const isAudioExtension = ['.mp3', '.wav', '.aiff', '.aac', '.ogg', '.flac', '.m4a', '.wma'].includes(fileExt);
    
    if (isAudioExtension && file.mimetype.startsWith('audio/')) {
      console.log(`[Upload] ✅ Audio file accepted by extension: ${fileExt} (${file.mimetype})`);
      cb(null, true);
    } else {
      console.log(`[Upload] ❌ File rejected: ${file.mimetype} with extension ${fileExt}`);
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types include: PDF, Word documents, images, videos, audio files, text files, and more. Total supported: ${allSupportedTypes.length} file types.`));
    }
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 512 * 1024 * 1024, // 512MB limit to accommodate larger audio/video files
  }
});

// Apply auth middleware to all document routes
router.use(isAuthenticated);

// GET /supported-types - Get information about supported file types
router.get('/supported-types', async (req, res) => {
  try {
    const ocrTypes = OCRProcessor.getSupportedTypes();
    const geminiTypes = GeminiProcessor.getSupportedMimeTypes();
    const allTypes = [...new Set([...ocrTypes, ...geminiTypes])];
    
    // Categorize file types for better UX
    const categorized = {
      documents: allTypes.filter(type => 
        type.includes('pdf') || 
        type.includes('word') || 
        type.includes('document') || 
        type.includes('spreadsheet') || 
        type.includes('presentation') || 
        type.includes('text') || 
        type.includes('rtf') || 
        type.includes('csv') || 
        type.includes('json') || 
        type.includes('html') || 
        type.includes('xml')
      ),
      images: allTypes.filter(type => type.startsWith('image/')),
      videos: allTypes.filter(type => type.startsWith('video/')),
      audio: allTypes.filter(type => type.startsWith('audio/'))
    };
    
    res.json({
      total: allTypes.length,
      categories: categorized,
      processing: {
        ocr: {
          count: ocrTypes.length,
          description: 'Traditional OCR and text extraction'
        },
        gemini: {
          count: geminiTypes.length,
          description: 'AI-powered multimodal analysis including audio transcription and advanced OCR'
        }
      },
      limits: {
        maxFileSize: '512MB',
        maxFileSizeBytes: 512 * 1024 * 1024
      }
    });
  } catch (error) {
    console.error('[Routes] Error getting supported types:', error);
    res.status(500).json({ message: 'Failed to get supported file types' });
  }
});

// POST /:caseId/documents - Upload a new document for a case
router.post('/:caseId/documents', upload.single('document'), async (req, res, next) => {
  const caseId = parseInt(req.params.caseId);
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    // Validate file size
    if (file.size > 512 * 1024 * 1024) { // 512MB
  fs.unlinkSync(file.path);
  return res.status(400).json({ message: 'File size exceeds 512MB limit.' });
    }

    console.log(`[Upload] Processing ${file.mimetype} file: ${file.originalname} (${file.size} bytes)`);
    
    // Check if file type is supported by our processing pipeline
    const isOcrSupported = OCRProcessor.isSupported(file.mimetype);
    const isGeminiSupported = GeminiProcessor.isSupported(file.mimetype);
    
    if (!isOcrSupported && !isGeminiSupported) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ 
        message: `File type ${file.mimetype} is not supported by our processing pipeline.`,
        supportedTypes: {
          ocr: OCRProcessor.getSupportedTypes(),
          gemini: GeminiProcessor.getSupportedMimeTypes()
        }
      });
    }

    console.log(`[Upload] File type ${file.mimetype} supported - OCR: ${isOcrSupported}, Gemini: ${isGeminiSupported}`);

    // Check if the case exists (you might want to add this validation)
    // const caseExists = await db.select().from(cases).where(eq(cases.id, caseId));
    // if (caseExists.length === 0) {
    //   fs.unlinkSync(file.path);
    //   return res.status(404).json({ message: 'Case not found.' });
    // }

    // Determine if the file is processable using our enhanced processing pipeline
    const isProcessable = OCRProcessor.isSupported(file.mimetype) || GeminiProcessor.isSupported(file.mimetype);
    
    console.log(`[Upload] File ${file.originalname} is ${isProcessable ? 'processable' : 'not processable'} for text extraction`);

    // Insert document record into database
    const processingMessage = isProcessable ? null : 'File type not supported for text extraction by current processing pipeline';
    
    const [newDocument] = await db.insert(documents).values({
      caseId: caseId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      storagePath: file.path,
      processingStatus: isProcessable ? 'PENDING' : 'PROCESSED',
      extractedText: processingMessage
    }).returning();

    // If the file is processable, submit to processing queue
    if (isProcessable) {
      try {
        // Submit document processing job to queue
        const queueResult = await QueueService.submitDocumentProcessingJob({
          documentId: newDocument.id,
          filePath: file.path,
          mimeType: file.mimetype,
          userId: (req.user as any).id,
          caseId: caseId,
        });
        
        console.log(`[DOCUMENT_UPLOAD] Document processing job submitted: ${queueResult.jobId}`);
        
        // Update document with job ID for tracking
        await db.update(documents).set({ 
          processingStatus: 'PENDING'
        }).where(eq(documents.id, newDocument.id));
        
      } catch (queueError) {
        console.error(`[DOCUMENT_UPLOAD] Error submitting document to queue:`, queueError);
        
        // Update document status to failed if queue submission fails
        await db.update(documents).set({ 
          processingStatus: 'FAILED',
          extractedText: `QUEUE_SUBMISSION_ERROR: ${queueError instanceof Error ? queueError.message : 'Unknown queue error'}`
        }).where(eq(documents.id, newDocument.id));
      }
    }

    // Get the final document status after all updates
    const finalDocument = await db.select().from(documents).where(eq(documents.id, newDocument.id)).limit(1);
    
    res.status(201).json({
      message: 'Document uploaded successfully.',
      document: {
        id: newDocument.id,
        fileName: newDocument.fileName,
        fileType: newDocument.fileType,
        fileSize: newDocument.fileSize,
        processingStatus: finalDocument[0]?.processingStatus || newDocument.processingStatus,
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
// Use middleware to ensure this route only matches exact paths without additional segments
router.get('/:caseId/documents/:docId', (req, res, next) => {
    // Check if the path continues beyond the docId (like /timeline)
    const expectedPath = `/api/cases/${req.params.caseId}/documents/${req.params.docId}`;
    if (req.path !== expectedPath.replace('/api/cases', '')) {
        return next(); // Pass to next route (likely timeline routes)
    }
    next();
}, async (req, res, next) => {
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
// Use middleware to ensure this route only matches exact paths without additional segments
router.delete('/:caseId/documents/:docId', (req, res, next) => {
    // Check if the path continues beyond the docId (like /timeline)
    const expectedPath = `/api/cases/${req.params.caseId}/documents/${req.params.docId}`;
    if (req.path !== expectedPath.replace('/api/cases', '')) {
        return next(); // Pass to next route (likely timeline routes)
    }
    next();
}, async (req, res, next) => {
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

// GET /:caseId/documents/:docId/display-name?lang=xx - Localized display name for a document
router.get('/:caseId/documents/:docId/display-name', async (req, res, next) => {
  try {
    const caseId = parseInt(req.params.caseId);
    const docId = parseInt(req.params.docId);
    const lang = (req.query.lang as string | undefined)?.trim().toLowerCase() || 'en';

    if (isNaN(caseId) || isNaN(docId)) {
      return res.status(400).json({ message: 'Invalid matter or document ID.' });
    }

    const docResult = await db.select().from(documents).where(
      and(eq(documents.id, docId), eq(documents.caseId, caseId))
    );

    if (docResult.length === 0) {
      return res.status(404).json({ message: 'Document not found in this matter.' });
    }

    const doc = docResult[0];
    const baseName = (doc.fileName || '').replace(/\.[a-zA-Z0-9]+$/, '');

    // Default English
    if (lang === 'en') {
      return res.status(200).json({ displayName: baseName });
    }

    // Translate baseName to target language using model
    let translated = '';
    try {
      const prompt = `Translate the following document title to ${lang}. Keep it concise and professional, 4-8 words, and suitable as a display title. Do not add quotes or extra commentary.\n\nTITLE:\n${baseName}`;
      const resp = await titleModel.generateContent(prompt);
      translated = (resp.response.text() || '').trim();
    } catch (e) {
      console.warn('[DISPLAY_NAME] Title translation failed:', e);
    }

    const sanitize = (s: string) => s
      .replace(/[\u0000-\u001F]/g, '')
      .trim()
      .slice(0, 100);

    const displayName = sanitize(translated) || baseName;
    return res.status(200).json({ displayName });
  } catch (err) {
    next(err);
  }
});

export default router;
