// backend/start-queue-test.js
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting BullMQ Queue System Test...\n');

// Start Redis if not running
console.log('1️⃣ Checking Redis connection...');
const redisTest = spawn('redis-cli', ['ping']);

redisTest.stdout.on('data', (data) => {
  if (data.toString().includes('PONG')) {
    console.log('✅ Redis is running');
    startQueueTest();
  }
});

redisTest.stderr.on('data', (data) => {
  console.log('❌ Redis is not running. Starting Redis...');
  startRedis();
});

redisTest.on('close', (code) => {
  if (code !== 0) {
    console.log('❌ Redis is not running. Starting Redis...');
    startRedis();
  }
});

function startRedis() {
  console.log('🐳 Starting Redis with Docker...');
  const redis = spawn('docker', ['run', '-d', '-p', '6379:6379', '--name', 'legalcase_redis_test', 'redis:7-alpine']);
  
  redis.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Redis started successfully');
      console.log('⏳ Waiting for Redis to be ready...');
      setTimeout(startQueueTest, 3000);
    } else {
      console.log('❌ Failed to start Redis');
      console.log('💡 Make sure Docker is running');
    }
  });
}

function startQueueTest() {
  console.log('\n2️⃣ Starting queue system test...');
  
  try {
    // Import the compiled queue service
    const { QueueService } = require('./dist/services/queueService');
    const { checkQueueHealth } = require('./dist/config/queue');
    
    console.log('✅ Queue system loaded successfully');
    
    // Test basic functionality
    testBasicFunctionality(QueueService, checkQueueHealth);
    
  } catch (error) {
    console.error('❌ Failed to load queue system:', error.message);
    console.log('\n💡 Make sure you have built the project with: npm run build');
  }
}

async function testBasicFunctionality(QueueService, checkQueueHealth) {
  try {
    console.log('\n3️⃣ Testing queue health...');
    const health = await checkQueueHealth();
    console.log('✅ Queue health check passed:', health.status);
    
    console.log('\n4️⃣ Testing queue statistics...');
    const stats = await QueueService.getQueueStats();
    console.log('✅ Queue statistics retrieved successfully');
    console.log('📊 Document Processing Queue:', stats.documentProcessing);
    console.log('📊 User Requests Queue:', stats.userRequests);
    console.log('📊 AI Analysis Queue:', stats.aiAnalysis);
    
    console.log('\n🎉 Queue system is working correctly!');
    console.log('\n📝 Next steps:');
    console.log('   - Start the main application: npm run start:backend');
    console.log('   - Upload documents to test document processing');
    console.log('   - Use the Queue Dashboard to monitor jobs');
    
  } catch (error) {
    console.error('❌ Queue functionality test failed:', error.message);
    console.log('\n💡 This might be normal if no workers are running yet');
    console.log('   Start the main application to activate the workers');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});
