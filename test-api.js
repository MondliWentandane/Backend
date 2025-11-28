/**
 * Simple API Test Script
 * Run this with: node test-api.js
 * Make sure your server is running on http://localhost:3000
 */

const BASE_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, endpoint, body = null, token = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    return {
      status: response.status,
      success: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message,
    };
  }
}

async function runTests() {
  log('\n=== API Test Suite ===\n', 'blue');

  // Test 1: Database Connection
  log('Test 1: Database Connection', 'yellow');
  const dbTest = await testEndpoint('GET', '/api/test-db');
  if (dbTest.success) {
    log('✓ Database connection successful', 'green');
  } else {
    log('✗ Database connection failed', 'red');
    log(`  Error: ${dbTest.error || dbTest.data?.error}`, 'red');
  }
  console.log('');

  // Test 2: Get Hotels (Public)
  log('Test 2: Get All Hotels (Public)', 'yellow');
  const hotelsTest = await testEndpoint('GET', '/api/hotels');
  if (hotelsTest.success) {
    log(`✓ Hotels endpoint working (found ${hotelsTest.data?.data?.length || 0} hotels)`, 'green');
  } else {
    log('✗ Hotels endpoint failed', 'red');
    log(`  Status: ${hotelsTest.status}`, 'red');
  }
  console.log('');

  // Test 3: Get Rooms (Public)
  log('Test 3: Get All Rooms (Public)', 'yellow');
  const roomsTest = await testEndpoint('GET', '/api/rooms');
  if (roomsTest.success) {
    log(`✓ Rooms endpoint working (found ${roomsTest.data?.data?.length || 0} rooms)`, 'green');
  } else {
    log('✗ Rooms endpoint failed', 'red');
    log(`  Status: ${roomsTest.status}`, 'red');
  }
  console.log('');

  // Test 4: Signup
  log('Test 4: User Signup', 'yellow');
  const signupData = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
    phone_number: `+123456789${Math.floor(Math.random() * 10)}`,
    role: 'customer',
  };
  const signupTest = await testEndpoint('POST', '/api/auth/signup', signupData);
  let authToken = null;
  if (signupTest.success && signupTest.data?.token) {
    authToken = signupTest.data.token;
    log('✓ Signup successful', 'green');
    log(`  Token received: ${authToken.substring(0, 20)}...`, 'green');
  } else {
    log('✗ Signup failed', 'red');
    log(`  Error: ${signupTest.data?.error || signupTest.error}`, 'red');
  }
  console.log('');

  // Test 5: Get Profile (Authenticated)
  if (authToken) {
    log('Test 5: Get User Profile (Authenticated)', 'yellow');
    const profileTest = await testEndpoint('GET', '/api/users/profile', null, authToken);
    if (profileTest.success) {
      log('✓ Profile endpoint working', 'green');
    } else {
      log('✗ Profile endpoint failed', 'red');
      log(`  Status: ${profileTest.status}`, 'red');
    }
    console.log('');

    // Test 6: Get Notifications (Authenticated)
    log('Test 6: Get Notifications (Authenticated)', 'yellow');
    const notificationsTest = await testEndpoint('GET', '/api/notifications', null, authToken);
    if (notificationsTest.success) {
      log(`✓ Notifications endpoint working (${notificationsTest.data?.stats?.unread || 0} unread)`, 'green');
    } else {
      log('✗ Notifications endpoint failed', 'red');
      log(`  Status: ${notificationsTest.status}`, 'red');
    }
    console.log('');

    // Test 7: Get Favourites (Authenticated)
    log('Test 7: Get Favourites (Authenticated)', 'yellow');
    const favouritesTest = await testEndpoint('GET', '/api/favourites/my-favourites', null, authToken);
    if (favouritesTest.success) {
      log(`✓ Favourites endpoint working (${favouritesTest.data?.data?.length || 0} favourites)`, 'green');
    } else {
      log('✗ Favourites endpoint failed', 'red');
      log(`  Status: ${favouritesTest.status}`, 'red');
    }
    console.log('');
  }

  // Test 8: Health Check (Server Running)
  log('Test 8: Server Health Check', 'yellow');
  try {
    const healthTest = await testEndpoint('GET', '/api/test-db');
    if (healthTest.status > 0) {
      log('✓ Server is running and responding', 'green');
    } else {
      log('✗ Server is not responding', 'red');
      log('  Make sure server is running: npm run dev', 'red');
    }
  } catch (error) {
    log('✗ Server connection failed', 'red');
    log(`  Error: ${error.message}`, 'red');
  }
  console.log('');

  log('=== Test Summary ===', 'blue');
  log('Note: Some tests require authentication or existing data', 'yellow');
  log('For full testing, use Postman with proper authentication tokens\n', 'yellow');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  log('Error: This script requires Node.js 18+ or install node-fetch', 'red');
  log('Install: npm install node-fetch', 'yellow');
  process.exit(1);
}

// Run tests
runTests().catch((error) => {
  log(`\nTest script error: ${error.message}`, 'red');
  process.exit(1);
});



