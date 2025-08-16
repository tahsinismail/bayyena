// Test script for comprehensive file type support
const { GeminiProcessor } = require('./dist/services/geminiProcessor');
const { OCRProcessor } = require('./dist/services/ocrProcessor');

async function testFileTypeSupport() {
    console.log('=== Comprehensive File Type Support Test ===\n');
    
    try {
        // Test OCR processor supported types
        const ocrTypes = OCRProcessor.getSupportedTypes();
        console.log(`🔍 OCR Processor supports ${ocrTypes.length} file types:`);
        console.log('Documents:', ocrTypes.filter(t => !t.startsWith('image/') && !t.startsWith('video/')));
        console.log('Images:', ocrTypes.filter(t => t.startsWith('image/')));
        console.log('Videos:', ocrTypes.filter(t => t.startsWith('video/')));
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Test Gemini processor supported types
        const geminiTypes = GeminiProcessor.getSupportedMimeTypes();
        console.log(`🤖 Gemini Processor supports ${geminiTypes.length} file types:`);
        
        const geminiDocs = geminiTypes.filter(t => 
            !t.startsWith('image/') && 
            !t.startsWith('video/') && 
            !t.startsWith('audio/')
        );
        const geminiImages = geminiTypes.filter(t => t.startsWith('image/'));
        const geminiVideos = geminiTypes.filter(t => t.startsWith('video/'));
        const geminiAudio = geminiTypes.filter(t => t.startsWith('audio/'));
        
        console.log('Documents:', geminiDocs);
        console.log('Images:', geminiImages);
        console.log('Videos:', geminiVideos);
        console.log('📱 Audio (NEW):', geminiAudio);
        
        console.log('\n' + '='.repeat(50) + '\n');
        
        // Combined types
        const allTypes = [...new Set([...ocrTypes, ...geminiTypes])];
        console.log(`📊 Total unique supported file types: ${allTypes.length}`);
        
        const allAudio = allTypes.filter(t => t.startsWith('audio/'));
        const allImages = allTypes.filter(t => t.startsWith('image/'));
        const allVideos = allTypes.filter(t => t.startsWith('video/'));
        const allDocs = allTypes.filter(t => 
            !t.startsWith('image/') && 
            !t.startsWith('video/') && 
            !t.startsWith('audio/')
        );
        
        console.log(`📄 Documents: ${allDocs.length} types`);
        console.log(`🖼️  Images: ${allImages.length} types`);
        console.log(`🎥 Videos: ${allVideos.length} types`);
        console.log(`🎵 Audio: ${allAudio.length} types`);
        
        console.log('\n🎵 Audio file types supported:');
        allAudio.forEach(type => {
            const ext = {
                'audio/wav': '.wav',
                'audio/mp3': '.mp3', 
                'audio/aiff': '.aiff',
                'audio/aac': '.aac',
                'audio/ogg': '.ogg',
                'audio/flac': '.flac'
            }[type] || '';
            console.log(`  • ${type}${ext ? ` (${ext})` : ''}`);
        });
        
        console.log('\n✅ File type support test completed successfully!');
        console.log('\nNEW CAPABILITIES:');
        console.log('• 🎵 Audio transcription with Gemini AI');
        console.log('• 📄 Enhanced DOCX processing with fallback to Gemini');
        console.log('• 🖼️  Advanced visual analysis for images and videos');
        console.log('• 📊 Comprehensive Microsoft Office support');
        console.log('• 🔄 Intelligent fallback between OCR and Gemini processing');
        console.log('• ⚡ Retry logic for improved reliability');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testFileTypeSupport();
