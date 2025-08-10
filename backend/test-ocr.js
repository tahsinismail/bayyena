// Simple test script for OCR functionality
const { OCRProcessor } = require('./dist/services/ocrProcessor');

async function testOCR() {
    console.log('Testing OCR functionality...');
    
    try {
        // Test supported file types
        console.log('\nSupported file types:');
        console.log(OCRProcessor.getSupportedTypes());
        
        // Test file type validation
        console.log('\nFile type validation:');
        console.log('PDF:', OCRProcessor.isSupported('application/pdf'));
        console.log('JPEG:', OCRProcessor.isSupported('image/jpeg'));
        console.log('MP4:', OCRProcessor.isSupported('video/mp4'));
        console.log('TXT:', OCRProcessor.isSupported('text/plain'));
        
        console.log('\nOCR test completed successfully!');
    } catch (error) {
        console.error('OCR test failed:', error);
    }
}

testOCR();
