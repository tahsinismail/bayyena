const axios = require('axios');

async function testDocumentEndpoints() {
  const baseUrl = 'http://localhost';
  
  console.log('Testing document preview and download endpoints...');
  
  // Test with a sample case ID and document ID
  // These would be real IDs in your system
  const caseId = 1;
  const docId = 1;
  
  try {
    // Test preview endpoint
    console.log(`Testing preview endpoint: ${baseUrl}/api/cases/${caseId}/documents/${docId}/preview`);
    const previewResponse = await axios.get(`${baseUrl}/api/cases/${caseId}/documents/${docId}/preview`, {
      validateStatus: (status) => status < 500 // Accept all status codes except server errors
    });
    console.log(`Preview endpoint status: ${previewResponse.status}`);
    
    // Test download endpoint
    console.log(`Testing download endpoint: ${baseUrl}/api/cases/${caseId}/documents/${docId}/download`);
    const downloadResponse = await axios.get(`${baseUrl}/api/cases/${caseId}/documents/${docId}/download`, {
      validateStatus: (status) => status < 500 // Accept all status codes except server errors
    });
    console.log(`Download endpoint status: ${downloadResponse.status}`);
    
    if (previewResponse.status === 401 && downloadResponse.status === 401) {
      console.log('✅ Both endpoints are properly protected and responding (401 Unauthorized as expected)');
    } else {
      console.log('⚠️  Unexpected status codes:', {
        preview: previewResponse.status,
        download: downloadResponse.status
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

testDocumentEndpoints();
