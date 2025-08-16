import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
            // Images
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'image/heic',
            'image/heif',
            
            // Videos
            'video/mp4',
            'video/mpeg',
            'video/mov',
            'video/avi',
            'video/x-flv',
            'video/mpg',
            'video/webm',
            'video/wmv',
            'video/3gpp',
            
            // Audio
            'audio/wav',
            'audio/mp3',
            'audio/aiff',
            'audio/aac',
            'audio/ogg',
            'audio/flac',
            
            // Documents (text-based only)
            'application/pdf',
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'application/x-javascript',
            'text/x-typescript',
            'application/json',
            'text/md',
            'text/csv',
            'text/xml',
            'application/rtf',
            'text/rtf'
            
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
            let result: string;

            switch (method) {
                case 'audio_transcription':
                    result = await this.processAudioFile(filePath, mimeType);
                    break;
                case 'visual_ocr':
                    result = await this.processVisualFile(filePath, mimeType);
                    break;
                case 'document_analysis':
                    result = await this.processDocumentFile(filePath, mimeType);
                    break;
                default:
                    throw new Error(`Unknown processing method: ${method}`);
            }

            const processingTime = Date.now() - startTime;
            
            return {
                text: result.trim(),
                confidence: 85, // Gemini generally provides high-confidence results
                processingTime,
                method
            };

        } catch (error) {
            console.error(`[Gemini] Processing failed for ${filePath}:`, error);
            throw new Error(`Gemini processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process audio files for transcription
     */
    private async processAudioFile(filePath: string, mimeType: string): Promise<string> {
        console.log(`[Gemini] Transcribing audio file: ${filePath}`);
        
        const audioBuffer = fs.readFileSync(filePath);
        const base64Audio = audioBuffer.toString('base64');

        const prompt = `You are a professional legal transcriptionist with expertise in audio analysis and transcription.

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

        try {
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Audio
                    }
                }
            ]);

            const transcription = result.response.text();
            
            if (!transcription || transcription.trim().length < 10) {
                throw new Error('Audio transcription returned insufficient content');
            }

            console.log(`[Gemini] Audio transcription completed, length: ${transcription.length}`);
            return transcription;

        } catch (error) {
            console.error(`[Gemini] Audio transcription failed:`, error);
            throw new Error(`Audio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process visual files (images/videos) for OCR and content analysis
     */
    private async processVisualFile(filePath: string, mimeType: string): Promise<string> {
        console.log(`[Gemini] Analyzing visual file: ${filePath}`);
        
        const fileBuffer = fs.readFileSync(filePath);
        const base64File = fileBuffer.toString('base64');

        const prompt = `You are a professional legal document analyst with expertise in visual content analysis and OCR.

TASK: Analyze this ${mimeType.startsWith('image/') ? 'image' : 'video'} and extract all readable text and relevant visual information for legal case documentation.

REQUIREMENTS:
1. **Complete Text Extraction**: Extract ALL visible text, including:
   - Document headers, titles, and section headings
   - Body text and paragraphs
   - Tables, forms, and structured data
   - Handwritten notes and annotations
   - Signatures and stamps
   - Legal citations and references
   - Dates, names, and case numbers

2. **Visual Content Analysis**: Describe relevant visual elements:
   - Document layout and structure
   - Legal document types (contracts, forms, certificates, etc.)
   - Visual evidence (photos, diagrams, charts)
   - Condition and quality of documents
   - Any markings, stamps, or official seals

3. **Legal Document Focus**: Pay special attention to:
   - Legal terminology and formal language
   - Contract terms and conditions
   - Court documents and legal filings
   - Evidence documentation
   - Official signatures and certifications

4. **Quality Assessment**: Note any issues with:
   - Text readability and clarity
   - Image quality affecting OCR accuracy
   - Partial or obscured content
   - Multiple pages or documents in single image

5. **Structured Output**: Provide:
   - Extracted text content (maintain original formatting where possible)
   - Description of visual elements
   - Assessment of document significance
   - Any concerns about content clarity or completeness

${mimeType.startsWith('video/') ? 
'For videos: Analyze key frames and extract text from relevant scenes. Note any changes in content throughout the video.' : 
'For images: Provide comprehensive OCR and visual analysis of the entire image.'}

Please analyze this file and provide complete text extraction and visual analysis for legal case building.`;

        try {
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64File
                    }
                }
            ]);

            const analysis = result.response.text();
            
            if (!analysis || analysis.trim().length < 10) {
                throw new Error('Visual analysis returned insufficient content');
            }

            console.log(`[Gemini] Visual analysis completed, length: ${analysis.length}`);
            return analysis;

        } catch (error) {
            console.error(`[Gemini] Visual analysis failed:`, error);
            throw new Error(`Visual analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process document files for text extraction and analysis
     */
    private async processDocumentFile(filePath: string, mimeType: string): Promise<string> {
        console.log(`[Gemini] Analyzing document file: ${filePath}`);
        
        const fileBuffer = fs.readFileSync(filePath);
        const base64File = fileBuffer.toString('base64');

        const prompt = `You are a professional legal document analyst with expertise in document processing and text extraction.

TASK: Analyze and extract content from this ${mimeType} document for legal case documentation.

REQUIREMENTS:
1. **Complete Content Extraction**: Extract ALL content including:
   - All visible text and content
   - Document structure and formatting
   - Tables, lists, and structured data
   - Headers, footers, and metadata
   - Embedded text and annotations

2. **Document Analysis**: Provide insights about:
   - Document type and purpose
   - Legal significance and context
   - Key legal terms and references
   - Important dates, names, and details
   - Document structure and organization

3. **Content Processing**: Handle various formats:
   - Text documents with proper formatting preservation
   - Spreadsheets with table structure maintenance
   - Presentations with slide-by-slide content
   - Rich text documents with formatting notes

4. **Legal Focus**: Emphasize:
   - Legal terminology and formal language
   - Contract terms and legal clauses
   - Case references and citations
   - Important dates and deadlines
   - Parties and signatories

5. **Quality Assurance**: Ensure:
   - Complete content extraction
   - Accurate text reproduction
   - Proper formatting preservation
   - Clear identification of document sections

Please analyze this document and provide comprehensive content extraction and analysis for legal case building.`;

        try {
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64File
                    }
                }
            ]);

            const analysis = result.response.text();
            
            if (!analysis || analysis.trim().length < 10) {
                throw new Error('Document analysis returned insufficient content');
            }

            console.log(`[Gemini] Document analysis completed, length: ${analysis.length}`);
            return analysis;

        } catch (error) {
            console.error(`[Gemini] Document analysis failed:`, error);
            throw new Error(`Document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process DOCX files by extracting images and processing them with Gemini OCR
     * This is a special method since Gemini doesn't support DOCX directly
     */
    async processDOCXWithImages(filePath: string, extractedText: string = ''): Promise<GeminiProcessingResult> {
        const startTime = Date.now();
        
        try {
            console.log(`[Gemini] Processing DOCX file with image extraction: ${filePath}`);
            
            // Import yauzl for ZIP extraction (DOCX files are ZIP archives)
            const yauzl = await import('yauzl');
            const path = await import('path');
            
            return new Promise((resolve, reject) => {
                const extractedImages: string[] = [];
                let completedExtractions = 0;
                
                yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
                    if (err) {
                        reject(new Error(`Failed to open DOCX file: ${err.message}`));
                        return;
                    }
                    
                    if (!zipfile) {
                        reject(new Error('Failed to read DOCX file'));
                        return;
                    }
                    
                    zipfile.readEntry();
                    
                    zipfile.on("entry", (entry) => {
                        // Look for images in the media folder
                        if (entry.fileName.startsWith('word/media/') && 
                            (entry.fileName.includes('.png') || 
                             entry.fileName.includes('.jpg') || 
                             entry.fileName.includes('.jpeg'))) {
                            
                            console.log(`[Gemini] Found image in DOCX: ${entry.fileName}`);
                            
                            zipfile.openReadStream(entry, (err, readStream) => {
                                if (err) {
                                    console.warn(`[Gemini] Failed to extract ${entry.fileName}:`, err);
                                    zipfile.readEntry();
                                    return;
                                }
                                
                                if (!readStream) {
                                    zipfile.readEntry();
                                    return;
                                }
                                
                                const chunks: Buffer[] = [];
                                readStream.on('data', (chunk) => chunks.push(chunk));
                                readStream.on('end', async () => {
                                    try {
                                        const imageBuffer = Buffer.concat(chunks);
                                        const base64Image = imageBuffer.toString('base64');
                                        
                                        // Determine MIME type from file extension
                                        const ext = path.extname(entry.fileName).toLowerCase();
                                        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
                                        
                                        // Process the image with Gemini OCR
                                        const imageOCR = await this.processImageBuffer(base64Image, mimeType);
                                        if (imageOCR && imageOCR.trim().length > 0) {
                                            extractedImages.push(`\n--- Image from ${entry.fileName} ---\n${imageOCR}`);
                                        }
                                        
                                    } catch (error) {
                                        console.warn(`[Gemini] Failed to process image ${entry.fileName}:`, error);
                                    }
                                    
                                    completedExtractions++;
                                    zipfile.readEntry();
                                });
                            });
                        } else {
                            zipfile.readEntry();
                        }
                    });
                    
                    zipfile.on("end", async () => {
                        // Wait a bit for any pending image processing
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Combine extracted text with image OCR results
                        let combinedText = extractedText || '';
                        if (extractedImages.length > 0) {
                            combinedText += '\n\n--- EXTRACTED FROM IMAGES ---\n' + extractedImages.join('\n');
                        }
                        
                        if (!combinedText || combinedText.trim().length === 0) {
                            reject(new Error('No text or images could be extracted from DOCX file'));
                            return;
                        }
                        
                        const processingTime = Date.now() - startTime;
                        console.log(`[Gemini] DOCX processing completed, extracted ${extractedImages.length} images, total text length: ${combinedText.length}`);
                        
                        resolve({
                            text: combinedText.trim(),
                            confidence: extractedImages.length > 0 ? 90 : 70,
                            processingTime,
                            method: 'visual_ocr'
                        });
                    });
                });
            });
            
        } catch (error) {
            console.error(`[Gemini] DOCX processing failed:`, error);
            throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process an image buffer directly with Gemini OCR
     */
    private async processImageBuffer(base64Data: string, mimeType: string): Promise<string> {
        const prompt = `Extract all text from this image. This image is from within a legal document (DOCX file). Please provide:

1. **Complete Text Extraction**: Extract all visible text, maintaining structure and formatting where possible
2. **Legal Context**: Pay attention to legal terminology, formal language, and document structure
3. **Quality Notes**: If text is unclear or partially visible, please note this

Provide only the extracted text content:`;

        try {
            const result = await model.generateContent([
                prompt,
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
     * Process with retry logic for better reliability
     */
    async processWithRetry(filePath: string, mimeType: string, maxRetries: number = 3): Promise<GeminiProcessingResult> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Gemini] Processing attempt ${attempt}/${maxRetries} for ${filePath}`);
                return await this.processFile(filePath, mimeType);
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                console.warn(`[Gemini] Attempt ${attempt} failed:`, lastError.message);
                
                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`[Gemini] Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw new Error(`Gemini processing failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
}

// Export singleton instance
export const geminiProcessor = new GeminiProcessor();
