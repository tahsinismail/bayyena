import fs from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ocrProcessor, OCRProcessor } from './ocrProcessor';
import { visualAnalyzer, VisualAnalysisResult } from './visualAnalyzer';

// --- CHANGE: Added Definitive API Key Check ---
// REASON: This is a critical guard clause. If the API key is missing from the .env file,
// the server will crash immediately on startup with a clear error message, preventing silent failures.
if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL: GEMINI_API_KEY is not defined in the .env file. The document processor cannot start.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- CHANGE: Added Safety Settings for the AI Model ---
// REASON: Legal documents can sometimes contain content that AI safety filters might block.
// Setting the threshold to BLOCK_NONE for all categories makes the AI more permissive and less
// likely to fail a request due to its content.
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL!, safetySettings });

// --- CHANGE: Made the JSON Parsing Function more Robust ---
// REASON: The AI often wraps JSON in markdown backticks or adds extra text. This function is
// now more robust at cleaning the string to reliably extract only the JSON part.
const getJSONFromString = (str: string): any[] => {
    const startIndex = str.indexOf('[');
    const endIndex = str.lastIndexOf(']');
    if (startIndex === -1 || endIndex === -1) {
        console.error("[Processor] AI did not return a valid JSON array string for the timeline.");
        return [];
    }
    const jsonString = str.substring(startIndex, endIndex + 1);
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("[Processor] Failed to parse timeline JSON:", e, "Raw string was:", jsonString);
        return [];
    }
}

/**
 * Extract text from different file types using appropriate methods
 */
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
    console.log(`[Processor] Extracting text from ${mimeType} file: ${filePath}`);
    
    try {
        let extractedText = '';
        
        if (mimeType === 'application/pdf') {
            // Use pdf-parse for PDFs
            try {
                extractedText = (await pdf(fs.readFileSync(filePath))).text;
                console.log(`[Processor] PDF text extracted, length: ${extractedText.length}`);
            } catch (pdfError) {
                const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown PDF parsing error';
                throw new Error(`PDF parsing failed: ${errorMessage}`);
            }
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // Use mammoth for Word documents
            try {
                extractedText = (await mammoth.extractRawText({ path: filePath })).value;
                console.log(`[Processor] Word document text extracted, length: ${extractedText.length}`);
            } catch (mammothError) {
                const errorMessage = mammothError instanceof Error ? mammothError.message : 'Unknown Word parsing error';
                throw new Error(`Word document parsing failed: ${errorMessage}`);
            }
        } else if (OCRProcessor.isSupported(mimeType)) {
            console.log(`[Processor] Using OCR processor for ${mimeType}`);
            
            // Check if we can actually process this file type
            if (!OCRProcessor.canProcess(mimeType)) {
                if (mimeType.startsWith('video/')) {
                    const instructions = OCRProcessor.getVideoProcessingInstructions();
                    throw new Error(`Video processing not available. ${instructions}`);
                } else {
                    throw new Error(`OCR processing not available for ${mimeType}`);
                }
            }
            
            try {
                // For images and videos, check if they contain extractable text first
                if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
                    console.log(`[Processor] Checking if ${mimeType} contains extractable text before OCR...`);
                    
                    try {
                        const hasText = await visualAnalyzer.hasExtractableText(filePath, mimeType);
                        
                        if (!hasText) {
                            // No extractable text, go directly to visual analysis
                            console.log(`[Processor] No extractable text detected, proceeding directly to visual analysis`);
                            
                            const visualResult = await visualAnalyzer.analyzeContent(filePath, mimeType, { text: '', confidence: 0, processingTime: 0 });
                            extractedText = visualResult.content;
                            
                            console.log(`[Processor] VISUAL analysis completed: ${visualResult.description}`);
                            console.log(`[Processor] Final content length: ${extractedText.length}, confidence: ${visualResult.confidence.toFixed(1)}%`);
                            
                        } else {
                            // Text is present, proceed with OCR
                            console.log(`[Processor] Extractable text detected, proceeding with OCR`);
                            
                            const ocrResult = await ocrProcessor.processFile(filePath, mimeType);
                            const visualResult = await visualAnalyzer.analyzeContent(filePath, mimeType, ocrResult);
                            extractedText = visualResult.content;
                            
                            console.log(`[Processor] ${visualResult.analysisType.toUpperCase()} analysis completed: ${visualResult.description}`);
                            console.log(`[Processor] Final content length: ${extractedText.length}, confidence: ${visualResult.confidence.toFixed(1)}%`);
                        }
                        
                    } catch (visualError) {
                        console.warn(`[Processor] Visual analysis failed, falling back to OCR:`, visualError);
                        
                        // Fallback to OCR
                        const ocrResult = await ocrProcessor.processFile(filePath, mimeType);
                        extractedText = ocrResult.text;
                        console.log(`[Processor] OCR fallback completed, text length: ${extractedText.length}`);
                    }
                    
                } else {
                    // For text documents, use OCR directly
                    const ocrResult = await ocrProcessor.processFile(filePath, mimeType);
                    extractedText = ocrResult.text;
                    
                    if (mimeType.startsWith('text/') || mimeType.includes('application/')) {
                        console.log(`[Processor] Text document processed, length: ${extractedText.length}`);
                    } else {
                        console.log(`[Processor] OCR completed with ${ocrResult.confidence.toFixed(1)}% confidence, text length: ${extractedText.length}`);
                    }
                }
            } catch (ocrError) {
                const errorMessage = ocrError instanceof Error ? ocrError.message : 'Unknown OCR error';
                throw new Error(`OCR processing failed: ${errorMessage}`);
            }
        } else {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }
        
        if (!extractedText.trim()) {
            throw new Error('Extracted text is empty. Cannot proceed with AI analysis.');
        }
        
        return extractedText;
    } catch (error) {
        console.error(`[Processor] Text extraction failed for ${filePath}:`, error);
        throw error;
    }
}

export const processDocument = async (docId: number, filePath: string, mimeType: string) => {
    try {
        console.log(`[Processor] Job Started: Processing document with ID ${docId}, type: ${mimeType}`);
        
        // Step 1: Extract text from the document
        let extractedText = '';
        try {
            extractedText = await extractTextFromFile(filePath, mimeType);
            
            // Update the document with extracted text
            await db.update(documents).set({ extractedText }).where(eq(documents.id, docId));
            console.log(`[Processor] Step 1/3 SUCCESS: Text extracted for doc ID ${docId}.`);
        } catch (textError) {
            console.error(`[Processor] Text extraction failed for doc ${docId}:`, textError);
            const errorMessage = textError instanceof Error ? textError.message : 'Unknown text extraction error';
            await db.update(documents).set({ 
                processingStatus: 'FAILED',
                extractedText: `ERROR: ${errorMessage}`
            }).where(eq(documents.id, docId));
            return;
        }

        console.log(`[Processor] Step 2/3 STARTED: Generating AI content for doc ID ${docId}.`);
        
        // Step 2: Generate AI content using Gemini
        // --- CHANGE: Made AI Calls More Resilient ---
        // REASON: Each AI call is now handled individually. If one fails (e.g., timeline),
        // the others will still complete. We log the specific failure and continue with null.
        const [summary, timeline, translationEn, translationAr] = await Promise.all([
            model.generateContent(`Provide a concise, professional summary of the document:\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { 
                const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                console.error(`[Processor] AI Summary failed for doc ${docId}:`, errorMessage); 
                return null; 
            }),
            model.generateContent(`Extract a timeline of key events and dates. Return as a valid JSON array of objects, each with "date" and "event" keys. If none, return [].\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { 
                const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                console.error(`[Processor] AI Timeline failed for doc ${docId}:`, errorMessage); 
                return null; 
            }),
            model.generateContent(`Translate the following text to English. Return only the translated text.\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { 
                const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                console.error(`[Processor] AI EN Translation failed for doc ${docId}:`, errorMessage); 
                return null; 
            }),
            model.generateContent(`Translate the following text to Arabic. Return only the translated text.\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { 
                const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                console.error(`[Processor] AI AR Translation failed for doc ${docId}:`, errorMessage); 
                return null; 
            })
        ]);
        console.log(`[Processor] Step 2/3 SUCCESS: All AI tasks completed for doc ID ${docId}.`);

        // Step 3: Update database with AI-generated content
        // --- CHANGE: Added Definitive Check and Logging before Database Update ---
        // REASON: This is the most critical change. We isolate the final database write to catch
        // the exact error if it fails, which is the problem you're experiencing.
        const finalData = {
            summary,
            timeline: timeline ? getJSONFromString(timeline) : [],
            translationEn,
            translationAr,
            processingStatus: 'PROCESSED' as const
        };

        console.log(`[Processor] Step 3/3 STARTED: Attempting to write data to database for doc ID ${docId}.`);
        
        try {
            await db.update(documents).set(finalData).where(eq(documents.id, docId));
            console.log(`[Processor] Step 3/3 SUCCESS: Database updated. Job for doc ID ${docId} is complete.`);
        } catch (dbError) {
            console.error(`[Processor] DATABASE WRITE FAILED for doc ID ${docId}. The AI data was generated but could not be saved. Error:`, dbError);
            // Even if the final write fails, we mark it as FAILED to stop the UI spinner.
            await db.update(documents).set({ processingStatus: 'FAILED' }).where(eq(documents.id, docId));
        }
        // --- END OF CHANGE ---

    } catch (error) {
        console.error(`[Processor] FATAL ERROR during processing of doc ID ${docId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
        await db.update(documents).set({ 
            processingStatus: 'FAILED',
            extractedText: `ERROR: ${errorMessage}`
        }).where(eq(documents.id, docId));
    }
};

// Cleanup function to be called when the server shuts down
export const cleanupDocumentProcessor = async () => {
    try {
        await ocrProcessor.cleanup();
        console.log('[Processor] Cleanup completed');
    } catch (error) {
        console.error('[Processor] Cleanup failed:', error);
    }
};
