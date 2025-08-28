const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

async function testAdminInterface() {
  const jar = new tough.CookieJar();
  const client = wrapper(axios.create({ jar }));

  const baseURL = 'http://localhost';

  try {
    console.log('Testing admin interface...');

    // First, login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await client.post(`${baseURL}/api/auth/login`, {
      email: 'admin@bayyena.com',
      password: 'admin@Bayyena'
    });

    console.log('Login status:', loginResponse.status);
    console.log('Login response:', loginResponse.data);

    // Test admin dashboard stats
    console.log('\n2. Testing admin dashboard stats...');
    const statsResponse = await client.get(`${baseURL}/api/admin/dashboard-stats`);
    console.log('Stats status:', statsResponse.status);
    console.log('Stats data:', JSON.stringify(statsResponse.data, null, 2));

    // Test user list
    console.log('\n3. Testing user list...');
    const usersResponse = await client.get(`${baseURL}/api/admin/users`);
    console.log('Users status:', usersResponse.status);
    console.log('Users count:', usersResponse.data.length);
    console.log('First user:', JSON.stringify(usersResponse.data[0], null, 2));

    // Test user details view (the main issue we were fixing)
    if (usersResponse.data.length > 0) {
      const userId = usersResponse.data[0].id;
      console.log(`\n4. Testing user details view for user ID: ${userId}...`);
      const userDetailsResponse = await client.get(`${baseURL}/api/admin/users/${userId}`);
      console.log('User details status:', userDetailsResponse.status);
      console.log('User details:', JSON.stringify(userDetailsResponse.data, null, 2));
    }

    console.log('\n✅ All admin interface tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

testAdminInterface();
