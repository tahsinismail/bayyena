// test-user-details.js
const axios = require('axios');

// Configure axios to use the correct base URL (internal container address)
const baseURL = 'http://backend:3001';
axios.defaults.baseURL = baseURL;

// Store cookies for session management
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const cookieJar = new CookieJar();
const client = wrapper(axios.create({ jar: cookieJar, baseURL }));

async function testUserDetails() {
  try {
    console.log('🔐 Logging in as admin...');

    // Login as admin
    const loginResponse = await client.post('/api/auth/login', {
      email: 'admin@bayyena.com',
      password: 'admin@Bayyena'
    });

    console.log('✅ Login successful:', loginResponse.data.user.email);

    console.log('\n👤 Testing user details endpoint...');

    // Test user details endpoint
    const userResponse = await client.get('/api/admin/users/1');
    console.log('✅ User details:', JSON.stringify(userResponse.data, null, 2));

    console.log('\n🎉 User details endpoint is working correctly!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testUserDetails();
