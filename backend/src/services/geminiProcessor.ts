import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import ffmpeg from 'fluent-ffmpeg';
import mammoth from 'mammoth';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Constants - Comprehensive audio MIME type support
const SUPPORTED_AUDIO_TYPES = [
    // Standard audio MIME types
    'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
    // Extended variations that browsers might send
    'audio/x-wav', 'audio/x-mp3', 'audio/x-aiff', 'audio/x-mpeg', 'audio/x-mp4', 'audio/x-aac', 'audio/x-ogg', 'audio/x-flac',
    // Additional common variations
    'audio/mp4a-latm', 'audio/mpeg3', 'audio/x-mpeg3', 'audio/mpg', 'audio/x-mpg', 'audio/x-mpegaudio',
    // Mobile and web formats
    'audio/webm', 'audio/3gpp', 'audio/3gpp2', 'audio/amr', 'audio/x-m4a', 'audio/m4a', 'audio/x-wav',
    // Windows Media formats
    'audio/x-ms-wma', 'audio/wma', 'audio/x-ms-wax',
    // Apple formats
    'audio/x-caf', 'audio/x-aiff', 'audio/aiff',
    // Lossless formats
    'audio/x-flac', 'audio/flac', 'audio/x-ape', 'audio/ape'
];
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'];
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/x-javascript', 'text/x-typescript', 'application/json', 'text/md', 'text/csv', 'text/xml', 'application/rtf', 'text/rtf'];

const DEFAULT_CONFIDENCE = 85;
const MIN_CONTENT_LENGTH = 10;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 2;
const DOCX_PROCESSING_DELAY = 1000;

// Check for Gemini API key
if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL: GEMINI_API_KEY is not defined in the .env file. The Gemini processor cannot start.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Safety settings for legal documents
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash', 
    safetySettings 
});

export interface GeminiProcessingResult {
    text: string;
    confidence: number;
    processingTime: number;
    method: 'visual_ocr' | 'audio_transcription' | 'document_analysis';
}

export class GeminiProcessor {
    
    /**
     * Get all file types supported by Gemini API
     */
    static getSupportedMimeTypes(): string[] {
        return [
            ...SUPPORTED_IMAGE_TYPES,
            ...SUPPORTED_VIDEO_TYPES,
            ...SUPPORTED_AUDIO_TYPES,
            ...SUPPORTED_DOCUMENT_TYPES
            // NOTE: Microsoft Office documents (docx, xlsx, pptx) are NOT directly supported by Gemini API
            // They should be processed through extraction + image OCR for images within them
        ];
    }

    /**
     * Check if a MIME type is supported by Gemini
     */
    static isSupported(mimeType: string): boolean {
        return this.getSupportedMimeTypes().includes(mimeType);
    }

    /**
     * Get the appropriate processing method for a file type
     */
    private static getProcessingMethod(mimeType: string): 'visual_ocr' | 'audio_transcription' | 'document_analysis' {
        if (mimeType.startsWith('audio/')) {
            return 'audio_transcription';
        } else if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
            return 'visual_ocr';
        } else {
            return 'document_analysis';
        }
    }

    /**
     * Process a file using Gemini's multimodal capabilities
     */
    async processFile(filePath: string, mimeType: string): Promise<GeminiProcessingResult> {
        const startTime = Date.now();
        
        try {
            console.log(`[Gemini] Processing ${mimeType} file: ${filePath}`);
            
            if (!GeminiProcessor.isSupported(mimeType)) {
                throw new Error(`MIME type ${mimeType} is not supported by Gemini API`);
            }

            const method = GeminiProcessor.getProcessingMethod(mimeType);
            const result = await this.processFileByMethod(filePath, mimeType, method);
            const processingTime = Date.now() - startTime;
            
            return {
                text: result.trim(),
                confidence: DEFAULT_CONFIDENCE,
                processingTime,
                method
            };

        } catch (error) {
            console.error(`[Gemini] Processing failed for ${filePath}:`, error);
            throw new Error(`Gemini processing failed: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Route processing to appropriate method based on type
     */
    private async processFileByMethod(filePath: string, mimeType: string, method: string): Promise<string> {
        switch (method) {
            case 'audio_transcription':
                return await this.processAudioFile(filePath, mimeType);
            case 'visual_ocr':
                return await this.processVisualFile(filePath, mimeType);
            case 'document_analysis':
                return await this.processDocumentFile(filePath, mimeType);
            default:
                throw new Error(`Unknown processing method: ${method}`);
        }
    }

    /**
     * Extract error message consistently
     */
    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'Unknown error';
    }

    /**
     * Validate content length
     */
    private validateContentLength(content: string, operation: string): void {
        if (!content || content.trim().length < MIN_CONTENT_LENGTH) {
            throw new Error(`${operation} returned insufficient content`);
        }
    }

    /**
     * Get audio transcription prompt
     */
    private getAudioTranscriptionPrompt(): string {
        return `You are a professional legal transcriptionist with expertise in audio analysis and transcription.

TASK: Transcribe and analyze this audio file for legal case documentation.

REQUIREMENTS:
1. **Complete Transcription**: Provide a word-for-word transcription of all spoken content, including:
   - All speakers' dialogue (identify speakers as Speaker 1, Speaker 2, etc.)
   - Background conversations if audible and relevant
   - Legal terminology and case references
   - Dates, names, and important details mentioned

2. **Legal Focus**: Pay special attention to:
   - Legal proceedings and testimony
   - Case numbers and legal references
   - Witness statements and depositions
   - Court proceedings and legal discussions
   - Contract negotiations and agreements

3. **Audio Quality Notes**: Include observations about:
   - Audio quality and clarity
   - Multiple speakers and their roles
   - Any unclear or inaudible sections (mark as [UNCLEAR] or [INAUDIBLE])
   - Background noise or interruptions

4. **Formatting**: Structure the transcription with:
   - Clear speaker identification
   - Timestamp references where significant
   - Paragraph breaks for different topics
   - Note any significant pauses or emphasis

5. **Content Analysis**: After transcription, provide:
   - Summary of key legal points discussed
   - Important dates, names, and references mentioned
   - Main topics or issues covered

Please transcribe this audio file and provide comprehensive analysis for legal case building.`;
    }

    /**
     * Process audio files for transcription
     */
    private async processAudioFile(filePath: string, mimeType: string): Promise<string> {
        console.log(`[Gemini] Transcribing audio file: ${filePath} (MIME: ${mimeType})`);

        const { actualFilePath, actualMimeType } = await this.ensureCompatibleAudioFormat(filePath, mimeType);
        
        // Ensure we use absolute path for file reading
        const absoluteFilePath = path.resolve(actualFilePath);
        
        // Check if file exists before reading
        if (!fs.existsSync(absoluteFilePath)) {
            throw new Error(`Audio file not found: ${absoluteFilePath}`);
        }
        
        const audioBuffer = fs.readFileSync(absoluteFilePath);
        const base64Audio = audioBuffer.toString('base64');

        try {
            const result = await model.generateContent([
                this.getAudioTranscriptionPrompt(),
                {
                    inlineData: {
                        mimeType: actualMimeType,
                        data: base64Audio
                    }
                }
            ]);

            const transcription = result.response.text();
            this.validateContentLength(transcription, 'Audio transcription');
            
            console.log(`[Gemini] Audio transcription completed, length: ${transcription.length}`);
            return transcription;

        } catch (error) {
            console.error(`[Gemini] Audio transcription failed:`, error);
            throw new Error(`Audio transcription failed: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Ensure audio format is compatible with Gemini, convert if necessary
     */
    private async ensureCompatibleAudioFormat(filePath: string, mimeType: string): Promise<{ actualFilePath: string; actualMimeType: string }> {
        // Ensure we use absolute path for input file
        const absoluteFilePath = path.resolve(filePath);
        
        if (SUPPORTED_AUDIO_TYPES.includes(mimeType)) {
            return { actualFilePath: absoluteFilePath, actualMimeType: mimeType };
        }

        // Convert to WAV using ffmpeg
        const wavPath = absoluteFilePath.replace(path.extname(absoluteFilePath), '.wav');
        console.log(`[Gemini] Converting ${absoluteFilePath} to WAV for Gemini compatibility...`);
        
        await new Promise((resolve, reject) => {
            ffmpeg(absoluteFilePath)
                .toFormat('wav')
                .on('end', () => {
                    console.log(`[Gemini] Conversion to WAV completed: ${wavPath}`);
                    resolve(true);
                })
                .on('error', (err: any) => {
                    console.error(`[Gemini] Error converting audio to WAV:`, err);
                    reject(err);
                })
                .save(wavPath);
        });

        return { actualFilePath: wavPath, actualMimeType: 'audio/wav' };
    }

    /**
     * Process visual files (images/videos) for OCR and content analysis
     */
    private async processVisualFile(filePath: string, mimeType: string): Promise<string> {
        console.log(`[Gemini] Analyzing visual file: ${filePath}`);
        
        // Ensure we use absolute path for file reading
        const absoluteFilePath = path.resolve(filePath);
        
        // Check if file exists before reading
        if (!fs.existsSync(absoluteFilePath)) {
            throw new Error(`Visual file not found: ${absoluteFilePath}`);
        }
        
        const fileBuffer = fs.readFileSync(absoluteFilePath);
        const base64File = fileBuffer.toString('base64');

        try {
            const result = await model.generateContent([
                this.getVisualAnalysisPrompt(mimeType),
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64File
                    }
                }
            ]);

            const analysis = result.response.text();
            this.validateContentLength(analysis, 'Visual analysis');
            
            console.log(`[Gemini] Visual analysis completed, length: ${analysis.length}`);
            return analysis;

        } catch (error) {
            console.error(`[Gemini] Visual analysis failed:`, error);
            throw new Error(`Visual analysis failed: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Get visual analysis prompt
     */
    private getVisualAnalysisPrompt(mimeType: string): string {
        const mediaType = mimeType.startsWith('image/') ? 'image' : 'video';
        const mediaSpecificInstructions = mimeType.startsWith('video/') 
            ? 'For videos: Analyze key frames and extract text from relevant scenes. If no text is found, describe the main visual content and changes throughout the video.'
            : 'For images: Provide comprehensive OCR and, if no text is found, a visual analysis of the entire image.';

        return `You are a professional legal document analyst with expertise in visual content analysis and OCR.

TASK: Analyze this ${mediaType} and extract all readable text (OCR) and provide a brief visual analysis for legal case documentation.

REQUIREMENTS:
1. **Text Extraction (OCR)**: Extract ALL visible text, including:
    - Document headers, titles, and section headings
    - Body text and paragraphs
    - Tables, forms, and structured data
    - Handwritten notes and annotations
    - Signatures and stamps
    - Legal citations and references
    - Dates, names, and case numbers

2. **Visual Content Analysis**: If NO readable text is found, or OCR content is minimal, provide a brief but informative visual analysis of the content, including:
    - Document layout and structure
    - Legal document types (contracts, forms, certificates, etc.)
    - Visual evidence (photos, diagrams, charts)
    - Objects, scenes, or notable features
    - Condition and quality of documents
    - Any markings, stamps, or official seals

3. **Quality Assessment**: Note any issues with:
    - Text readability and clarity
    - Image/video quality affecting OCR accuracy
    - Partial or obscured content
    - Multiple pages or documents in single ${mediaType}

4. **Structured Output**: Always provide:
    - Extracted text content (maintain original formatting where possible)
    - If no text is found, a brief visual analysis summary
    - Description of visual elements
    - Assessment of document significance
    - Any concerns about content clarity or completeness

${mediaSpecificInstructions}

Please analyze this file and provide complete text extraction and, if no text is found, a brief visual analysis for legal case building.`;
    }

    /**
     * Process document files for text extraction and analysis
     */
    private async processDocumentFile(filePath: string, mimeType: string): Promise<string> {
        console.log(`[Gemini] Analyzing document file: ${filePath}`);
        
        // Ensure we use absolute path for file reading
        const absoluteFilePath = path.resolve(filePath);
        
        // Check if file exists before reading
        if (!fs.existsSync(absoluteFilePath)) {
            throw new Error(`Document file not found: ${absoluteFilePath}`);
        }
        
        const fileBuffer = fs.readFileSync(absoluteFilePath);
        const base64File = fileBuffer.toString('base64');

        try {
            const result = await model.generateContent([
                this.getDocumentAnalysisPrompt(mimeType),
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64File
                    }
                }
            ]);

            const analysis = result.response.text();
            this.validateContentLength(analysis, 'Document analysis');
            
            console.log(`[Gemini] Document analysis completed, length: ${analysis.length}`);
            return analysis;

        } catch (error) {
            console.error(`[Gemini] Document analysis failed:`, error);
            throw new Error(`Document analysis failed: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Get document analysis prompt
     */
    private getDocumentAnalysisPrompt(mimeType: string): string {
        return `You are a professional legal document analyst with expertise in document processing and text extraction.

TASK: Analyze and extract content from this ${mimeType} document for legal case documentation. The document may be in any language or from any region.

REQUIREMENTS:
1. **Language & Region**: The document may be in any language or from any region. Do NOT assume it is Arabic or any specific language. Detect the language automatically.
   - If the document is not in English or Arabic, translate the extracted content and analysis to English. If the user requests, also provide an Arabic translation.

2. **Document Verification**: First, assess whether the document is a legal document.
   - **If the document is a legal document:** Proceed with the analysis as outlined in the following steps.
   - **If the document is NOT a legal document:** Respond with a clear statement that the uploaded content is not a legal document and add a brief visual analysis summary of the content. **DO NOT** attempt to analyze or generate any legal-related content skip all the following instruction.

3. **Complete Content Extraction**: Extract ALL content including:
   - All visible text and content
   - Document structure and formatting
   - Tables, lists, and structured data
   - Headers, footers, and metadata
   - Embedded text and annotations

4. **Document Analysis**: Provide insights about:
   - Document type and purpose
   - Legal significance and context
   - Key legal terms and references
   - Important dates, names, and details
   - Document structure and organization

5. **Quality Assurance**: Ensure:
   - Complete content extraction
   - Accurate text reproduction
   - Proper formatting preservation
   - Clear identification of document sections

Please analyze this document and provide comprehensive content extraction and analysis for legal case building, including the extracted information formatted for professional legal use. Translate the results to English if the original document is in another language.`;
    }

    /**
     * Extract text content from DOCX files using mammoth
     */
    private async extractTextFromDOCX(filePath: string): Promise<string> {
        try {
            console.log(`[Gemini] Extracting text from DOCX: ${filePath}`);
            
            // Ensure we have an absolute path
            const absoluteFilePath = path.resolve(filePath);
            
            // Check if file exists
            if (!fs.existsSync(absoluteFilePath)) {
                throw new Error(`DOCX file not found: ${absoluteFilePath}`);
            }
            
            // Extract text using mammoth
            const result = await mammoth.extractRawText({ path: absoluteFilePath });
            const extractedText = result.value.trim();
            
            if (result.messages && result.messages.length > 0) {
                console.warn(`[Gemini] DOCX extraction warnings:`, result.messages);
            }
            
            console.log(`[Gemini] Successfully extracted ${extractedText.length} characters from DOCX`);
            return extractedText;
            
        } catch (error) {
            console.error(`[Gemini] Failed to extract text from DOCX:`, error);
            throw new Error(`DOCX text extraction failed: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Detect language of the given text using Gemini AI
     */
    private async detectLanguage(text: string): Promise<string> {
        try {
            if (!text || text.trim().length < 20) {
                return 'en'; // Default to English for very short texts
            }
            
            const prompt = `Detect the language of the following text and respond with only the two-letter ISO 639-1 language code (e.g., "en" for English, "ar" for Arabic, "fr" for French, etc.). If multiple languages are present, return the primary language.

Text: "${text.substring(0, 500)}"`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const detectedLang = response.text().trim().toLowerCase();
            
            // Validate the response is a proper language code
            if (detectedLang.length === 2 && /^[a-z]{2}$/.test(detectedLang)) {
                console.log(`[Gemini] Detected language: ${detectedLang}`);
                return detectedLang;
            } else {
                console.warn(`[Gemini] Invalid language detection response: ${detectedLang}, defaulting to English`);
                return 'en';
            }
        } catch (error) {
            console.error(`[Gemini] Language detection failed:`, error);
            return 'en'; // Default to English on error
        }
    }

    /**
     * Translate text to English using Gemini AI
     */
    private async translateToEnglish(text: string, sourceLanguage: string): Promise<string> {
        try {
            if (sourceLanguage === 'en') {
                return text; // Already in English
            }
            
            console.log(`[Gemini] Translating text from ${sourceLanguage} to English`);
            
            const prompt = `Translate the following text from ${sourceLanguage} to English. Maintain the original formatting and structure as much as possible. Provide only the translation without any additional commentary.

Text to translate:
${text}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const translatedText = response.text().trim();
            
            console.log(`[Gemini] Translation completed, ${text.length} → ${translatedText.length} characters`);
            return translatedText;
            
        } catch (error) {
            console.error(`[Gemini] Translation failed:`, error);
            console.log(`[Gemini] Falling back to original text due to translation failure`);
            return text; // Return original text if translation fails
        }
    }

    /**
     * Process DOCX files by extracting text and images, with translation support
     * This is a special method since Gemini doesn't support DOCX directly
     */
    async processDOCXWithImages(filePath: string, extractedText: string = ''): Promise<GeminiProcessingResult> {
        const startTime = Date.now();
        
        try {
            console.log(`[Gemini] Processing DOCX file with comprehensive extraction: ${filePath}`);
            
            let combinedText = '';
            let textExtractionSuccessful = false;
            let imageExtractionSuccessful = false;
            let hasTranslation = false;
            
            // Step 1: Try to extract text content from DOCX
            try {
                const docxText = await this.extractTextFromDOCX(filePath);
                if (docxText && docxText.trim().length > 0) {
                    console.log(`[Gemini] Successfully extracted ${docxText.length} characters of text from DOCX`);
                    
                    // Step 2: Detect language and translate if necessary
                    const detectedLanguage = await this.detectLanguage(docxText);
                    let processedText = docxText;
                    
                    if (detectedLanguage !== 'en') {
                        console.log(`[Gemini] Document is in ${detectedLanguage}, translating to English`);
                        processedText = await this.translateToEnglish(docxText, detectedLanguage);
                        hasTranslation = true;
                        
                        // Add translation metadata
                        combinedText += `--- DOCUMENT METADATA ---\n`;
                        combinedText += `Original Language: ${detectedLanguage}\n`;
                        combinedText += `Translation: Translated to English for processing\n\n`;
                    }
                    
                    combinedText += `--- DOCUMENT TEXT CONTENT ---\n${processedText}\n`;
                    textExtractionSuccessful = true;
                } else {
                    console.warn(`[Gemini] No text content found in DOCX file`);
                }
            } catch (textError) {
                console.error(`[Gemini] Text extraction from DOCX failed:`, textError);
                combinedText += `--- TEXT EXTRACTION ERROR ---\nFailed to extract text: ${this.getErrorMessage(textError)}\n\n`;
            }
            
            // Step 3: Try to extract and process images
            try {
                const extractedImages = await this.extractImagesFromDOCX(filePath);
                if (extractedImages.length > 0) {
                    console.log(`[Gemini] Successfully extracted ${extractedImages.length} images from DOCX`);
                    combinedText += '\n--- IMAGE CONTENT ANALYSIS ---\n' + extractedImages.join('\n');
                    imageExtractionSuccessful = true;
                } else {
                    console.log(`[Gemini] No images found in DOCX file`);
                }
            } catch (imageError) {
                console.error(`[Gemini] Image extraction from DOCX failed:`, imageError);
                combinedText += `\n--- IMAGE EXTRACTION ERROR ---\nFailed to extract images: ${this.getErrorMessage(imageError)}\n`;
            }
            
            // Step 4: Include any pre-extracted text passed as parameter
            if (extractedText && extractedText.trim().length > 0) {
                combinedText += `\n--- ADDITIONAL EXTRACTED TEXT ---\n${extractedText}\n`;
            }
            
            // Step 5: Validate we have some content
            const finalText = combinedText.trim();
            if (!finalText || finalText.length === 0) {
                throw new Error('No content could be extracted from DOCX file. The document may be empty, corrupted, or use unsupported formatting.');
            }
            
            // Determine processing confidence based on what was successful
            let confidence = 50; // Base confidence
            if (textExtractionSuccessful) confidence += 30;
            if (imageExtractionSuccessful) confidence += 20;
            if (hasTranslation) confidence -= 10; // Slight reduction for translation uncertainty
            
            const processingTime = Date.now() - startTime;
            
            console.log(`[Gemini] DOCX processing completed successfully:`);
            console.log(`  - Text extraction: ${textExtractionSuccessful ? 'SUCCESS' : 'FAILED'}`);
            console.log(`  - Image extraction: ${imageExtractionSuccessful ? 'SUCCESS' : 'FAILED'}`);
            console.log(`  - Translation applied: ${hasTranslation ? 'YES' : 'NO'}`);
            console.log(`  - Total content length: ${finalText.length} characters`);
            console.log(`  - Confidence: ${confidence}%`);
            
            return {
                text: finalText,
                confidence: Math.min(confidence, 95), // Cap at 95%
                processingTime,
                method: imageExtractionSuccessful ? 'visual_ocr' : 'document_analysis'
            };
            
        } catch (error) {
            console.error(`[Gemini] DOCX processing failed:`, error);
            
            // Enhanced error messaging based on error type
            let errorMessage = 'DOCX processing failed';
            if (error instanceof Error) {
                if (error.message.includes('not found')) {
                    errorMessage = 'DOCX file not found or inaccessible';
                } else if (error.message.includes('corrupted') || error.message.includes('zip')) {
                    errorMessage = 'DOCX file appears to be corrupted or invalid';
                } else if (error.message.includes('empty')) {
                    errorMessage = 'DOCX file contains no extractable content';
                } else {
                    errorMessage = `DOCX processing failed: ${error.message}`;
                }
            }
            
            throw new Error(errorMessage);
        }
    }

    /**
     * Extract and process images from DOCX file with improved error handling
     */
    private async extractImagesFromDOCX(filePath: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const extractedImages: string[] = [];
            let processedImages = 0;
            let totalImages = 0;
            
            // Ensure we have an absolute path
            const absoluteFilePath = path.resolve(filePath);
            
            // Check if file exists before attempting to open
            if (!fs.existsSync(absoluteFilePath)) {
                reject(new Error(`DOCX file not found: ${absoluteFilePath}`));
                return;
            }
            
            console.log(`[Gemini] Opening DOCX file for image extraction: ${absoluteFilePath}`);
            
            // Set timeout for the entire operation
            const timeoutId = setTimeout(() => {
                reject(new Error('DOCX image extraction timed out after 30 seconds'));
            }, 30000);
            
            yauzl.open(absoluteFilePath, { lazyEntries: true }, (err, zipfile) => {
                if (err || !zipfile) {
                    clearTimeout(timeoutId);
                    const errorMsg = `Failed to open DOCX file: ${err?.message || 'Unknown error'}`;
                    console.error(`[Gemini] ${errorMsg}`);
                    reject(new Error(errorMsg));
                    return;
                }
                
                console.log(`[Gemini] Successfully opened DOCX file, starting entry extraction`);
                
                zipfile.readEntry();
                
                zipfile.on("entry", (entry) => {
                    if (this.isImageEntry(entry.fileName)) {
                        totalImages++;
                        this.processImageEntry(zipfile, entry, extractedImages, () => {
                            processedImages++;
                            if (processedImages === totalImages) {
                                // All images processed, we can resolve even if some failed
                                clearTimeout(timeoutId);
                                console.log(`[Gemini] Image processing completed: ${extractedImages.length}/${totalImages} successful`);
                                resolve(extractedImages);
                            }
                        });
                    } else {
                        zipfile.readEntry();
                    }
                });
                
                zipfile.on("end", async () => {
                    clearTimeout(timeoutId);
                    console.log(`[Gemini] DOCX entry extraction completed, found ${totalImages} images`);
                    
                    // If no images were found, resolve immediately
                    if (totalImages === 0) {
                        await new Promise(resolve => setTimeout(resolve, DOCX_PROCESSING_DELAY));
                        resolve(extractedImages);
                    }
                    // Otherwise wait for image processing to complete
                    // The resolution will happen in the processImageEntry callback
                });
                
                zipfile.on("error", (zipError) => {
                    clearTimeout(timeoutId);
                    console.error(`[Gemini] Error reading DOCX zip file:`, zipError);
                    // Don't reject immediately - try to return any successfully extracted images
                    resolve(extractedImages);
                });
            });
        });
    }

    /**
     * Check if ZIP entry is an image file
     */
    private isImageEntry(fileName: string): boolean {
        return fileName.startsWith('word/media/') && 
               (fileName.includes('.png') || fileName.includes('.jpg') || fileName.includes('.jpeg'));
    }

    /**
     * Process individual image entry from DOCX with callback support
     */
    private processImageEntry(zipfile: any, entry: any, extractedImages: string[], onComplete?: () => void): void {
        console.log(`[Gemini] Found image in DOCX: ${entry.fileName}`);
        
        zipfile.openReadStream(entry, (err: any, readStream: any) => {
            if (err || !readStream) {
                console.warn(`[Gemini] Failed to extract ${entry.fileName}:`, err);
                zipfile.readEntry();
                if (onComplete) onComplete();
                return;
            }
            
            const chunks: Buffer[] = [];
            readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            readStream.on('end', async () => {
                try {
                    const imageBuffer = Buffer.concat(chunks);
                    const base64Image = imageBuffer.toString('base64');
                    const ext = path.extname(entry.fileName).toLowerCase();
                    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
                    
                    const imageAnalysis = await this.processImageBuffer(base64Image, mimeType);
                    if (imageAnalysis && imageAnalysis.trim().length > 0) {
                        const formattedAnalysis = this.formatImageAnalysis(entry.fileName, imageAnalysis);
                        extractedImages.push(formattedAnalysis);
                    }
                } catch (error) {
                    console.warn(`[Gemini] Failed to process image ${entry.fileName}:`, error);
                } finally {
                    zipfile.readEntry();
                    if (onComplete) onComplete();
                }
            });

            readStream.on('error', (streamError: any) => {
                console.warn(`[Gemini] Stream error for ${entry.fileName}:`, streamError);
                zipfile.readEntry();
                if (onComplete) onComplete();
            });
        });
    }

    /**
     * Format image analysis for consistent output
     */
    private formatImageAnalysis(fileName: string, analysis: string): string {
        const splitMarkers = [
            '\n- Identified objects',
            '\n- Object & Scene Description',
            '\n- Description:',
            '\n- Objects:',
            '\n- Scene:'
        ];
        
        let splitIndex = -1;
        for (const marker of splitMarkers) {
            splitIndex = analysis.indexOf(marker);
            if (splitIndex !== -1) break;
        }
        
        if (splitIndex !== -1) {
            const ocrText = analysis.substring(0, splitIndex).trim();
            const visualSummary = analysis.substring(splitIndex).trim();
            return `\n--- Image from ${fileName} (Comprehensive Analysis) ---\nOCR Text:\n${ocrText}\n\nVisual Summary:\n${visualSummary}`;
        } else {
            return `\n--- Image from ${fileName} (Analysis) ---\n${analysis}`;
        }
    }

    /**
     * Process an image buffer directly with Gemini OCR
     */
    private async processImageBuffer(base64Data: string, mimeType: string): Promise<string> {
        try {
            const result = await model.generateContent([
                this.getImageBufferPrompt(),
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                }
            ]);

            return result.response.text() || '';
        } catch (error) {
            console.warn(`[Gemini] Image buffer processing failed:`, error);
            return '';
        }
    }

    /**
     * Get image buffer processing prompt
     */
    private getImageBufferPrompt(): string {
        return `You are a professional legal document and visual analyst.

TASK: Analyze this image extracted from a Word document (DOCX) for legal case documentation.

REQUIREMENTS:
1. **Text Extraction (OCR)**: Extract all visible text, maintaining structure and formatting where possible.
2. **Object & Scene Description**: Identify and describe any visible objects, scenes, or elements (e.g., doors, cars, people, stamps, signatures, etc.).
   - For each object, provide a brief description and its possible relevance to a legal case.
3. **Legal Context**: First, assess whether the document is a legal document. If it is, note any legal markings, seals, or contextually important visual features; otherwise, do not include any legal context.
4. **Quality Notes**: If text or objects are unclear or partially visible, please note this.

OUTPUT:
- Start with the extracted text (OCR)
- Then provide a list of identified objects/scenes with descriptions
- Add any legal context or quality notes if it is a legal document.

Format your response clearly for legal case documentation.`;
    }

    /**
     * Process with retry logic for better reliability
     */
    async processWithRetry(filePath: string, mimeType: string, maxRetries: number = DEFAULT_MAX_RETRIES): Promise<GeminiProcessingResult> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Gemini] Processing attempt ${attempt}/${maxRetries} for ${filePath}`);
                return await this.processFile(filePath, mimeType);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                console.warn(`[Gemini] Attempt ${attempt} failed:`, lastError.message);
                
                if (attempt < maxRetries) {
                    const delay = Math.pow(RETRY_DELAY_BASE, attempt) * 1000;
                    console.log(`[Gemini] Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Gemini processing failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Generate a relevant case title based on document content and/or chat context
     */
    async generateCaseTitle(context: {
        documentSummaries?: string[];
        chatMessages?: string[];
        existingTitle?: string;
    }): Promise<string> {
        try {
            console.log('[Gemini] Generating case title from context');
            
            const { documentSummaries = [], chatMessages = [], existingTitle } = context;
            
            // Build context for title generation
            let contextText = '';
            
            if (documentSummaries.length > 0) {
                contextText += 'Document Summaries:\n';
                documentSummaries.forEach((summary, index) => {
                    contextText += `Document ${index + 1}: ${summary.substring(0, 500)}...\n\n`;
                });
            }
            
            if (chatMessages.length > 0) {
                contextText += 'Recent Chat Messages:\n';
                chatMessages.slice(-5).forEach((message, index) => {
                    contextText += `Message ${index + 1}: ${message.substring(0, 200)}...\n`;
                });
            }
            
            if (!contextText.trim()) {
                return 'Untitled';
            }
            
            const prompt = this.getCaseTitleGenerationPrompt(existingTitle);
            
            const result = await model.generateContent([prompt, contextText]);
            const generatedTitle = result.response.text().trim();
            
            // Validate and clean the generated title
            const cleanTitle = this.validateAndCleanTitle(generatedTitle);
            
            console.log(`[Gemini] Generated case title: "${cleanTitle}"`);
            return cleanTitle;
            
        } catch (error) {
            console.error('[Gemini] Case title generation failed:', error);
            return 'Untitled';
        }
    }

    /**
     * Get case title generation prompt
     */
    private getCaseTitleGenerationPrompt(existingTitle?: string): string {
        return `You are a professional legal assistant tasked with generating concise, descriptive case titles.

TASK: Generate a brief, professional case title (maximum 60 characters) based on the provided context.

REQUIREMENTS:
1. **Brevity**: Keep the title under 60 characters
2. **Professionalism**: Use formal, legal language appropriate for case management
3. **Clarity**: The title should clearly indicate the type of legal matter
4. **Specificity**: Include relevant details like case type, parties, or subject matter when available

GUIDELINES:
- Focus on the primary legal issue or case type
- Include key parties or subject matter if mentioned
- Use standard legal terminology
- Avoid generic terms like "Legal Matter" or "Case"
- Do not include case numbers, dates, or file references
- If the context suggests multiple issues, focus on the primary one

${existingTitle && existingTitle !== 'Untitled' ? `EXISTING TITLE: "${existingTitle}" (improve if the new context provides better information)` : ''}

EXAMPLES:
- "Smith v. Johnson Contract Dispute"
- "ABC Corp Employment Termination"
- "Property Rights Violation Claim"
- "Patent Infringement Defense"
- "Family Custody Modification"

OUTPUT: Provide ONLY the title text, nothing else.`;
    }

    /**
     * Validate and clean the generated title
     */
    private validateAndCleanTitle(title: string): string {
        if (!title || title.trim().length === 0) {
            return 'Untitled';
        }
        
        // Clean the title
        let cleanTitle = title.trim();
        
        // Remove quotes if they wrap the entire title
        if ((cleanTitle.startsWith('"') && cleanTitle.endsWith('"')) ||
            (cleanTitle.startsWith("'") && cleanTitle.endsWith("'"))) {
            cleanTitle = cleanTitle.slice(1, -1).trim();
        }
        
        // Remove any prefix like "Title:" or "Case Title:"
        cleanTitle = cleanTitle.replace(/^(title|case title|matter title):\s*/i, '');
        
        // Ensure it's not too long
        if (cleanTitle.length > 60) {
            cleanTitle = cleanTitle.substring(0, 57) + '...';
        }
        
        // Check for error messages and return Untitled if found
        const errorKeywords = ['error', 'failed', 'unable', 'cannot', 'invalid', 'exception'];
        if (errorKeywords.some(keyword => cleanTitle.toLowerCase().includes(keyword))) {
            return 'Untitled';
        }
        
        return cleanTitle || 'Untitled';
    }
}

// Export singleton instance
export const geminiProcessor = new GeminiProcessor();
