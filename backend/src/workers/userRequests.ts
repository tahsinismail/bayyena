// backend/src/workers/userRequests.ts
import { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { redis } from '../config/queue';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Job data interface
export interface UserRequestJobData {
  requestId: string;
  userId: number;
  caseId: number;
  requestType: 'case_analysis' | 'document_summary' | 'legal_advice' | 'timeline_generation';
  requestData: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Job result interface
export interface UserRequestJobResult {
  success: boolean;
  requestId: string;
  result?: any;
  error?: string;
}

// Initialize Google AI
if (!process.env.GEMINI_API_KEY) {
  throw new Error("FATAL: GEMINI_API_KEY is not defined in the .env file.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({ 
  model: process.env.GEMINI_MODEL || 'gemini-pro', 
  safetySettings 
});

// Worker creation function
export const createUserRequestsWorker = (redisConnection: any) => {
  if (!redisConnection) return null;
  
  return new Worker(
    'user-requests',
    async (job: Job<UserRequestJobData>): Promise<UserRequestJobResult> => {
      const { requestId, userId, caseId, requestType, requestData, priority } = job.data;
      
      console.log(`[UserRequestWorker] Processing request ${requestId} of type ${requestType} for case ${caseId}`);
      
      try {
        let result: any;
        
        switch (requestType) {
          case 'case_analysis':
            result = await processCaseAnalysis(requestData);
            break;
            
          case 'document_summary':
            result = await processDocumentSummary(requestData);
            break;
            
          case 'legal_advice':
            result = await processLegalAdvice(requestData);
            break;
            
          case 'timeline_generation':
            result = await processTimelineGeneration(requestData);
            break;
            
          default:
            throw new Error(`Unknown request type: ${requestType}`);
        }
        
        console.log(`[UserRequestWorker] Successfully processed request ${requestId}`);
        
        return {
          success: true,
          requestId,
          result,
        };
        
      } catch (error) {
        console.error(`[UserRequestWorker] Error processing request ${requestId}:`, error);
        
        return {
          success: false,
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 user requests simultaneously
    }
  );
};

// Worker instance - will be set when Redis is available
export let userRequestsWorker: Worker | null = null;

// Process case analysis request
async function processCaseAnalysis(requestData: any) {
  const prompt = `Analyze the following legal case and provide insights:
  
Case Details:
${JSON.stringify(requestData, null, 2)}

Please provide:
1. Key legal issues
2. Potential arguments
3. Relevant precedents
4. Risk assessment
5. Recommendations

Format the response as structured JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Process document summary request
async function processDocumentSummary(requestData: any) {
  const prompt = `Summarize the following legal document:
  
Document Content:
${requestData.content}

Please provide:
1. Executive summary
2. Key points
3. Legal implications
4. Action items

Format the response as structured JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Process legal advice request
async function processLegalAdvice(requestData: any) {
  const prompt = `Provide legal advice for the following situation:
  
Situation:
${requestData.situation}

Context:
${requestData.context}

Please provide:
1. Legal analysis
2. Potential courses of action
3. Risks and considerations
4. Recommended next steps

Format the response as structured JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Process timeline generation request
async function processTimelineGeneration(requestData: any) {
  const prompt = `Generate a legal timeline for the following case:
  
Case Information:
${JSON.stringify(requestData, null, 2)}

Please create a chronological timeline with:
1. Key dates and events
2. Legal deadlines
3. Important milestones
4. Required actions

Format the response as a structured timeline JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Worker event handlers - will be set when worker is created
export const setupUserRequestsWorkerEvents = (worker: Worker) => {
  worker.on('completed', (job: Job, result: UserRequestJobResult) => {
    console.log(`[UserRequestWorker] Job ${job.id} completed successfully for request ${result.requestId}`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    if (job) {
      console.error(`[UserRequestWorker] Job ${job.id} failed:`, error.message);
    } else {
      console.error(`[UserRequestWorker] Job failed:`, error.message);
    }
  });

  worker.on('error', (error: Error) => {
    console.error(`[UserRequestWorker] Worker error:`, error);
  });
};

// Graceful shutdown
export const closeUserRequestsWorker = async () => {
  if (userRequestsWorker) {
    console.log('[UserRequestWorker] Closing user requests worker...');
    await userRequestsWorker.close();
    console.log('[UserRequestWorker] User requests worker closed');
  } else {
    console.log('[UserRequestWorker] No worker to close');
  }
};

// Initialize worker function
export const initializeUserRequestsWorker = async (redisConnection: any) => {
  if (!redisConnection) {
    console.log('[UserRequestWorker] Redis not available, worker not initialized');
    return;
  }
  
  try {
    userRequestsWorker = createUserRequestsWorker(redisConnection);
    if (userRequestsWorker) {
      setupUserRequestsWorkerEvents(userRequestsWorker);
      console.log('[UserRequestWorker] User requests worker initialized successfully');
    }
  } catch (error) {
    console.error('[UserRequestWorker] Failed to initialize worker:', error);
  }
};
