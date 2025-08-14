// backend/test-queue.js
const { QueueService } = require('./dist/services/queueService');
const { checkQueueHealth } = require('./dist/config/queue');

async function testQueueSystem() {
  console.log('🧪 Testing BullMQ Queue System...\n');

  try {
    // Test 1: Check queue health
    console.log('1️⃣ Testing queue health check...');
    const health = await checkQueueHealth();
    console.log('✅ Queue health:', health.status);
    console.log('📊 Queue details:', JSON.stringify(health.queues, null, 2));
    console.log('');

    // Test 2: Get queue statistics
    console.log('2️⃣ Testing queue statistics...');
    const stats = await QueueService.getQueueStats();
    console.log('✅ Queue stats retrieved successfully');
    console.log('📈 Document Processing:', stats.documentProcessing);
    console.log('📈 User Requests:', stats.userRequests);
    console.log('📈 AI Analysis:', stats.aiAnalysis);
    console.log('');

    // Test 3: Submit a test user request job
    console.log('3️⃣ Testing user request job submission...');
    const userRequestResult = await QueueService.submitUserRequestJob({
      requestId: `test-req-${Date.now()}`,
      userId: 1,
      caseId: 1,
      requestType: 'case_analysis',
      requestData: {
        caseDetails: 'Test case for queue system verification',
        caseType: 'Civil Dispute',
        priority: 'medium'
      },
      priority: 'medium'
    });
    console.log('✅ User request job submitted:', userRequestResult.jobId);
    console.log('');

    // Test 4: Submit a test AI analysis job
    console.log('4️⃣ Testing AI analysis job submission...');
    const aiAnalysisResult = await QueueService.submitAIAnalysisJob({
      analysisId: `test-ai-${Date.now()}`,
      documentId: 1,
      caseId: 1,
      analysisType: 'legal_review',
      content: 'Test document content for AI analysis verification',
      context: { caseType: 'civil', jurisdiction: 'test' }
    });
    console.log('✅ AI analysis job submitted:', aiAnalysisResult.jobId);
    console.log('');

    // Test 5: Check job status
    console.log('5️⃣ Testing job status check...');
    const userRequestStatus = await QueueService.getJobStatus('user-requests', userRequestResult.jobId);
    console.log('✅ User request job status:', userRequestStatus.status);
    
    const aiAnalysisStatus = await QueueService.getJobStatus('ai-analysis', aiAnalysisResult.jobId);
    console.log('✅ AI analysis job status:', aiAnalysisStatus.status);
    console.log('');

    console.log('🎉 All queue tests completed successfully!');
    console.log('\n📝 Note: Jobs will be processed by the workers when the application is running.');
    console.log('   You can monitor them using the Queue Dashboard or API endpoints.');

  } catch (error) {
    console.error('❌ Queue test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Make sure Redis is running and accessible.');
      console.log('   You can start Redis with: docker run -d -p 6379:6379 redis:7-alpine');
    }
  }
}

// Run the test
testQueueSystem().catch(console.error);
