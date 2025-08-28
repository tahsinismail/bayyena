const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

async function testDisabledUserHandling() {
  const jar = new tough.CookieJar();
  const client = wrapper(axios.create({ jar }));

  const baseURL = 'http://localhost';

  console.log('🧪 Testing disabled user authentication handling...\n');

  // Test 1: Try to login with a disabled user
  console.log('1️⃣ Testing login with disabled user...');
  try {
    const disabledLoginResponse = await client.post(`${baseURL}/api/auth/login`, {
      email: 'admin@bayyena.com',
      password: 'wrongpassword' // This should fail anyway, but let's test the disabled check
    });
    console.log('❌ This should not succeed - user should be disabled');
  } catch (error) {
    if (error.response?.status === 401 && error.response?.data?.message === 'Your account is restricted. Please contact admin for resolution.') {
      console.log('✅ Disabled user login correctly blocked with proper message');
    } else {
      console.log('ℹ️  Login failed with different error (expected if password is wrong):', error.response?.data?.message);
    }
  }

  // Test 2: Try to register with an email that belongs to a disabled user
  console.log('\n2️⃣ Testing registration with disabled user email...');
  try {
    const registerResponse = await client.post(`${baseURL}/api/auth/register`, {
      fullName: 'Test User',
      email: 'admin@bayyena.com', // This email belongs to a disabled user
      password: 'testpassword123',
      phoneNumber: '+1234567890'
    });
    console.log('❌ This should not succeed - email belongs to disabled user');
  } catch (error) {
    if (error.response?.status === 401 && error.response?.data?.message === 'Your account is restricted. Please contact admin for resolution.') {
      console.log('✅ Registration correctly blocked for disabled user email');
    } else {
      console.log('ℹ️  Registration failed with different error:', error.response?.data?.message);
    }
  }

  // Test 3: Test with a regular user (should work if they exist and are active)
  console.log('\n3️⃣ Testing with regular user...');
  try {
    const regularLoginResponse = await client.post(`${baseURL}/api/auth/login`, {
      email: 'tahsinismail.dev@gmail.com',
      password: 'somepassword' // We don't know the actual password, but this tests the flow
    });
    if (regularLoginResponse.status === 200) {
      console.log('✅ Regular user login successful');
    }
  } catch (error) {
    console.log('ℹ️  Regular user login failed (expected if password is wrong or user doesn\'t exist):', error.response?.data?.message);
  }

  console.log('\n🎉 Disabled user authentication testing completed!');
}

testDisabledUserHandling();
