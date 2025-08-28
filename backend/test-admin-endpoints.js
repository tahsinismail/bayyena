// test-admin-endpoints.js
const axios = require('axios');

// Configure axios to use the correct base URL (internal container address)
const baseURL = 'http://backend:3001';
axios.defaults.baseURL = baseURL;

// Store cookies for session management
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cookieJar = new CookieJar();
const client = wrapper(axios.create({ jar: cookieJar, baseURL }));

async function testAdminEndpoints() {
  try {
    console.log('🔐 Logging in as admin...');

    // Login as admin
    const loginResponse = await client.post('/api/auth/login', {
      email: 'admin@bayyena.com',
      password: 'admin@Bayyena'
    });

    console.log('✅ Login successful:', loginResponse.data.user.email);

    console.log('\n📊 Testing dashboard stats endpoint...');

    // Test dashboard stats
    const statsResponse = await client.get('/api/admin/dashboard-stats');
    console.log('✅ Dashboard stats:', JSON.stringify(statsResponse.data, null, 2));

    console.log('\n📋 Testing admin activity endpoint...');

    // Test admin activity
    const activityResponse = await client.get('/api/admin/admin-activity');
    console.log('✅ Admin activity count:', activityResponse.data.length);
    if (activityResponse.data.length > 0) {
      console.log('First activity:', JSON.stringify(activityResponse.data[0], null, 2));
    }

    console.log('\n👥 Testing users endpoint...');

    // Test users endpoint
    const usersResponse = await client.get('/api/admin/users');
    console.log('✅ Users count:', usersResponse.data.length);
    if (usersResponse.data.length > 0) {
      console.log('First user:', JSON.stringify(usersResponse.data[0], null, 2));
    }

    console.log('\n🎉 All admin endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminEndpoints();
