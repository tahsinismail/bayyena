// backend/src/config/queue.ts
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create Redis connection with error handling
export let redis: Redis | null = null;

// Function to initialize Redis connection
export const initializeRedis = async () => {
  if (redis) return redis; // Already initialized
  
  try {
    redis = new Redis({
      ...redisConfig,
      lazyConnect: true, // Don't connect immediately
      maxRetriesPerRequest: null, // BullMQ requirement
      connectTimeout: 5000, // 5 second timeout
    });
    
    // Test the connection with a timeout
    const connectionPromise = redis.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);
    console.log('[Queue] Redis connection established successfully');
    return redis;
  } catch (error) {
    console.log('[Queue] Redis not available, queue system will not be initialized');
    if (redis) {
      try {
        await redis.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      redis = null;
    }
    return null;
  }
};

// Don't automatically initialize Redis - let the application decide when to do it
// The application will call initializeRedis() when it's ready to use the queue system

// Function to check if Redis is available without connecting
export const isRedisAvailable = () => {
  return redis !== null;
};

// Function to manually initialize the entire queue system
export const initializeQueueSystem = async () => {
  try {
    // Check if Redis is available without trying to connect
    const redisConnection = await initializeRedis();
    if (redisConnection) {
      await initializeQueues();
      return true;
    }
    return false;
  } catch (error) {
    console.log('[Queue] Redis not available, queue system will not be initialized');
    return false;
  }
};

// Queue names
export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
  USER_REQUESTS: 'user-requests',
  AI_ANALYSIS: 'ai-analysis',
} as const;

// Queue configurations
export const QUEUE_CONFIGS = {
  [QUEUE_NAMES.DOCUMENT_PROCESSING]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
  [QUEUE_NAMES.USER_REQUESTS]: {
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 200,
      removeOnFail: 100,
    },
  },
  [QUEUE_NAMES.AI_ANALYSIS]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 50,
      removeOnFail: 25,
    },
  },
} as const;

// Queue creation functions
export const createDocumentProcessingQueue = () => {
  if (!redis) return null;
  return new Queue(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    {
      connection: redis,
      ...QUEUE_CONFIGS[QUEUE_NAMES.DOCUMENT_PROCESSING],
    }
  );
};

export const createUserRequestsQueue = () => {
  if (!redis) return null;
  return new Queue(
    QUEUE_NAMES.USER_REQUESTS,
    {
      connection: redis,
      ...QUEUE_CONFIGS[QUEUE_NAMES.USER_REQUESTS],
    }
  );
};

export const createAIAnalysisQueue = () => {
  if (!redis) return null;
  return new Queue(
    QUEUE_NAMES.AI_ANALYSIS,
    {
      connection: redis,
      ...QUEUE_CONFIGS[QUEUE_NAMES.AI_ANALYSIS],
    }
  );
};

// Initialize queues after Redis is ready
export let documentProcessingQueue: Queue | null = null;
export let userRequestsQueue: Queue | null = null;
export let aiAnalysisQueue: Queue | null = null;

// Function to initialize all queues
export const initializeQueues = async () => {
  if (!redis) {
    console.log('[Queue] Redis not available, queues cannot be initialized');
    return;
  }
  
  try {
    documentProcessingQueue = createDocumentProcessingQueue();
    userRequestsQueue = createUserRequestsQueue();
    aiAnalysisQueue = createAIAnalysisQueue();
    
    console.log('[Queue] All queues initialized successfully');
    
    // Initialize workers after queues are ready
    await initializeWorkers();
  } catch (error) {
    console.error('[Queue] Failed to initialize queues:', error);
  }
};

// Function to initialize all workers
export const initializeWorkers = async () => {
  if (!redis) {
    console.log('[Queue] Redis not available, workers cannot be initialized');
    return;
  }
  
  try {
    // Import worker initialization functions
    const { initializeDocumentWorker } = await import('../workers/documentProcessor');
    const { initializeUserRequestsWorker } = await import('../workers/userRequests');
    const { initializeAIAnalysisWorker } = await import('../workers/aiAnalysis');
    
    // Initialize workers
    await initializeDocumentWorker(redis);
    await initializeUserRequestsWorker(redis);
    await initializeAIAnalysisWorker(redis);
    
    console.log('[Queue] All workers initialized successfully');
  } catch (error) {
    console.error('[Queue] Failed to initialize workers:', error);
  }
};

// Queue scheduler removed - not needed for basic implementation

// Graceful shutdown function
export const closeQueues = async () => {
  console.log('[Queue] Closing all queues and workers...');
  
  const closePromises = [];
  
  // Close workers first
  try {
    const { closeDocumentWorker } = await import('../workers/documentProcessor');
    const { closeUserRequestsWorker } = await import('../workers/userRequests');
    const { closeAIAnalysisWorker } = await import('../workers/aiAnalysis');
    
    closePromises.push(closeDocumentWorker());
    closePromises.push(closeUserRequestsWorker());
    closePromises.push(closeAIAnalysisWorker());
  } catch (error) {
    console.log('[Queue] Some workers already closed or not available');
  }
  
  // Close queues
  if (documentProcessingQueue) {
    closePromises.push(documentProcessingQueue.close());
  }
  if (userRequestsQueue) {
    closePromises.push(userRequestsQueue.close());
  }
  if (aiAnalysisQueue) {
    closePromises.push(aiAnalysisQueue.close());
  }
  
  // Close Redis connection
  if (redis) {
    closePromises.push(redis.disconnect());
  }
  
  if (closePromises.length > 0) {
    await Promise.all(closePromises);
  }
  
  console.log('[Queue] All queues and workers closed successfully');
};

// Queue health check
export const checkQueueHealth = async () => {
  try {
    if (!redis) {
      return {
        status: 'unhealthy',
        error: 'Redis connection not available',
        timestamp: new Date().toISOString(),
      };
    }
    
    const queues = [documentProcessingQueue, userRequestsQueue, aiAnalysisQueue].filter(Boolean);
    
    if (queues.length === 0) {
      return {
        status: 'unhealthy',
        error: 'No queues available',
        timestamp: new Date().toISOString(),
      };
    }
    
    const healthStatus = await Promise.all(
      queues.map(async (queue) => {
        if (!queue) return null;
        
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        return {
          name: queue.name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        };
      })
    );
    
    const validStatus = healthStatus.filter(Boolean);
    
    return {
      status: 'healthy',
      queues: validStatus,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};
