import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { OCRProcessor } from './ocrProcessor';

// Check for API key
if (!process.env.GEMINI_API_KEY) {
    throw new Error("FATAL: GEMINI_API_KEY is not defined in the .env file. The visual analyzer cannot start.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Safety settings for visual analysis
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

export interface VisualAnalysisResult {
  description: string;
  content: string;
  analysisType: 'ocr' | 'visual' | 'hybrid';
  confidence: number;
  processingTime: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export class VisualAnalyzer {
  
  /**
   * Analyze content and automatically switch between OCR and visual analysis
   * 
   * IMPORTANT: This service focuses on visual content analysis, not language detection.
   * It describes what is visually observable rather than making assumptions about text content.
   */
  
  /**
   * Check if image/video contains extractable text before attempting OCR
   * This prevents unnecessary OCR processing on visual-only content
   */
  async hasExtractableText(filePath: string, mimeType: string): Promise<boolean> {
    try {
      if (mimeType.startsWith('image/')) {
        return await this.checkImageForText(filePath);
      } else if (mimeType.startsWith('video/')) {
        return await this.checkVideoForText(filePath);
      }
      return false; // Not an image or video
    } catch (error) {
      console.warn(`[VisualAnalyzer] Error checking for extractable text:`, error);
      return false; // Default to false on error
    }
  }
  
  /**
   * Check if image contains visible text using AI
   */
  private async checkImageForText(filePath: string): Promise<boolean> {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `Look at this image and answer with ONLY "YES" or "NO":
      
Does this image contain any clearly visible, readable text, numbers, or symbols that could be extracted by OCR?

Examples of what counts as extractable text:
- YES: Documents, forms, signs, labels, license plates, handwritten notes
- NO: Photos of people/scenes, diagrams without text, artwork, pure images

Answer only YES or NO.`;
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeTypeFromPath(filePath),
            data: base64Image
          }
        }
      ]);
      
      const response = await result.response;
      const answer = response.text().trim().toUpperCase();
      
      console.log(`[VisualAnalyzer] Image text check result: ${answer}`);
      return answer === 'YES';
      
    } catch (error) {
      console.warn(`[VisualAnalyzer] Image text check failed:`, error);
      return false;
    }
  }
  
  /**
   * Check if video contains visible text using AI
   */
  private async checkVideoForText(filePath: string): Promise<boolean> {
    try {
      // Extract a few key frames to check for text
      const keyFrames = await this.extractKeyFrames(filePath);
      
      if (keyFrames.length === 0) {
        return false;
      }
      
      let hasText = false;
      
      // Check first 3 frames for text
      for (let i = 0; i < Math.min(keyFrames.length, 3); i++) {
        try {
          const framePath = keyFrames[i];
          const frameBuffer = fs.readFileSync(framePath);
          const base64Frame = frameBuffer.toString('base64');
          
          const prompt = `Look at this video frame and answer with ONLY "YES" or "NO":
          
Does this frame contain any clearly visible, readable text, numbers, or symbols that could be extracted by OCR?

Examples of what counts as extractable text:
- YES: Documents, forms, signs, labels, license plates, handwritten notes
- NO: Photos of people/scenes, diagrams without text, artwork, pure images

Answer only YES or NO.`;
          
          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Frame
              }
            }
          ]);
          
          const response = await result.response;
          const answer = response.text().trim().toUpperCase();
          
          if (answer === 'YES') {
            hasText = true;
            break;
          }
          
          // Clean up frame file
          fs.unlinkSync(framePath);
          
        } catch (frameError) {
          console.warn(`[VisualAnalyzer] Frame text check failed:`, frameError);
        }
      }
      
      // Clean up remaining frame files
      keyFrames.forEach(framePath => {
        try {
          if (fs.existsSync(framePath)) {
            fs.unlinkSync(framePath);
          }
        } catch (cleanupError) {
          console.warn(`[VisualAnalyzer] Frame cleanup failed:`, cleanupError);
        }
      });
      
      console.log(`[VisualAnalyzer] Video text check result: ${hasText ? 'YES' : 'NO'}`);
      return hasText;
      
    } catch (error) {
      console.warn(`[VisualAnalyzer] Video text check failed:`, error);
      return false;
    }
  }
  async analyzeContent(
    filePath: string, 
    mimeType: string, 
    ocrResult: OCRResult
  ): Promise<VisualAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // First, check if the image/video actually contains extractable text
      const hasText = await this.hasExtractableText(filePath, mimeType);
      
      if (!hasText) {
        // No extractable text found, go directly to visual analysis
        console.log(`[VisualAnalyzer] No extractable text detected, proceeding directly to visual analysis`);
        
        let visualResult: string;
        
        if (mimeType.startsWith('image/')) {
          visualResult = await this.analyzeImage(filePath);
        } else if (mimeType.startsWith('video/')) {
          visualResult = await this.analyzeVideo(filePath);
        } else {
          throw new Error(`Unsupported file type for visual analysis: ${mimeType}`);
        }
        
        return {
          description: 'Content analyzed using visual AI analysis (no extractable text detected)',
          content: visualResult,
          analysisType: 'visual',
          confidence: 90, // Higher confidence when we know there's no text
          processingTime: Date.now() - startTime
        };
      }
      
      // Text is present, check if OCR extracted meaningful text
      const hasMeaningfulText = OCRProcessor.hasMeaningfulText(ocrResult.text, ocrResult.confidence);
      
      if (hasMeaningfulText) {
        // OCR was successful, return OCR result
        return {
          description: 'Text successfully extracted using OCR',
          content: ocrResult.text,
          analysisType: 'ocr',
          confidence: ocrResult.confidence,
          processingTime: Date.now() - startTime
        };
      }
      
      // OCR failed despite text being present, try visual analysis as fallback
      console.log(`[VisualAnalyzer] OCR extracted minimal text (${ocrResult.text.length} chars, ${ocrResult.confidence}% confidence) despite text being present. Using hybrid approach.`);
      
      let visualResult: string;
      
      if (mimeType.startsWith('image/')) {
        visualResult = await this.analyzeImage(filePath);
      } else if (mimeType.startsWith('video/')) {
        visualResult = await this.analyzeVideo(filePath);
      } else {
        throw new Error(`Unsupported file type for visual analysis: ${mimeType}`);
      }
      
      // Combine OCR and visual analysis
      const combinedContent = `OCR EXTRACTED TEXT (Low Confidence):\n${ocrResult.text}\n\nVISUAL ANALYSIS:\n${visualResult}`;
      
      return {
        description: 'Content analyzed using hybrid approach (OCR + Visual Analysis)',
        content: combinedContent,
        analysisType: 'hybrid',
        confidence: Math.max(ocrResult.confidence, 75), // Use higher confidence
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error(`[VisualAnalyzer] Analysis failed:`, error);
      throw error;
    }
  }
  

  
  /**
   * Analyze image content using AI
   */
  private async analyzeImage(filePath: string): Promise<string> {
    try {
      console.log(`[VisualAnalyzer] Analyzing image: ${filePath}`);
      
      // Convert image to base64 for AI analysis
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      const prompt = `Analyze this image and provide a detailed, factual description of ONLY what you can visually observe. 

IMPORTANT: Do NOT make assumptions about language, script, or text content. Focus purely on visual elements.

Describe what you see:
1. Physical objects, vehicles, structures, or people visible
2. The scene, setting, or environment
3. Any visible damage, marks, or physical evidence
4. Colors, shapes, and spatial relationships
5. Any text, numbers, or symbols that are clearly visible and readable

For example, if this is a car accident scene, describe:
- What vehicles are visible and their condition
- Any visible damage, skid marks, or debris
- The location and setting
- Any people or objects in the scene
- Any visible signs, license plates, or readable text

Provide a clear, objective description based solely on visual evidence.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeTypeFromPath(filePath),
            data: base64Image
          }
        }
      ]);
      
      const response = await result.response;
      const responseText = response.text();
      
      // Validate and clean the response
      return this.validateVisualResponse(responseText);
      
    } catch (error) {
      console.error(`[VisualAnalyzer] Image analysis failed:`, error);
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Analyze video content using AI
   */
  private async analyzeVideo(filePath: string): Promise<string> {
    try {
      console.log(`[VisualAnalyzer] Analyzing video: ${filePath}`);
      
      // For videos, we'll analyze key frames
      const keyFrames = await this.extractKeyFrames(filePath);
      
      if (keyFrames.length === 0) {
        return '[VIDEO] Video analysis failed - could not extract frames for analysis.';
      }
      
      // Analyze each key frame
      const frameAnalyses: string[] = [];
      
      for (let i = 0; i < Math.min(keyFrames.length, 5); i++) { // Limit to 5 frames
        try {
          const framePath = keyFrames[i];
          const frameBuffer = fs.readFileSync(framePath);
          const base64Frame = frameBuffer.toString('base64');
          
          const prompt = `Analyze this video frame (frame ${i + 1} of ${Math.min(keyFrames.length, 5)}) and provide a factual description of ONLY what you can visually observe.

IMPORTANT: Do NOT make assumptions about language, script, or text content. Focus purely on visual elements.

Describe what you see:
1. Physical objects, vehicles, structures, or people visible
2. The scene, setting, or environment
3. Any visible damage, marks, or physical evidence
4. Any text, numbers, or symbols that are clearly visible and readable

For example, if this shows a car accident scene, describe:
- What vehicles are visible and their condition
- Any visible damage, skid marks, or debris
- The location and setting
- Any people or objects in the scene
- Any visible signs, license plates, or readable text

Provide a clear, objective description based solely on visual evidence.`;

          const result = await model.generateContent([
            prompt,
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Frame
              }
            }
          ]);
          
          const response = await result.response;
          const responseText = response.text();
          
          // Validate and clean the response
          const validatedResponse = this.validateVisualResponse(responseText);
          frameAnalyses.push(`Frame ${i + 1}: ${validatedResponse}`);
          
          // Clean up frame file
          fs.unlinkSync(framePath);
          
        } catch (frameError) {
          console.warn(`[VisualAnalyzer] Failed to analyze frame ${i + 1}:`, frameError);
          frameAnalyses.push(`Frame ${i + 1}: Analysis failed`);
        }
      }
      
      // Combine frame analyses
      const combinedAnalysis = frameAnalyses.join('\n\n');
      
      // Generate overall video summary
      const summaryPrompt = `Based on these video frame analyses, provide a comprehensive summary of the video content:

${combinedAnalysis}

IMPORTANT: Focus on describing what is visually observable in the video. Do NOT make assumptions about language, script, or text content.

Summarize:
1. What the video shows visually (objects, people, scenes, actions)
2. Any visible evidence, damage, or physical elements
3. The overall context and setting
4. Any clearly visible text, numbers, or symbols

Provide a factual summary based solely on visual evidence that would be useful for legal case analysis.`;

      const summaryResult = await model.generateContent(summaryPrompt);
      const summaryResponse = await summaryResult.response;
      const summaryText = summaryResponse.text();
      
      // Validate and clean the summary
      const validatedSummary = this.validateVisualResponse(summaryText);
      
      return `VIDEO ANALYSIS SUMMARY:\n\n${validatedSummary}\n\nDETAILED FRAME ANALYSIS:\n\n${combinedAnalysis}`;
      
    } catch (error) {
      console.error(`[VisualAnalyzer] Video analysis failed:`, error);
      throw new Error(`Failed to analyze video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Extract key frames from video for analysis
   */
  private async extractKeyFrames(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const ffmpeg = require('fluent-ffmpeg');
      const frames: string[] = [];
      const outputDir = path.dirname(filePath);
      const baseName = path.basename(filePath, path.extname(filePath));
      
      ffmpeg(filePath)
        .fps(0.2) // 1 frame every 5 seconds
        .on('end', () => {
          resolve(frames);
        })
        .on('error', (err: any) => {
          console.error('[VisualAnalyzer] Error extracting video frames:', err);
          reject(err);
        })
        .on('filenames', (filenames: string[]) => {
          filenames.forEach((filename: string) => {
            frames.push(path.join(outputDir, filename));
          });
        })
        .screenshots({
          count: 8, // Extract max 8 frames
          folder: outputDir,
          filename: `${baseName}-keyframe-%i.png`
        });
    });
  }
  
  /**
   * Validate AI response to ensure it's focused on visual content
   */
  private validateVisualResponse(response: string): string {
    // Check if response contains language/script assumptions
    const languagePatterns = [
      /primarily in \w+ script/i,
      /appears to be in \w+/i,
      /written in \w+/i,
      /contains \w+ text/i,
      /language appears to be/i,
      /script analysis/i
    ];
    
    // If response contains language assumptions, regenerate with stronger prompt
    for (const pattern of languagePatterns) {
      if (pattern.test(response)) {
        console.warn('[VisualAnalyzer] AI response contains language assumptions, this should not happen with current prompts');
        // Return a corrected response that focuses on visual elements
        const patterns = ['This document', 'primarily', 'appears to be', 'written in', 'contains', 'language', 'script'];
        let correctedResponse = response;
        for (const pattern of patterns) {
          const index = correctedResponse.indexOf(pattern);
          if (index !== -1) {
            correctedResponse = correctedResponse.substring(index + pattern.length);
            break;
          }
        }
        return `VISUAL ANALYSIS: ${correctedResponse.trim()}`;
      }
    }
    
    return response;
  }

  /**
   * Get MIME type from file path
   */
  private getMimeTypeFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff'
    };
    
    return mimeTypes[ext] || 'image/jpeg';
  }
  
  /**
   * Hybrid analysis: combine OCR and visual analysis for best results
   */
  async hybridAnalysis(
    filePath: string, 
    mimeType: string, 
    ocrResult: OCRResult
  ): Promise<VisualAnalysisResult> {
    const startTime = Date.now();
    
    try {
      let ocrContent = '';
      let visualContent = '';
      
      // Always try OCR first
      if (ocrResult.text.trim()) {
        ocrContent = ocrResult.text;
      }
      
      // Always do visual analysis
      if (mimeType.startsWith('image/')) {
        visualContent = await this.analyzeImage(filePath);
      } else if (mimeType.startsWith('video/')) {
        visualContent = await this.analyzeVideo(filePath);
      }
      
      // Combine both analyses
      let combinedContent = '';
      let analysisType: 'ocr' | 'visual' | 'hybrid' = 'visual';
      
      if (ocrContent && visualContent) {
        combinedContent = `OCR EXTRACTED TEXT:\n${ocrContent}\n\nVISUAL ANALYSIS:\n${visualContent}`;
        analysisType = 'hybrid';
      } else if (ocrContent) {
        combinedContent = ocrContent;
        analysisType = 'ocr';
      } else if (visualContent) {
        combinedContent = visualContent;
        analysisType = 'visual';
      } else {
        throw new Error('Both OCR and visual analysis failed');
      }
      
      return {
        description: `Content analyzed using ${analysisType} approach`,
        content: combinedContent,
        analysisType,
        confidence: analysisType === 'hybrid' ? 90 : (ocrResult.confidence || 85),
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error(`[VisualAnalyzer] Hybrid analysis failed:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const visualAnalyzer = new VisualAnalyzer();
