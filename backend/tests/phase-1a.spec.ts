import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

// ── Shared state across tests ──
let accessToken: string;
let refreshToken: string;
let userId: string;

const testUser = {
  email: `test-${Date.now()}@emblue.dev`,
  password: 'StrongP@ss123',
  firstName: 'Test',
  lastName: 'User',
  companyName: 'Test Corp',
};

test.describe.serial('Phase 1A — Foundation & Bootstrap', () => {
  // ── Health ──
  test('GET /health → 200, status ok', async ({ request }) => {
    const res = await request.get(`${BASE}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });

  test('GET /health/ready → 200, has services.database', async ({ request }) => {
    const res = await request.get(`${BASE}/health/ready`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.services).toBeDefined();
    expect(body.data.services.database).toBeDefined();
    expect(body.data.services.database.status).toBe('healthy');
  });

  test('GET /docs → Swagger UI accessible', async ({ request }) => {
    const res = await request.get(`${BASE}/docs`);
    // Swagger returns HTML or redirects
    expect([200, 301, 302]).toContain(res.status());
  });

  // ── Auth: Register ──
  test('POST /auth/register → 201, returns tokens + user', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/register`, {
      data: testUser,
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    expect(body.data.user).toBeDefined();
    expect(body.data.user.email).toBe(testUser.email);
    expect(body.data.user.passwordHash).toBeUndefined();

    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
    userId = body.data.user.id;
  });

  test('POST /auth/register duplicate email → 409', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/register`, {
      data: testUser,
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Auth: Login ──
  test('POST /auth/login → 200, returns tokens', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/login`, {
      data: {
        email: testUser.email,
        password: testUser.password,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    expect(body.data.user).toBeDefined();

    // Update tokens from login
    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  test('POST /auth/login wrong password → 401', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/login`, {
      data: {
        email: testUser.email,
        password: 'WrongP@ss999',
      },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Auth: Me ──
  test('GET /auth/me with token → 200, returns user', async ({ request }) => {
    const res = await request.get(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testUser.email);
    expect(body.data.id).toBe(userId);
  });

  test('GET /auth/me no token → 401', async ({ request }) => {
    const res = await request.get(`${BASE}/auth/me`);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── Auth: Refresh ──
  test('POST /auth/refresh → 200, returns new accessToken', async ({ request }) => {
    const res = await request.post(`${BASE}/auth/refresh`, {
      data: { refreshToken },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
  });
});
