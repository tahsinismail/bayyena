#!/usr/bin/env node

// Test script to verify loadChatTopics caching
// This simulates multiple concurrent calls to test the deduplication

const https = require('https');

// Simulate multiple calls to loadChatTopics
async function testConcurrentCalls() {
  console.log('Testing concurrent loadChatTopics calls...');

  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(makeAPICall(i));
  }

  try {
    const results = await Promise.all(promises);
    console.log('All calls completed');
    console.log('Results:', results);
  } catch (error) {
    console.error('Error in test:', error);
  }
}

function makeAPICall(callNumber) {
  return new Promise((resolve, reject) => {
    console.log(`Making API call ${callNumber}...`);

    const options = {
      hostname: 'localhost',
      port: 443,
      path: '/api/chat-topics/14',
      method: 'GET',
      rejectUnauthorized: false, // For self-signed cert
      headers: {
        'User-Agent': 'TestScript'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`Call ${callNumber} completed with status ${res.statusCode}`);
        resolve({ callNumber, status: res.statusCode, data: data.substring(0, 100) });
      });
    });

    req.on('error', (error) => {
      console.error(`Call ${callNumber} failed:`, error.message);
      reject(error);
    });

    req.end();
  });
}

// Run the test
testConcurrentCalls();
