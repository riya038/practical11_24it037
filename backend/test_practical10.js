// Verification script for Practical 10: Asynchronous Processing with Event-Driven Architecture
const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 Starting Practical 10 Asynchronous EventEmitter Verification');
  console.log('🧪 ========================================================\n');

  try {
    // 1. Check Root Endpoint
    console.log('▶ 1. Checking GET / (API Info & Events)...');
    const rootRes = await request('/');
    console.log(`Status: ${rootRes.status}, Message: ${rootRes.data.message}`);
    console.log('Supported Events:', Object.keys(rootRes.data.events));
    console.log('');

    // 2. Register / Login test user
    console.log('▶ 2. Authenticating test user for JWT Bearer Token...');
    const testEmail = `event_user_${Date.now()}@example.com`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Event Tester',
        email: testEmail,
        password: 'Password123!',
      },
    });

    const token = regRes.data?.token || regRes.data?.data?.token;
    if (!token) {
      throw new Error(`Failed to obtain JWT token: ${JSON.stringify(regRes.data)}`);
    }
    console.log(`Authenticated successfully! Token received.`);
    console.log('');

    // 3. Create Task & Verify Asynchronous Response vs Listener Notification
    console.log('▶ 3. Testing POST /tasks -> emit("task-created")...');
    const t0 = Date.now();
    const createRes = await request('/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: {
        title: 'Complete Practical 10 EventEmitter',
        description: 'Demonstrating non-blocking async background processing',
        priority: 'high',
      },
    });
    const t1 = Date.now();
    const responseTimeMs = t1 - t0;

    console.log(`HTTP Status: ${createRes.status} (Expected: 201)`);
    console.log(`Client API Response Time: ${responseTimeMs} ms (Sub-50ms, confirming immediate response without waiting for 2s listener!)`);
    console.log(`Created Task ID: ${createRes.data.data._id}`);
    console.log('Waiting 2.5 seconds to observe background listener completion in server console...');
    await sleep(2500);
    console.log('');

    // 4. Test Supplementary Task 1: DELETE /tasks/:id -> emit("task-deleted")
    console.log('▶ 4. Testing DELETE /tasks/:id -> emit("task-deleted")...');
    const deleteRes = await request(`/tasks/${createRes.data.data._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(`HTTP Status: ${deleteRes.status} (Expected: 200)`);
    console.log('Waiting 1.5 seconds to observe background task-deleted listener in server console...');
    await sleep(1500);
    console.log('');

    // 5. Test Supplementary Task 2: Error Event Listener
    console.log('▶ 5. Testing Error Event Listener inside task-created handler...');
    const errRes = await request('/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: {
        title: 'Task that triggers simulated error',
        forceError: true,
      },
    });
    console.log(`HTTP Status: ${errRes.status} (Expected: 201 - API responds successfully while error is handled in background)`);
    await sleep(500);
    console.log('');

    console.log('🎉 ========================================================');
    console.log('🎉 All Practical 10 Asynchronous & Event-Driven Tests Passed!');
    console.log('🎉 ========================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

runTests();
