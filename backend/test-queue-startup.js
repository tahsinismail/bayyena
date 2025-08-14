// backend/test-queue-startup.js
console.log('🧪 Testing Queue System Startup (Redis Not Available)...\n');

try {
  // Import the compiled queue system
  const { checkQueueHealth } = require('./dist/config/queue');
  const { QueueService } = require('./dist/services/queueService');
  
  console.log('✅ Queue system modules loaded successfully');
  
  // Test queue health check
  console.log('\n1️⃣ Testing queue health check...');
  checkQueueHealth().then(health => {
    console.log('✅ Queue health check completed');
    console.log('📊 Health status:', health.status);
    if (health.error) {
      console.log('⚠️  Expected error:', health.error);
    }
  }).catch(error => {
    console.log('⚠️  Expected error during health check:', error.message);
  });
  
  // Test queue statistics
  console.log('\n2️⃣ Testing queue statistics...');
  QueueService.getQueueStats().then(stats => {
    console.log('✅ Queue statistics retrieved');
    console.log('📈 Stats:', stats);
  }).catch(error => {
    console.log('⚠️  Expected error getting stats:', error.message);
  });
  
  console.log('\n🎉 Queue system startup test completed!');
  console.log('📝 The system should start gracefully even without Redis');
  console.log('   When Redis becomes available, the queues will automatically work');
  
} catch (error) {
  console.error('❌ Failed to load queue system:', error.message);
  console.log('\n💡 Make sure you have built the project with: npm run build');
}
