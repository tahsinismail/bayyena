// backend/src/index.ts
import express, { Express } from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import path from 'path';

import authRoutes from './routes/auth';
import caseRoutes from './routes/cases';
import documentRoutes from './routes/documents';
import chatRoutes from './routes/chat';
import documentDetailRoutes from './routes/documentDetail';
import queueRoutes from './routes/queue';
import timelineRoutes from './routes/timeline';
import adminRoutes from './routes/admin';
import { cleanupDocumentProcessor } from './services/documentProcessor';
import { OCRProcessor } from './services/ocrProcessor';
import './auth/passport';

import { closeQueues } from './config/queue';

dotenv.config();

const app: Express = express();
const port = parseInt(process.env.PORT || '3001', 10);

const PgStore = connectPgSimple(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(
  session({
    store: new PgStore({ pool: pool, tableName: 'user_sessions' }),
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Simple test endpoint
app.get('/api/test-simple', (req, res) => {
  res.json({ message: 'Simple test working' });
});

// Public endpoints that don't require authentication - MUST be before any auth middleware
app.get('/api/upload/supported-types', async (req, res) => {
  try {
    const { OCRProcessor } = await import('./services/ocrProcessor');
    const { GeminiProcessor } = await import('./services/geminiProcessor');
    
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/cases', timelineRoutes); // Timeline events are nested under cases - register BEFORE documents
app.use('/api/cases', documentRoutes); // Documents are nested under cases
app.use('/api/documents', documentDetailRoutes); // Individual document operations
app.use('/api/chat', chatRoutes);
app.use('/api/queue', queueRoutes); // Queue management and monitoring
app.use('/api/admin', adminRoutes); // Admin panel routes

// GET /api/server/capabilities - Check server capabilities
app.get('/api/server/capabilities', async (req, res) => {
  try {
    const capabilities = {
      videoProcessing: OCRProcessor.isVideoProcessingSupported(),
      supportedVideoFormats: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'],
      videoProcessingNote: OCRProcessor.isVideoProcessingSupported() 
        ? 'Video OCR is available and supported'
        : 'Video OCR is not available - FFmpeg not installed on server',
      installationInstructions: OCRProcessor.getVideoProcessingInstructions()
    };
    
    res.status(200).json(capabilities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to check server capabilities' });
  }
});

app.get('/', (req, res) => {
  res.send('LegalCaseBuilder Backend is running!');
});

const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`[server]: Server is running at http://0.0.0.0:${port}`);
  
  // Queue system will be initialized on-demand when needed
  console.log('[server]: Queue system will be initialized when Redis becomes available');
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[server]: Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Cleanup document processor and OCR resources
    await cleanupDocumentProcessor();
    
    // Close all queue workers and queues
    try {
      await closeQueues();
    } catch (error) {
      console.log('[server] Queues and workers already closed or not available');
    }
    
    // Close all queues and Redis connection
    try {
      await closeQueues();
    } catch (error) {
      console.log('[server] Queues already closed or not available');
    }
    
    // Close database pool
    await pool.end();
    
    // Close server
    server.close(() => {
      console.log('[server]: Server closed. Process exiting.');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('[server]: Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('[server]: Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
