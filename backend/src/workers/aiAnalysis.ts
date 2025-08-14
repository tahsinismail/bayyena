// backend/src/workers/aiAnalysis.ts
import { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { redis } from '../config/queue';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Job data interface
export interface AIAnalysisJobData {
  analysisId: string;
  documentId: number;
  caseId: number;
  analysisType: 'legal_review' | 'risk_assessment' | 'compliance_check' | 'evidence_analysis';
  content: string;
  context?: any;
}

// Job result interface
export interface AIAnalysisJobResult {
  success: boolean;
  analysisId: string;
  documentId: number;
  analysis?: any;
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
export const createAIAnalysisWorker = (redisConnection: any) => {
  if (!redisConnection) return null;
  
  return new Worker(
    'ai-analysis',
    async (job: Job<AIAnalysisJobData>): Promise<AIAnalysisJobResult> => {
      const { analysisId, documentId, caseId, analysisType, content, context } = job.data;
      
      console.log(`[AIAnalysisWorker] Processing analysis ${analysisId} of type ${analysisType} for document ${documentId}`);
      
      try {
        let analysis: any;
        
        switch (analysisType) {
          case 'legal_review':
            analysis = await performLegalReview(content, context);
            break;
            
          case 'risk_assessment':
            analysis = await performRiskAssessment(content, context);
            break;
            
          case 'compliance_check':
            analysis = await performComplianceCheck(content, context);
            break;
            
          case 'evidence_analysis':
            analysis = await performEvidenceAnalysis(content, context);
            break;
            
          default:
            throw new Error(`Unknown analysis type: ${analysisType}`);
        }
        
        console.log(`[AIAnalysisWorker] Successfully completed analysis ${analysisId}`);
        
        return {
          success: true,
          analysisId,
          documentId,
          analysis,
        };
        
      } catch (error) {
        console.error(`[AIAnalysisWorker] Error processing analysis ${analysisId}:`, error);
        
        return {
          success: false,
          analysisId,
          documentId,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    },
    {
      connection: redisConnection,
      concurrency: 3, // Process 3 AI analyses simultaneously
    }
  );
};

// Worker instance - will be set when Redis is available
export let aiAnalysisWorker: Worker | null = null;

// Perform legal review analysis
async function performLegalReview(content: string, context?: any) {
  const prompt = `Perform a comprehensive legal review of the following content:
  
Content:
${content}

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

Please provide:
1. Legal issues identified
2. Regulatory compliance status
3. Potential legal risks
4. Recommendations for compliance
5. Relevant legal precedents

Format the response as structured JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Perform risk assessment analysis
async function performRiskAssessment(content: string, context?: any) {
  const prompt = `Conduct a risk assessment for the following legal content:
  
Content:
${content}

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

Please assess:
1. Legal risk level (Low/Medium/High/Critical)
2. Specific risk factors
3. Potential consequences
4. Risk mitigation strategies
5. Priority actions required

Format the response as structured JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Perform compliance check analysis
async function performComplianceCheck(content: string, context?: any) {
  const prompt = `Perform a compliance check for the following content:
  
Content:
${content}

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

Please check compliance with:
1. Relevant laws and regulations
2. Industry standards
3. Internal policies
4. Compliance gaps identified
5. Required corrective actions

Format the response as structured JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Perform evidence analysis
async function performEvidenceAnalysis(content: string, context?: any) {
  const prompt = `Analyze the evidence presented in the following content:
  
Content:
${content}

${context ? `Context: ${JSON.stringify(context, null, 2)}` : ''}

Please analyze:
1. Evidence strength and reliability
2. Admissibility considerations
3. Potential challenges
4. Supporting documentation needed
5. Evidence presentation recommendations

Format the response as structured JSON.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

// Worker event handlers - will be set when worker is created
export const setupAIAnalysisWorkerEvents = (worker: Worker) => {
  worker.on('completed', (job: Job, result: AIAnalysisJobResult) => {
    console.log(`[AIAnalysisWorker] Job ${job.id} completed successfully for analysis ${result.analysisId}`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    if (job) {
      console.error(`[AIAnalysisWorker] Job ${job.id} failed:`, error.message);
    } else {
      console.error(`[AIAnalysisWorker] Job failed:`, error.message);
    }
  });

  worker.on('error', (error: Error) => {
    console.error(`[AIAnalysisWorker] Worker error:`, error);
  });
};

// Graceful shutdown
export const closeAIAnalysisWorker = async () => {
  if (aiAnalysisWorker) {
    console.log('[AIAnalysisWorker] Closing AI analysis worker...');
    await aiAnalysisWorker.close();
    console.log('[AIAnalysisWorker] AI analysis worker closed');
  } else {
    console.log('[AIAnalysisWorker] No worker to close');
  }
};

// Initialize worker function
export const initializeAIAnalysisWorker = async (redisConnection: any) => {
  if (!redisConnection) {
    console.log('[AIAnalysisWorker] Redis not available, worker not initialized');
    return;
  }
  
  try {
    aiAnalysisWorker = createAIAnalysisWorker(redisConnection);
    if (aiAnalysisWorker) {
      setupAIAnalysisWorkerEvents(aiAnalysisWorker);
      console.log('[AIAnalysisWorker] AI analysis worker initialized successfully');
    }
  } catch (error) {
    console.error('[AIAnalysisWorker] Failed to initialize worker:', error);
  }
};
