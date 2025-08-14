// backend/src/routes/documentDetail.ts
import { Router } from 'express';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/authMiddleware';

const router = Router();

// Apply auth middleware to all document detail routes
router.use(isAuthenticated);

// GET /api/documents/:docId - Get a single document by ID
router.get('/:docId', async (req, res, next) => {
    const docId = parseInt(req.params.docId);
    
    if (isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid document ID.' });
    }

    try {
        const document = await db.select().from(documents).where(eq(documents.id, docId));
        
        if (document.length === 0) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        res.status(200).json(document[0]);
    } catch (err) {
        next(err);
    }
});

// GET /api/documents/supported-types - Get list of supported file types
router.get('/supported-types', (req, res) => {
    const supportedTypes = {
        documents: [
            { mimeType: 'application/pdf', name: 'PDF Document', extension: '.pdf' },
            { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'Word Document', extension: '.docx' },
            { mimeType: 'application/msword', name: 'Word Document (Legacy)', extension: '.doc' },
            { mimeType: 'text/plain', name: 'Text File', extension: '.txt' },
            { mimeType: 'text/csv', name: 'CSV File', extension: '.csv' },
            { mimeType: 'text/tab-separated-values', name: 'TSV File', extension: '.tsv' },
            { mimeType: 'application/vnd.ms-excel', name: 'Excel (Legacy)', extension: '.xls' },
            { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', name: 'Excel Document', extension: '.xlsx' },
            { mimeType: 'application/rtf', name: 'Rich Text', extension: '.rtf' },
            { mimeType: 'text/html', name: 'HTML File', extension: '.html, .htm' },
            { mimeType: 'text/xml', name: 'XML File', extension: '.xml' },
            { mimeType: 'application/json', name: 'JSON File', extension: '.json' },
            { mimeType: 'text/markdown', name: 'Markdown', extension: '.md' },
            { mimeType: 'text/yaml', name: 'YAML File', extension: '.yml, .yaml' },
            { mimeType: 'text/javascript', name: 'JavaScript', extension: '.js' },
            { mimeType: 'text/css', name: 'CSS File', extension: '.css' }
        ],
        images: [
            { mimeType: 'image/jpeg', name: 'JPEG Image', extension: '.jpg, .jpeg' },
            { mimeType: 'image/png', name: 'PNG Image', extension: '.png' },
            { mimeType: 'image/bmp', name: 'BMP Image', extension: '.bmp' },
            { mimeType: 'image/tiff', name: 'TIFF Image', extension: '.tiff, .tif' },
            { mimeType: 'image/webp', name: 'WebP Image', extension: '.webp' }
        ],
        videos: [
            { mimeType: 'video/mp4', name: 'MP4 Video', extension: '.mp4' },
            { mimeType: 'video/avi', name: 'AVI Video', extension: '.avi' },
            { mimeType: 'video/mov', name: 'MOV Video', extension: '.mov' },
            { mimeType: 'video/wmv', name: 'WMV Video', extension: '.wmv' },
            { mimeType: 'video/flv', name: 'FLV Video', extension: '.flv' },
            { mimeType: 'video/webm', name: 'WebM Video', extension: '.webm' }
        ]
    };
    
    res.status(200).json(supportedTypes);
});

export default router;
