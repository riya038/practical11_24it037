const request = require('supertest');
const app = require('../server');

describe('Practical 12: Automated CI/CD Pipeline API Tests', () => {
  // Test 1: Main API Status Endpoint (Health Check)
  test('GET / returns status 200 and API details', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe('1.0.0');
  });

  // Test 2: Supplementary Problem - Second endpoint covering cache statistics
  test('GET /cache/stats returns status 200 and cache performance metrics', async () => {
    const res = await request(app).get('/cache/stats');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  // Test 3: Authentication Security Verification
  test('GET /tasks without authentication token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

