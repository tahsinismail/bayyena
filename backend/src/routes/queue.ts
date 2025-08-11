// backend/src/routes/queue.ts
import { Router } from 'express';
import { isAuthenticated } from '../middleware/authMiddleware';
import { QueueService } from '../services/queueService';
import { checkQueueHealth } from '../config/queue';

const router = Router();

// Apply auth middleware to all queue routes
router.use(isAuthenticated);

// GET /api/queue/health - Check queue health
router.get('/health', async (req, res) => {
  try {
    const health = await checkQueueHealth();
    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to check queue health',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/queue/stats - Get queue statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await QueueService.getQueueStats();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to get queue statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/queue/job/:queueName/:jobId - Get job status
router.get('/job/:queueName/:jobId', async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const status = await QueueService.getJobStatus(queueName, jobId);
    
    if (status.status === 'not_found') {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to get job status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/queue/job/:queueName/:jobId/retry - Retry a failed job
router.post('/job/:queueName/:jobId/retry', async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const result = await QueueService.retryJob(queueName, jobId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to retry job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/queue/job/:queueName/:jobId - Remove a job
router.delete('/job/:queueName/:jobId', async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    const result = await QueueService.removeJob(queueName, jobId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to remove job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/queue/user-request - Submit a user request job
router.post('/user-request', async (req, res) => {
  try {
    const { userId, caseId, requestType, requestData, priority } = req.body;
    
    if (!userId || !caseId || !requestType || !requestData || !priority) {
      return res.status(400).json({ 
        message: 'Missing required fields: userId, caseId, requestType, requestData, priority' 
      });
    }
    
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await QueueService.submitUserRequestJob({
      requestId,
      userId,
      caseId,
      requestType,
      requestData,
      priority,
    });
    
    res.status(201).json({
      message: 'User request job submitted successfully',
      requestId,
      jobId: result.jobId,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to submit user request job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/queue/ai-analysis - Submit an AI analysis job
router.post('/ai-analysis', async (req, res) => {
  try {
    const { documentId, caseId, analysisType, content, context } = req.body;
    
    if (!documentId || !caseId || !analysisType || !content) {
      return res.status(400).json({ 
        message: 'Missing required fields: documentId, caseId, analysisType, content' 
      });
    }
    
    const analysisId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await QueueService.submitAIAnalysisJob({
      analysisId,
      documentId,
      caseId,
      analysisType,
      content,
      context,
    });
    
    res.status(201).json({
      message: 'AI analysis job submitted successfully',
      analysisId,
      jobId: result.jobId,
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to submit AI analysis job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
