// backend/src/workers/documentProcessor.ts
import { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { redis } from '../config/queue';
import { processDocument } from '../services/documentProcessor';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

// Job data interface
export interface DocumentProcessingJobData {
  documentId: number;
  filePath: string;
  mimeType: string;
  userId: number;
  caseId: number;
}

// Job result interface
export interface DocumentProcessingJobResult {
  success: boolean;
  documentId: number;
  extractedText?: string | null;
  summary?: string | null;
  timeline?: any;
  error?: string;
}

// Worker creation function
export const createDocumentProcessingWorker = (redisConnection: any) => {
  if (!redisConnection) return null;
  
  const concurrency = Number(process.env.DOC_WORKER_CONCURRENCY || '2');
  return new Worker(
    'document-processing',
    async (job: Job<DocumentProcessingJobData>): Promise<DocumentProcessingJobResult> => {
      const { documentId, filePath, mimeType, userId, caseId } = job.data;
      
      console.log(`[DocumentWorker] Processing document ${documentId} for case ${caseId}`);
      
      try {
        // Update document status to processing
        await db
          .update(documents)
          .set({ processingStatus: 'PROCESSING' })
          .where(eq(documents.id, documentId));
        
        // Process the document
        await processDocument(documentId, filePath, mimeType);
        
        // Get the updated document to retrieve the processed content
        const updatedDoc = await db
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1);
        
        if (updatedDoc.length === 0) {
          throw new Error('Document not found after processing');
        }
        
        const doc = updatedDoc[0];
        
        // Update document status to processed
        await db
          .update(documents)
          .set({
            processingStatus: 'PROCESSED',
          })
          .where(eq(documents.id, documentId));
        
        console.log(`[DocumentWorker] Successfully processed document ${documentId}`);
        
        return {
          success: true,
          documentId,
          extractedText: doc.extractedText,
          summary: doc.summary,
          timeline: doc.timeline,
        };
        
      } catch (error) {
        console.error(`[DocumentWorker] Error processing document ${documentId}:`, error);
        
        // Update document status to failed
        await db
          .update(documents)
          .set({ processingStatus: 'FAILED' })
          .where(eq(documents.id, documentId));
        
        // Clean up file if processing failed
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[DocumentWorker] Cleaned up failed document file: ${filePath}`);
          }
        } catch (cleanupError) {
          console.error(`[DocumentWorker] Error cleaning up file:`, cleanupError);
        }
        
        return {
          success: false,
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    {
      connection: redisConnection,
      concurrency,
    }
  );
};

// Worker instance - will be set when Redis is available
export let documentProcessingWorker: Worker | null = null;

// Worker event handlers - will be set when worker is created
export const setupDocumentWorkerEvents = (worker: Worker) => {
  worker.on('completed', (job: Job, result: DocumentProcessingJobResult) => {
    console.log(`[DocumentWorker] Job ${job.id} completed successfully for document ${result.documentId}`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    if (job) {
      console.error(`[DocumentWorker] Job ${job.id} failed:`, error.message);
    } else {
      console.error(`[DocumentWorker] Job failed:`, error.message);
    }
  });

  worker.on('error', (error: Error) => {
    console.error(`[DocumentWorker] Worker error:`, error);
  });
};

// Graceful shutdown
export const closeDocumentWorker = async () => {
  if (documentProcessingWorker) {
    console.log('[DocumentWorker] Closing document processing worker...');
    await documentProcessingWorker.close();
    console.log('[DocumentWorker] Document processing worker closed');
  } else {
    console.log('[DocumentWorker] No worker to close');
  }
};

// Initialize worker function
export const initializeDocumentWorker = async (redisConnection: any) => {
  if (!redisConnection) {
    console.log('[DocumentWorker] Redis not available, worker not initialized');
    return;
  }
  
  try {
    documentProcessingWorker = createDocumentProcessingWorker(redisConnection);
    if (documentProcessingWorker) {
      setupDocumentWorkerEvents(documentProcessingWorker);
      console.log('[DocumentWorker] Document processing worker initialized successfully');
    }
  } catch (error) {
    console.error('[DocumentWorker] Failed to initialize worker:', error);
  }
};
