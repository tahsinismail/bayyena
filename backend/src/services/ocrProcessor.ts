import fs from 'fs';
import path from 'path';
import { createWorker, Worker, createScheduler, Scheduler } from 'tesseract.js';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

// Check if ffprobe is available
let ffprobeAvailable = false;
try {
  // Simple test to see if ffmpeg can access ffprobe
  ffmpeg.ffprobe('test', (err) => {
    // If we get here, ffprobe is available
    ffprobeAvailable = true;
  });
  // Give it a moment to check
  setTimeout(() => {
    if (!ffprobeAvailable) {
      console.warn('[OCR] FFprobe not available, video processing will be limited');
    }
  }, 100);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.warn('[OCR] FFprobe not available, video processing will be limited:', errorMessage);
}

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export interface VideoFrame {
  timestamp: number;
  text: string;
  confidence: number;
}

export class OCRProcessor {
  private scheduler: Scheduler;
  private workers: Worker[] = [];
  private maxWorkers = 2;

  constructor() {
    this.scheduler = createScheduler();
    this.initializeWorkers();
  }

  private async initializeWorkers() {
    try {
      for (let i = 0; i < this.maxWorkers; i++) {
        const worker = await createWorker('eng+ara', 1, {
          logger: m => console.log(`[OCR Worker ${i}]:`, m),
        });
        this.workers.push(worker);
        this.scheduler.addWorker(worker);
      }
      console.log(`[OCR] Initialized ${this.maxWorkers} workers`);
    } catch (error) {
      console.error('[OCR] Failed to initialize workers:', error);
      throw error;
    }
  }

  /**
   * Process different file types with appropriate OCR methods
   */
  async processFile(filePath: string, mimeType: string): Promise<OCRResult> {
    const startTime = Date.now();
    
    try {
      let result: OCRResult;

      if (mimeType.startsWith('image/')) {
        result = await this.processImage(filePath);
      } else if (mimeType.startsWith('video/')) {
        result = await this.processVideo(filePath);
      } else if (this.isTextBasedDocument(mimeType)) {
        result = await this.processTextDocument(filePath, mimeType);
      } else if (mimeType === 'application/pdf') {
        // PDFs are handled by pdf-parse in documentProcessor
        throw new Error('PDFs should be processed by pdf-parse, not OCR');
      } else {
        throw new Error(`Unsupported file type for OCR: ${mimeType}`);
      }

      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      console.error(`[OCR] Failed to process file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if the file is a text-based document that can be processed directly
   */
  private isTextBasedDocument(mimeType: string): boolean {
    const textBasedTypes = [
      'text/plain',                    // .txt files
      'text/csv',                      // .csv files
      'text/tab-separated-values',     // .tsv files
      'application/vnd.ms-excel',      // .xls files (legacy Excel)
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx files
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx files
      'application/msword',            // .doc files (legacy Word)
      'application/rtf',               // .rtf files
      'text/html',                     // .html files
      'text/xml',                      // .xml files
      'application/json',              // .json files
      'text/markdown',                 // .md files
      'text/yaml',                     // .yml, .yaml files
      'text/javascript',               // .js files
      'text/css'                       // .css files
    ];
    return textBasedTypes.includes(mimeType);
  }

  /**
   * Process text-based documents by reading them directly
   */
  private async processTextDocument(filePath: string, mimeType: string): Promise<OCRResult> {
    try {
      console.log(`[OCR] Processing text document: ${filePath}`);
      
      let text = '';
      
      if (mimeType === 'text/csv' || mimeType === 'text/tab-separated-values') {
        // Handle CSV/TSV files with proper encoding detection
        text = await this.processCSVFile(filePath);
      } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        // For Excel files, we'll read as text (basic support)
        text = await this.processSpreadsheetFile(filePath);
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        // For Word documents, we'll read as text (basic support)
        text = await this.processWordDocument(filePath);
      } else {
        // Standard text files
        text = await this.processTextFile(filePath);
      }

      if (!text.trim()) {
        throw new Error('Text document is empty or contains no readable content');
      }

      return {
        text: text.trim(),
        confidence: 100, // Text documents have 100% confidence since no OCR is needed
        processingTime: 0 // Will be set by caller
      };
    } catch (error) {
      console.error(`[OCR] Text document processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process CSV files with proper encoding detection and cleaning
   */
  private async processCSVFile(filePath: string): Promise<string> {
    try {
      // Try different encodings
      const encodings = ['utf-8', 'utf-16', 'latin1', 'cp1252'];
      let text = '';
      let encodingUsed = '';

      for (const encoding of encodings) {
        try {
          const buffer = fs.readFileSync(filePath);
          text = buffer.toString(encoding as BufferEncoding);
          
          // Check if the text is readable (contains valid characters)
          if (this.isReadableText(text)) {
            encodingUsed = encoding;
            break;
          }
        } catch (err) {
          console.warn(`[OCR] Failed to read CSV with ${encoding} encoding:`, err);
          continue;
        }
      }

      if (!text || !encodingUsed) {
        throw new Error('Failed to read CSV file with any supported encoding');
      }

      console.log(`[OCR] CSV file read successfully with ${encodingUsed} encoding`);
      
      // Clean and format CSV text for better AI processing
      return this.cleanCSVText(text);
    } catch (error) {
      console.error(`[OCR] CSV processing failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process CSV file: ${errorMessage}`);
    }
  }

  /**
   * Process spreadsheet files (Excel)
   */
  private async processSpreadsheetFile(filePath: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      let text = '';

      // Try different encodings for Excel files
      const encodings = ['utf-8', 'latin1', 'cp1252'];
      
      for (const encoding of encodings) {
        try {
          text = buffer.toString(encoding as BufferEncoding);
          if (this.isReadableText(text)) {
            break;
          }
        } catch (err) {
          continue;
        }
      }

      if (!text) {
        throw new Error('Failed to read spreadsheet file with any supported encoding');
      }

      return this.cleanSpreadsheetText(text);
    } catch (error) {
      console.error(`[OCR] Spreadsheet processing failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process spreadsheet file: ${errorMessage}`);
    }
  }

  /**
   * Process Word documents
   */
  private async processWordDocument(filePath: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      let text = '';

      // Try different encodings for Word files
      const encodings = ['utf-8', 'latin1', 'cp1252'];
      
      for (const encoding of encodings) {
        try {
          text = buffer.toString(encoding as BufferEncoding);
          if (this.isReadableText(text)) {
            break;
          }
        } catch (err) {
          continue;
        }
      }

      if (!text) {
        throw new Error('Failed to read Word document with any supported encoding');
      }

      return this.cleanWordDocumentText(text);
    } catch (error) {
      console.error(`[OCR] Word document processing failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process Word document: ${errorMessage}`);
    }
  }

  /**
   * Process standard text files
   */
  private async processTextFile(filePath: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(filePath);
      
      // Try different encodings
      const encodings = ['utf-8', 'utf-16', 'latin1', 'cp1252'];
      let text = '';

      for (const encoding of encodings) {
        try {
          text = buffer.toString(encoding as BufferEncoding);
          if (this.isReadableText(text)) {
            break;
          }
        } catch (err) {
          continue;
        }
      }

      if (!text) {
        throw new Error('Failed to read text file with any supported encoding');
      }

      return text;
    } catch (error) {
      console.error(`[OCR] Text file processing failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to process text file: ${errorMessage}`);
    }
  }

  /**
   * Check if text is readable (contains valid characters)
   */
  private isReadableText(text: string): boolean {
    if (!text || text.length === 0) return false;
    
    // Check if text contains mostly printable characters
    const printableChars = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').length;
    const totalChars = text.length;
    
    // At least 70% should be printable characters
    return (printableChars / totalChars) > 0.7;
  }

  /**
   * Clean CSV text for better AI processing
   */
  private cleanCSVText(csvText: string): string {
    try {
      // Split into lines and clean each line
      const lines = csvText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      // Remove empty lines and clean up
      const cleanedLines = lines
        .map(line => {
          // Remove excessive whitespace
          return line.replace(/\s+/g, ' ').trim();
        })
        .filter(line => line.length > 0);

      return cleanedLines.join('\n');
    } catch (error) {
      console.warn(`[OCR] CSV cleaning failed, returning original text:`, error);
      return csvText;
    }
  }

  /**
   * Clean spreadsheet text for better AI processing
   */
  private cleanSpreadsheetText(text: string): string {
    try {
      // Remove binary content and extract readable text
      const cleaned = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/[^\x20-\x7E\n\t]/g, '') // Keep only printable ASCII characters
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');

      return cleaned || text; // Return original if cleaning results in empty text
    } catch (error) {
      console.warn(`[OCR] Spreadsheet cleaning failed, returning original text:`, error);
      return text;
    }
  }

  /**
   * Clean Word document text for better AI processing
   */
  private cleanWordDocumentText(text: string): string {
    try {
      // Remove Word-specific formatting and control characters
      const cleaned = text
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\r/g, '\n') // Normalize line endings
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');

      return cleaned || text; // Return original if cleaning results in empty text
    } catch (error) {
      console.warn(`[OCR] Word document cleaning failed, returning original text:`, error);
      return text;
    }
  }

  /**
   * Process image files with preprocessing for better OCR results
   */
  private async processImage(filePath: string): Promise<OCRResult> {
    try {
      console.log(`[OCR] Processing image: ${filePath}`);
      
      // Preprocess image for better OCR
      const processedImagePath = await this.preprocessImage(filePath);
      
      // Use scheduler for better performance
      const result = await this.scheduler.addJob('recognize', processedImagePath);
      
      // Clean up processed image
      if (processedImagePath !== filePath) {
        fs.unlinkSync(processedImagePath);
      }

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime: 0 // Will be set by caller
      };
    } catch (error) {
      console.error(`[OCR] Image processing failed:`, error);
      throw error;
    }
  }

  /**
   * Process video files by extracting frames and performing OCR
   */
  private async processVideo(filePath: string): Promise<OCRResult> {
    try {
      console.log(`[OCR] Processing video: ${filePath}`);
      
      // Check if ffprobe is available
      if (!ffprobeAvailable) {
        console.warn('[OCR] FFprobe not available, skipping video processing');
        return {
          text: '[VIDEO] Video processing not available - FFprobe not installed. Please install FFmpeg to enable video OCR.',
          confidence: 0,
          processingTime: 0
        };
      }
      
      const frames = await this.extractVideoFrames(filePath);
      const frameResults: VideoFrame[] = [];
      
      // Process each frame with OCR
      for (const frame of frames) {
        try {
          const result = await this.scheduler.addJob('recognize', frame.path);
          frameResults.push({
            timestamp: frame.timestamp,
            text: result.data.text,
            confidence: result.data.confidence
          });
          
          // Clean up frame file
          fs.unlinkSync(frame.path);
        } catch (error) {
          console.warn(`[OCR] Failed to process frame at ${frame.timestamp}s:`, error);
        }
      }

      // Combine all frame results
      const combinedText = this.combineVideoFrameResults(frameResults);
      const averageConfidence = frameResults.reduce((sum, f) => sum + f.confidence, 0) / frameResults.length;

      return {
        text: combinedText,
        confidence: averageConfidence,
        processingTime: 0 // Will be set by caller
      };
    } catch (error) {
      console.error(`[OCR] Video processing failed:`, error);
      throw error;
    }
  }

  /**
   * Extract frames from video for OCR processing
   */
  private async extractVideoFrames(filePath: string): Promise<Array<{ path: string; timestamp: number }>> {
    return new Promise((resolve, reject) => {
      // Double-check ffprobe availability
      if (!ffprobeAvailable) {
        reject(new Error('FFprobe not available for video processing'));
        return;
      }

      const frames: Array<{ path: string; timestamp: number }> = [];
      const outputDir = path.dirname(filePath);
      const baseName = path.basename(filePath, path.extname(filePath));
      
      // Extract frames every 2 seconds for efficiency
      ffmpeg(filePath)
        .fps(0.5) // 1 frame every 2 seconds
        .on('end', () => {
          resolve(frames);
        })
        .on('error', (err) => {
          console.error('[OCR] Error extracting video frames:', err);
          reject(err);
        })
        .on('filenames', (filenames) => {
          filenames.forEach((filename, index) => {
            const timestamp = index * 2; // 2 seconds per frame
            frames.push({
              path: path.join(outputDir, filename),
              timestamp
            });
          });
        })
        .screenshots({
          count: 10, // Extract max 10 frames
          folder: outputDir,
          filename: `${baseName}-frame-%i.png`
        });
    });
  }

  /**
   * Combine OCR results from multiple video frames
   */
  private combineVideoFrameResults(frameResults: VideoFrame[]): string {
    // Sort by timestamp
    frameResults.sort((a, b) => a.timestamp - b.timestamp);
    
    // Filter out low-confidence results and combine
    const validResults = frameResults
      .filter(frame => frame.confidence > 30) // Only use frames with >30% confidence
      .map(frame => `[${frame.timestamp}s] ${frame.text}`)
      .filter(text => text.trim().length > 0);
    
    return validResults.join('\n\n');
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(filePath: string): Promise<string> {
    try {
      const outputPath = filePath.replace(/\.[^.]+$/, '_processed.png');
      
      await sharp(filePath)
        .resize(2000, 2000, { // Resize to reasonable dimensions
          fit: 'inside',
          withoutEnlargement: true
        })
        .sharpen() // Enhance edges
        .normalize() // Normalize contrast
        .threshold(128) // Convert to black and white for better OCR
        .png()
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      console.warn(`[OCR] Image preprocessing failed, using original:`, error);
      return filePath;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      await this.scheduler.terminate();
      console.log('[OCR] Cleanup completed');
    } catch (error) {
      console.error('[OCR] Cleanup failed:', error);
    }
  }

  /**
   * Get supported file types
   */
  static getSupportedTypes(): string[] {
    return [
      // Documents
      'text/plain',
      'text/csv',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/rtf',
      'text/html',
      'text/xml',
      'application/json',
      'text/markdown',
      'text/yaml',
      'text/javascript',
      'text/css',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/bmp',
      'image/tiff',
      'image/webp',
      // Videos
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm'
    ];
  }

  /**
   * Check if file type is supported for OCR
   */
  static isSupported(mimeType: string): boolean {
    return this.getSupportedTypes().includes(mimeType);
  }

  /**
   * Check if video processing is supported (requires ffprobe)
   */
  static isVideoProcessingSupported(): boolean {
    return ffprobeAvailable;
  }

  /**
   * Check if a specific file type can be processed with current capabilities
   */
  static canProcess(mimeType: string): boolean {
    if (mimeType.startsWith('video/')) {
      return ffprobeAvailable;
    }
    return this.isSupported(mimeType);
  }

  /**
   * Get installation instructions for video processing
   */
  static getVideoProcessingInstructions(): string {
    if (ffprobeAvailable) {
      return 'Video processing is available';
    }
    
    return `Video processing requires FFmpeg to be installed on the system.
    
Installation instructions:
- macOS: brew install ffmpeg
- Ubuntu/Debian: sudo apt update && sudo apt install ffmpeg
- Windows: Download from https://ffmpeg.org/download.html
- Docker: Use an image with FFmpeg pre-installed

After installation, restart the application.`;
  }

  /**
   * Check if OCR result contains meaningful text
   */
  static hasMeaningfulText(text: string, confidence: number): boolean {
    // Remove whitespace and check length
    const cleanText = text.trim();
    
    // If confidence is too low, consider it failed
    if (confidence < 30) {
      return false;
    }
    
    // If text is too short, it's probably not meaningful
    if (cleanText.length < 10) {
      return false;
    }
    
    // Check if text contains mostly readable characters
    const readableChars = cleanText.replace(/[^\w\s.,!?;:()[\]{}"'`~@#$%^&*+=<>/\\|]/g, '').length;
    const totalChars = cleanText.length;
    
    // At least 60% should be readable characters
    if ((readableChars / totalChars) < 0.6) {
      return false;
    }
    
    // Check for common OCR artifacts that indicate failure
    const ocrArtifacts = [
      /^[^\w]*$/, // Only special characters
      /^[a-zA-Z\s]*$/, // Only letters and spaces (no numbers or punctuation)
      /^[0-9\s]*$/, // Only numbers and spaces
      /^[^\w\s]*$/, // Only special characters and spaces
    ];
    
    for (const pattern of ocrArtifacts) {
      if (pattern.test(cleanText)) {
        return false;
      }
    }
    
    return true;
  }
}

// Export singleton instance
export const ocrProcessor = new OCRProcessor();
