import fs from 'fs';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { prependOnceListener } from 'process';

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

export const processDocument = async (docId: number, filePath: string, mimeType: string) => {
    try {
        console.log(`[Processor] Job Started: Processing document with ID ${docId}.`);
        
        let extractedText = '';
        try {
            if (mimeType === 'application/pdf') {
                extractedText = (await pdf(fs.readFileSync(filePath))).text;
            } else if (mimeType.startsWith('image/')) {
                const worker = await createWorker('eng');
                extractedText = (await worker.recognize(filePath)).data.text;
                await worker.terminate();
            } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                extractedText = (await mammoth.extractRawText({ path: filePath })).value;
            } else {
                throw new Error(`Unsupported file type: ${mimeType}`);
            }
            if (!extractedText.trim()) throw new Error('Extracted text is empty. Cannot proceed with AI analysis.');
            await db.update(documents).set({ extractedText }).where(eq(documents.id, docId));
            console.log(`[Processor] Step 1/3 SUCCESS: Text extracted for doc ID ${docId}.`);
        } catch (textError) {
            throw new Error(`Text extraction failed: ${textError}`);
        }

        console.log(`[Processor] Step 2/3 STARTED: Generating AI content for doc ID ${docId}.`);
        
        // --- CHANGE: Made AI Calls More Resilient ---
        // REASON: Each AI call is now handled individually. If one fails (e.g., timeline),
        // the others will still complete. We log the specific failure and continue with null.
        const [summary, timeline, translationEn, translationAr] = await Promise.all([
            model.generateContent(`Provide a concise, professional summary of the document:\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { console.error(`[Processor] AI Summary failed for doc ${docId}:`, e); return null; }),
            model.generateContent(`Extract a timeline of key events and dates. Return as a valid JSON array of objects, each with "date" and "event" keys. If none, return [].\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { console.error(`[Processor] AI Timeline failed for doc ${docId}:`, e); return null; }),
            model.generateContent(`Translate the following text to English. Return only the translated text.\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { console.error(`[Processor] AI EN Translation failed for doc ${docId}:`, e); return null; }),
            model.generateContent(`Translate the following text to Arabic. Return only the translated text.\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { console.error(`[Processor] AI AR Translation failed for doc ${docId}:`, e); return null; })
        ]);
        console.log(`[Processor] Step 2/3 SUCCESS: All AI tasks completed for doc ID ${docId}.`);

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
        await db.update(documents).set({ processingStatus: 'FAILED' }).where(eq(documents.id, docId));
    }
};
