const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

async function testAdminRouteProtection() {
  const jar = new tough.CookieJar();
  const client = wrapper(axios.create({ jar }));

  const baseURL = 'http://localhost';

  console.log('🛡️  Testing Admin Route Protection...\n');

  // Test 1: Try to access admin routes without authentication
  console.log('1️⃣ Testing admin route access without authentication...');
  try {
    const response = await client.get(`${baseURL}/admin`);
    console.log('❌ This should not succeed - admin routes should require authentication');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly blocked - authentication required');
    } else {
      console.log('ℹ️  Got different response:', error.response?.status, error.response?.statusText);
    }
  }

  // Test 2: Try to access admin API endpoints without admin role
  console.log('\n2️⃣ Testing admin API access without admin role...');
  try {
    // First login as regular user (assuming there's a regular user)
    const loginResponse = await client.post(`${baseURL}/api/auth/login`, {
      email: 'tahsinismail.dev@gmail.com',
      password: 'somepassword' // This will likely fail, but that's ok for testing
    });

    if (loginResponse.status === 200) {
      console.log('✅ Logged in as regular user');

      // Now try to access admin API
      const adminApiResponse = await client.get(`${baseURL}/api/admin/dashboard-stats`);
      console.log('❌ This should not succeed - regular users should not access admin APIs');
    } else {
      console.log('ℹ️  Could not login as regular user (expected if password is wrong)');
    }
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Correctly blocked - admin role required for admin APIs');
    } else if (error.response?.status === 401) {
      console.log('ℹ️  Authentication failed (expected if password is wrong)');
    } else {
      console.log('ℹ️  Got different response:', error.response?.status, error.response?.data?.message);
    }
  }

  // Test 3: Try to access admin API with admin user
  console.log('\n3️⃣ Testing admin API access with admin role...');
  try {
    const adminLoginResponse = await client.post(`${baseURL}/api/auth/login`, {
      email: 'admin@bayyena.com',
      password: 'admin@Bayyena'
    });

    if (adminLoginResponse.status === 200) {
      console.log('✅ Logged in as admin user');

      // Now try to access admin API
      const adminApiResponse = await client.get(`${baseURL}/api/admin/dashboard-stats`);
      if (adminApiResponse.status === 200) {
        console.log('✅ Admin API access successful for admin user');
      } else {
        console.log('❌ Admin API access failed for admin user:', adminApiResponse.status);
      }
    } else {
      console.log('❌ Could not login as admin user');
    }
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.status, error.response?.data?.message);
  }

  console.log('\n🎉 Admin route protection testing completed!');
}

testAdminRouteProtection();
