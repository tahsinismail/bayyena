import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { documents } from '../db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { geminiProcessor, GeminiProcessor } from './geminiProcessor';

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
 * Extract text from different file types using only Gemini API
 */
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
    console.log(`[Processor] Extracting text from ${mimeType} file: ${filePath} using Gemini API only`);
    
    try {
        let extractedText = '';
        
        console.log(`[Processor] Processing ${mimeType} file with Gemini...`);
        
        try {
            let geminiResult: any;
            
            // Special handling for DOCX files (not directly supported by Gemini)
            if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                console.log(`[Processor] Using special DOCX image extraction for ${filePath}`);
                geminiResult = await geminiProcessor.processDOCXWithImages(filePath, '');
            } else {
                // Check if the file type is supported by Gemini for direct processing
                if (!GeminiProcessor.isSupported(mimeType)) {
                    throw new Error(`Unsupported file type: ${mimeType}. Supported types: ${GeminiProcessor.getSupportedMimeTypes().join(', ')}`);
                }
                
                // Standard Gemini processing for all file types
                geminiResult = await geminiProcessor.processWithRetry(filePath, mimeType);
            }
            
            if (geminiResult.text.trim()) {
                extractedText = geminiResult.text;
                console.log(`[Processor] Gemini ${geminiResult.method} successful, extracted ${extractedText.length} characters with ${geminiResult.confidence}% confidence`);
            } else {
                throw new Error('Gemini processing returned insufficient content');
            }
        } catch (geminiError) {
            console.error(`[Processor] Gemini processing failed:`, geminiError);
            throw new Error(`Gemini processing failed: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
        }
        
        // Final validation
        if (!extractedText.trim()) {
            throw new Error('No text could be extracted from the file. Cannot proceed with AI analysis.');
        }
        
        console.log(`[Processor] Text extraction completed successfully using Gemini API, final length: ${extractedText.length}`);
        return extractedText;
        
    } catch (error) {
        console.error(`[Processor] Text extraction failed for ${filePath}:`, error);
        throw error;
    }
}

/**
 * Utility function to validate and standardize timeline dates
 * This ensures all dates are in proper YYYY-MM-DD format for consistent processing
 */
function validateTimelineDates(timelineData: any[]): any[] {
    if (!Array.isArray(timelineData)) return [];
    
    return timelineData.map(item => {
        if (!item || typeof item !== 'object') return item;
        
        const { date, event } = item;
        
        // Validate date format
        if (date && typeof date === 'string') {
            // Check if date is already in YYYY-MM-DD format
            const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (isoDateRegex.test(date)) {
                // Date is already in correct format
                return item;
            }
            
            // Try to parse and convert various date formats
            try {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    // Convert to YYYY-MM-DD format
                    const formattedDate = parsedDate.toISOString().split('T')[0];
                    return {
                        ...item,
                        date: formattedDate,
                        event: `${event} [Date converted from: ${date}]`
                    };
                }
            } catch (error) {
                console.warn(`[Timeline] Could not parse date: ${date}`);
            }
        }
        
        return item;
    });
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
        
        // Step 2: Detect document language and generate smart translations
        console.log(`[Processor] Detecting document language and generating smart translations...`);
        
        // First, detect the primary language of the document
        const languageDetectionPrompt = `Analyze the following text and determine its primary language. 
        Return ONLY one of these exact responses: "ENGLISH", "ARABIC", or "OTHER".
        
        Text to analyze:
        ---
        ${extractedText.slice(0, 1000)}
        ---
        
        Language:`;
        
        let detectedLanguage = 'ENGLISH'; // Default fallback
        try {
            const languageResult = await model.generateContent(languageDetectionPrompt);
            const languageResponse = languageResult.response.text().trim().toUpperCase();
            if (languageResponse.includes('ARABIC')) {
                detectedLanguage = 'ARABIC';
            } else if (languageResponse.includes('ENGLISH')) {
                detectedLanguage = 'ENGLISH';
            } else {
                detectedLanguage = 'OTHER';
            }
            console.log(`[Processor] Document language detected: ${detectedLanguage}`);
        } catch (error) {
            console.warn(`[Processor] Language detection failed, using default: ENGLISH`);
        }
        
        // Generate content based on detected language
        let summary, timeline, translationEn, translationAr;
        
        if (detectedLanguage === 'ARABIC') {
            // Document is in Arabic - translate to English, keep original Arabic
            console.log(`[Processor] Arabic document detected - translating to English, preserving original Arabic`);
            [summary, timeline, translationEn, translationAr] = await Promise.all([
                model.generateContent(`Provide a concise, professional summary of this Arabic legal document:\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI Summary failed for doc ${docId}:`, errorMessage); 
                    return null; 
                }),
                model.generateContent(`Extract a timeline of key events and dates from this Arabic document. 

IMPORTANT: Handle different calendar systems and date formats properly.

REQUIREMENTS:
1. **Date Detection**: Identify dates in various formats:
   - Hijri/Islamic calendar dates (e.g., ١٤٤٥ هـ, 1445 AH)
   - Arabic numeral dates (e.g., ٢٠٢٤, ٢٠٢٥)
   - Mixed Arabic-English dates
   - Traditional Arabic date expressions

2. **Date Conversion**: Convert all dates to international Gregorian calendar format (YYYY-MM-DD)

3. **Reference Notes**: Include original date information in the event description

4. **JSON Format**: Return as a valid JSON array with this structure:
   [
     {
       "date": "2024-08-13",
       "event": "Event description with original date reference: [Original: ١٤٤٥-١٢-٢٨ هـ / 1445-12-28 AH]"
     }
   ]

5. **Date Handling Examples**:
   - Hijri: "١٤٤٥-١٢-٢٨" → "2024-08-13" + note: "[Original: ١٤٤٥-١٢-٢٨ هـ]"
   - Arabic numerals: "٢٠٢٤-٠٨-١٣" → "2024-08-13" + note: "[Original: ٢٠٢٤-٠٨-١٣]"
   - Mixed: "13 August 2024" → "2024-08-13" + note: "[Original: 13 August 2024]"

ARABIC DOCUMENT TEXT:
---
${extractedText}
---

TIMELINE JSON:`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI Timeline failed for doc ${docId}:`, errorMessage); 
                    return null; 
                }),
                model.generateContent(`You are a professional legal translator. Translate this Arabic legal document to English.

REQUIREMENTS:
1. **Legal Accuracy**: Maintain precise legal terminology and concepts if it is a legal document.
2. **Professional Tone**: Use formal, professional legal language
3. **Completeness**: Translate all content including dates, names, and legal references
4. **Format**: Structure the translation clearly with proper legal document formatting
5. **Terminology**: Use standard legal English terminology where applicable
6. **Context**: First, assess whether the document is a legal document. If it is a legal case document that may be used in court proceedings, treat it accordingly; otherwise, do not include any legal context.

ARABIC DOCUMENT TEXT:
---
${extractedText}
---

PROFESSIONAL ENGLISH TRANSLATION:`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI EN Translation failed for doc ${docId}:`, errorMessage); 
                    return null; 
                }),
                // For Arabic documents, translationAr contains the original Arabic content (formatted)
                model.generateContent(`أنت محرر قانوني محترف. قم بتنسيق وتحرير النص القانوني العربي التالي ليكون أكثر وضوحاً ومهنية.

المتطلبات:
1. **التنسيق المهني**: هيكل النص بوضوح مع تنسيق الوثيقة القانونية المناسب
2. **اللغة القانونية**: تأكد من استخدام المصطلحات القانونية العربية المعيارية
3. **الوضوح**: اجعل النص واضحاً ومقروءاً مع الحفاظ على المعنى القانوني
4. **الترقيم**: أضف ترقيماً مناسباً للفقرات والعناوين الفرعية
5. **التنظيم**: نظم المحتوى بشكل منطقي ومهني

النص العربي الأصلي:
---
${extractedText}
---

النص العربي المحرر والمهني:`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI AR Editing failed for doc ${docId}:`, errorMessage); 
                    return extractedText; // Fallback to original text
                })
            ]);
        } else {
            // Document is in English or other language - translate to Arabic, keep original English
            console.log(`[Processor] English/Other document detected - translating to Arabic, preserving original English`);
            [summary, timeline, translationEn, translationAr] = await Promise.all([
                model.generateContent(`Provide a concise, professional summary of the document:\n\n---\n${extractedText}`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI Summary failed for doc ${docId}:`, errorMessage); 
                    return null; 
                }),
                model.generateContent(`Extract a timeline of key events and dates from this document. 

IMPORTANT: Handle different calendar systems and date formats properly.

REQUIREMENTS:
1. **Date Detection**: Identify dates in various formats:
   - Standard Gregorian dates (e.g., 2024-08-13, August 13, 2024)
   - Different date formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
   - Relative dates (e.g., "yesterday", "next week", "3 months ago")
   - Fiscal or academic year references

2. **Date Standardization**: Convert all dates to international Gregorian calendar format (YYYY-MM-DD)

3. **Reference Notes**: Include original date information when conversion is needed

4. **JSON Format**: Return as a valid JSON array with this structure:
   [
     {
       "date": "2024-08-13",
       "event": "Event description with original date reference if needed: [Original: 13/08/2024]"
     }
   ]

5. **Date Handling Examples**:
   - US format: "08/13/2024" → "2024-08-13" + note: "[Original: 08/13/2024]"
   - UK format: "13/08/2024" → "2024-08-13" + note: "[Original: 13/08/2024]"
   - Text format: "August 13, 2024" → "2024-08-13" + note: "[Original: August 13, 2024]"
   - Relative: "yesterday" → "2024-08-12" + note: "[Original: yesterday]"

DOCUMENT TEXT:
---
${extractedText}
---

TIMELINE JSON:`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI Timeline failed for doc ${docId}:`, errorMessage); 
                    return null; 
                }),
                // For English documents, translationEn contains the original English content (formatted)
                model.generateContent(`You are a professional legal editor. Format and polish the following legal document text to make it more clear and professional.

REQUIREMENTS:
1. **Professional Formatting**: Structure the text clearly with proper legal document formatting if it is a legal document.
2. **Legal Language**: Ensure standard legal English terminology is used if it is a legal document.
3. **Clarity**: Make the text clear and readable while preserving legal meaning
4. **Punctuation**: Add appropriate punctuation for paragraphs and subheadings
5. **Organization**: Organize content logically and professionally

ORIGINAL ENGLISH TEXT:
---
${extractedText}
---

PROFESSIONALLY FORMATTED ENGLISH TEXT:`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI EN Editing failed for doc ${docId}:`, errorMessage); 
                    return extractedText; // Fallback to original text
                }),
                model.generateContent(`أنت مترجم قانوني محترف. قم بترجمة النص القانوني التالي إلى اللغة العربية.

المتطلبات:
1. **الدقة القانونية**: حافظ على المصطلحات والمفاهيم القانونية الدقيقة
2. **اللهجة المهنية**: استخدم لغة قانونية رسمية ومهنية
3. **الشمولية**: ترجم كامل المحتوى بما في ذلك التواريخ والأسماء والمراجع القانونية
4. **التنسيق**: هيكل الترجمة بوضوح مع تنسيق الوثيقة القانونية المناسب
5. **المصطلحات**: استخدم المصطلحات القانونية العربية المعيارية عند الإمكان
6. **السياق**: اعتبر أن هذه وثيقة قضائية قد تستخدم في الإجراءات القضائية

النص القانوني الإنجليزي:
---
${extractedText}
---

الترجمة العربية المهنية:`).then(r => r.response.text()).catch(e => { 
                    const errorMessage = e instanceof Error ? e.message : 'Unknown AI error';
                    console.error(`[Processor] AI AR Translation failed for doc ${docId}:`, errorMessage); 
                    return null; 
                })
            ]);
        }
        console.log(`[Processor] Step 2/3 SUCCESS: All AI tasks completed for doc ID ${docId}.`);

        // Step 3: Validate and standardize timeline dates
        let validatedTimeline = [];
        if (timeline) {
            try {
                const timelineData = getJSONFromString(timeline);
                validatedTimeline = validateTimelineDates(timelineData);
                console.log(`[Processor] Timeline dates validated: ${validatedTimeline.length} events processed`);
            } catch (e) {
                console.warn(`[Processor] Timeline validation failed:`, e);
                validatedTimeline = timeline ? getJSONFromString(timeline) : [];
            }
        }
        
        // Step 4: Derive a meaningful English file name from the content
        let derivedTitleEn = '';
        try {
            const titlePrompt = `You are a professional legal assistant. Based strictly on the following summary and (if needed) short excerpt, generate a concise 4-8 word professional English document title suitable as a file name. Do not include quotes or special symbols. Avoid parties' full names unless necessary. Examples: "Contract Termination Notice", "Police Incident Report", "Shareholder Agreement Amendment".\n\nSUMMARY:\n${(summary || '').slice(0, 1500)}\n\nEXCERPT:\n${extractedText.slice(0, 1200)}`;
            const titleResp = await model.generateContent(titlePrompt);
            derivedTitleEn = (titleResp.response.text() || '').trim();
        } catch (e) {
            console.warn(`[Processor] Title generation failed for doc ${docId}:`, e);
        }

        // Sanitize derived title and append original extension
        const sanitize = (s: string) => s
            .normalize('NFKD')
            .replace(/[^\w\s\-\(\)\[\]&.,]/g, '') // keep letters/digits/space and a few safe chars
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80);
        const safeTitle = sanitize(derivedTitleEn) || sanitize((summary || '').split('. ')[0] || 'Document');
        const ext = path.extname(filePath) || '';
        const newFileName = `${safeTitle}${ext}`;

        // Step 4: Update database with AI-generated content and new filename
        // --- CHANGE: Added Definitive Check and Logging before Database Update ---
        // REASON: This is the most critical change. We isolate the final database write to catch
        // the exact error if it fails, which is the problem you're experiencing.
        const finalData = {
            summary,
            timeline: validatedTimeline,
            translationEn,
            translationAr,
            processingStatus: 'PROCESSED' as const,
            fileName: newFileName
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
        // No cleanup needed for Gemini processor
        console.log('[Processor] Cleanup completed');
    } catch (error) {
        console.error('[Processor] Cleanup failed:', error);
    }
};
