// backend/src/services/queueService.ts
import { 
  documentProcessingQueue, 
  userRequestsQueue, 
  aiAnalysisQueue,
  QUEUE_NAMES 
} from '../config/queue';
import { DocumentProcessingJobData } from '../workers/documentProcessor';
import { UserRequestJobData } from '../workers/userRequests';
import { AIAnalysisJobData } from '../workers/aiAnalysis';

export class QueueService {
  /**
   * Submit a document processing job
   */
  static async submitDocumentProcessingJob(data: DocumentProcessingJobData) {
    try {
      // Try to initialize the queue system if it's not available
      if (!documentProcessingQueue) {
        try {
          const { initializeQueueSystem } = await import('../config/queue');
          const initialized = await initializeQueueSystem();
          if (!initialized) {
            throw new Error('Document processing queue is not available (Redis not running)');
          }
        } catch (error) {
          throw new Error('Document processing queue is not available (Redis not running)');
        }
      }
      
      if (!documentProcessingQueue) {
        throw new Error('Document processing queue is not available');
      }
      
      const job = await documentProcessingQueue.add(
        'process-document',
        data,
        {
          priority: this.getPriorityFromFileSize(data.mimeType),
          delay: 0, // Process immediately
          jobId: `doc-${data.documentId}-${Date.now()}`,
        }
      );
      
      console.log(`[QueueService] Document processing job submitted: ${job.id}`);
      return { success: true, jobId: job.id };
      
    } catch (error) {
      console.error('[QueueService] Error submitting document processing job:', error);
      throw new Error('Failed to submit document processing job');
    }
  }

  /**
   * Submit a user request job
   */
  static async submitUserRequestJob(data: UserRequestJobData) {
    try {
      if (!userRequestsQueue) {
        throw new Error('User requests queue is not available');
      }
      
      const job = await userRequestsQueue.add(
        'process-user-request',
        data,
        {
          priority: this.getPriorityFromRequestPriority(data.priority),
          delay: 0, // Process immediately
          jobId: `req-${data.requestId}-${Date.now()}`,
        }
      );
      
      console.log(`[QueueService] User request job submitted: ${job.id}`);
      return { success: true, jobId: job.id };
      
    } catch (error) {
      console.error('[QueueService] Error submitting user request job:', error);
      throw new Error('Failed to submit user request job');
    }
  }

  /**
   * Submit an AI analysis job
   */
  static async submitAIAnalysisJob(data: AIAnalysisJobData) {
    try {
      if (!aiAnalysisQueue) {
        throw new Error('AI analysis queue is not available');
      }
      
      const job = await aiAnalysisQueue.add(
        'perform-ai-analysis',
        data,
        {
          priority: 1, // High priority for AI analysis
          delay: 0, // Process immediately
          jobId: `ai-${data.analysisId}-${Date.now()}`,
        }
      );
      
      console.log(`[QueueService] AI analysis job submitted: ${job.id}`);
      return { success: true, jobId: job.id };
      
    } catch (error) {
      console.error('[QueueService] Error submitting AI analysis job:', error);
      throw new Error('Failed to submit AI analysis job');
    }
  }

  /**
   * Get job status by ID
   */
  static async getJobStatus(queueName: string, jobId: string) {
    try {
      let queue;
      
      switch (queueName) {
        case QUEUE_NAMES.DOCUMENT_PROCESSING:
          queue = documentProcessingQueue;
          break;
        case QUEUE_NAMES.USER_REQUESTS:
          queue = userRequestsQueue;
          break;
        case QUEUE_NAMES.AI_ANALYSIS:
          queue = aiAnalysisQueue;
          break;
        default:
          throw new Error('Invalid queue name');
      }
      
      if (!queue) {
        throw new Error('Queue is not available');
      }
      
      const job = await queue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }
      
      const state = await job.getState();
      const progress = await job.progress;
      const result = await job.returnvalue;
      const failedReason = await job.failedReason;
      
      return {
        id: job.id,
        status: state,
        progress,
        result,
        failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      };
      
    } catch (error) {
      console.error('[QueueService] Error getting job status:', error);
      throw new Error('Failed to get job status');
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    try {
      if (!documentProcessingQueue || !userRequestsQueue || !aiAnalysisQueue) {
        throw new Error('Queues are not available');
      }
      
      const [docStats, userStats, aiStats] = await Promise.all([
        documentProcessingQueue.getJobCounts(),
        userRequestsQueue.getJobCounts(),
        aiAnalysisQueue.getJobCounts(),
      ]);
      
      return {
        documentProcessing: docStats,
        userRequests: userStats,
        aiAnalysis: aiStats,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('[QueueService] Error getting queue stats:', error);
      throw new Error('Failed to get queue statistics');
    }
  }

  /**
   * Retry a failed job
   */
  static async retryJob(queueName: string, jobId: string) {
    try {
      let queue;
      
      switch (queueName) {
        case QUEUE_NAMES.DOCUMENT_PROCESSING:
          queue = documentProcessingQueue;
          break;
        case QUEUE_NAMES.USER_REQUESTS:
          queue = userRequestsQueue;
          break;
        case QUEUE_NAMES.AI_ANALYSIS:
          queue = aiAnalysisQueue;
          break;
        default:
          throw new Error('Invalid queue name');
      }
      
      if (!queue) {
        throw new Error('Queue is not available');
      }
      
      const job = await queue.getJob(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      await job.retry();
      
      console.log(`[QueueService] Job ${jobId} retried successfully`);
      return { success: true, message: 'Job retried successfully' };
      
    } catch (error) {
      console.error('[QueueService] Error retrying job:', error);
      throw new Error('Failed to retry job');
    }
  }

  /**
   * Remove a job from the queue
   */
  static async removeJob(queueName: string, jobId: string) {
    try {
      let queue;
      
      switch (queueName) {
        case QUEUE_NAMES.DOCUMENT_PROCESSING:
          queue = documentProcessingQueue;
          break;
        case QUEUE_NAMES.USER_REQUESTS:
          queue = userRequestsQueue;
          break;
        case QUEUE_NAMES.AI_ANALYSIS:
          queue = aiAnalysisQueue;
          break;
        default:
          throw new Error('Invalid queue name');
      }
      
      if (!queue) {
        throw new Error('Queue is not available');
      }
      
      const job = await queue.getJob(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      await job.remove();
      
      console.log(`[QueueService] Job ${jobId} removed successfully`);
      return { success: true, message: 'Job removed successfully' };
      
    } catch (error) {
      console.error('[QueueService] Error removing job:', error);
      throw new Error('Failed to remove job');
    }
  }

  /**
   * Get priority based on file size and type
   */
  private static getPriorityFromFileSize(mimeType: string): number {
    // Higher priority for smaller files (faster processing)
    if (mimeType.startsWith('text/')) return 1;
    if (mimeType === 'application/pdf') return 2;
    if (mimeType.startsWith('image/')) return 3;
    if (mimeType.startsWith('video/')) return 4;
    return 5; // Default priority
  }

  /**
   * Get priority based on request priority
   */
  private static getPriorityFromRequestPriority(priority: string): number {
    switch (priority) {
      case 'urgent': return 1;
      case 'high': return 2;
      case 'medium': return 3;
      case 'low': return 4;
      default: return 3;
    }
  }
}
