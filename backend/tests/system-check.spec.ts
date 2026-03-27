import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  httpCode?: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${result.endpoint} - ${result.status}${result.httpCode ? ` (${result.httpCode})` : ''}${result.error ? ` - ${result.error}` : ''}`);
}

test.describe('System Health Check', () => {
  let accessToken: string;
  let userId: string;
  let tenantId: string;
  let workspaceId: string;
  let signalId: string;
  let draftId: string;

  const testEmail = `syscheck-${Date.now()}@test.dev`;

  test('🏥 Health Endpoints', async ({ request }) => {
    // Basic health
    try {
      const res = await request.get(`${BASE}/health`);
      logResult({
        endpoint: 'GET /health',
        status: res.status() === 200 ? 'PASS' : 'FAIL',
        httpCode: res.status(),
        details: await res.json().catch(() => null)
      });
    } catch (err: any) {
      logResult({ endpoint: 'GET /health', status: 'FAIL', error: err.message });
    }

    // Ready check
    try {
      const res = await request.get(`${BASE}/health/ready`);
      const body = await res.json();
      logResult({
        endpoint: 'GET /health/ready',
        status: res.status() === 200 && body.data?.services?.database?.status === 'healthy' ? 'PASS' : 'FAIL',
        httpCode: res.status(),
        details: body
      });
    } catch (err: any) {
      logResult({ endpoint: 'GET /health/ready', status: 'FAIL', error: err.message });
    }

    // Swagger UI
    try {
      const res = await request.get(`${BASE}/docs`);
      logResult({
        endpoint: 'GET /docs (Swagger UI)',
        status: [200, 301, 302].includes(res.status()) ? 'PASS' : 'FAIL',
        httpCode: res.status()
      });
    } catch (err: any) {
      logResult({ endpoint: 'GET /docs', status: 'FAIL', error: err.message });
    }
  });

  test('🔐 Authentication Flow', async ({ request }) => {
    // Register
    try {
      const res = await request.post(`${BASE}/auth/register`, {
        data: {
          email: testEmail,
          password: 'Test@Pass123',
          firstName: 'System',
          lastName: 'Check',
          companyName: 'Test Corp'
        }
      });
      const body = await res.json();
      
      if (res.status() === 201 && body.data?.accessToken) {
        accessToken = body.data.accessToken;
        userId = body.data.user?.id;
        tenantId = body.data.user?.tenantId;
        logResult({ endpoint: 'POST /auth/register', status: 'PASS', httpCode: 201 });
      } else {
        logResult({ endpoint: 'POST /auth/register', status: 'FAIL', httpCode: res.status(), details: body });
      }
    } catch (err: any) {
      logResult({ endpoint: 'POST /auth/register', status: 'FAIL', error: err.message });
    }

    // Login
    try {
      const res = await request.post(`${BASE}/auth/login`, {
        data: { email: testEmail, password: 'Test@Pass123' }
      });
      const body = await res.json();
      logResult({
        endpoint: 'POST /auth/login',
        status: res.status() === 200 && body.data?.accessToken ? 'PASS' : 'FAIL',
        httpCode: res.status()
      });
      if (body.data?.accessToken) {
        accessToken = body.data.accessToken;
      }
    } catch (err: any) {
      logResult({ endpoint: 'POST /auth/login', status: 'FAIL', error: err.message });
    }

    // Get Me
    if (accessToken) {
      try {
        const res = await request.get(`${BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const body = await res.json();
        if (res.status() === 200 && body.data?.memberships?.[0]?.workspace) {
          workspaceId = body.data.memberships[0].workspace.id;
          logResult({ endpoint: 'GET /auth/me', status: 'PASS', httpCode: 200 });
        } else {
          logResult({ endpoint: 'GET /auth/me', status: 'FAIL', httpCode: res.status(), details: body });
        }
      } catch (err: any) {
        logResult({ endpoint: 'GET /auth/me', status: 'FAIL', error: err.message });
      }
    } else {
      logResult({ endpoint: 'GET /auth/me', status: 'SKIP', error: 'No access token' });
    }

    // Refresh token
    if (accessToken) {
      try {
        const res = await request.post(`${BASE}/auth/refresh`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        logResult({
          endpoint: 'POST /auth/refresh',
          status: res.status() === 200 ? 'PASS' : 'FAIL',
          httpCode: res.status()
        });
      } catch (err: any) {
        logResult({ endpoint: 'POST /auth/refresh', status: 'FAIL', error: err.message });
      }
    }
  });

  test('🏢 Tenant Management', async ({ request }) => {
    if (!accessToken || !tenantId) {
      logResult({ endpoint: 'Tenant endpoints', status: 'SKIP', error: 'No auth data' });
      return;
    }

    // Get tenant
    try {
      const res = await request.get(`${BASE}/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      logResult({
        endpoint: `GET /tenants/${tenantId}`,
        status: res.status() === 200 ? 'PASS' : 'FAIL',
        httpCode: res.status()
      });
    } catch (err: any) {
      logResult({ endpoint: 'GET /tenants/:id', status: 'FAIL', error: err.message });
    }

    // Update tenant
    try {
      const res = await request.patch(`${BASE}/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { name: 'Updated Test Corp' }
      });
      logResult({
        endpoint: `PATCH /tenants/${tenantId}`,
        status: res.status() === 200 ? 'PASS' : 'FAIL',
        httpCode: res.status()
      });
    } catch (err: any) {
      logResult({ endpoint: 'PATCH /tenants/:id', status: 'FAIL', error: err.message });
    }
  });

  test('🏗️ Workspace Management', async ({ request }) => {
    if (!accessToken) {
      logResult({ endpoint: 'Workspace endpoints', status: 'SKIP', error: 'No auth' });
      return;
    }

    // List workspaces
    try {
      const res = await request.get(`${BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      logResult({
        endpoint: 'GET /workspaces',
        status: res.status() === 200 ? 'PASS' : 'FAIL',
        httpCode: res.status()
      });
    } catch (err: any) {
      logResult({ endpoint: 'GET /workspaces', status: 'FAIL', error: err.message });
    }

    // Create workspace
    let newWsId: string;
    try {
      const res = await request.post(`${BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { name: 'Test Workspace Check' }
      });
      const body = await res.json();
      newWsId = body.data?.id;
      logResult({
        endpoint: 'POST /workspaces',
        status: res.status() === 201 && newWsId ? 'PASS' : 'FAIL',
        httpCode: res.status()
      });
    } catch (err: any) {
      logResult({ endpoint: 'POST /workspaces', status: 'FAIL', error: err.message });
    }

    // Get workspace
    if (newWsId) {
      try {
        const res = await request.get(`${BASE}/workspaces/${newWsId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        logResult({
          endpoint: 'GET /workspaces/:id',
          status: res.status() === 200 ? 'PASS' : 'FAIL',
          httpCode: res.status()
        });
      } catch (err: any) {
        logResult({ endpoint: 'GET /workspaces/:id', status: 'FAIL', error: err.message });
      }
    }
  });

  test('📨 Ingestion & Signals', async ({ request }) => {
    if (!accessToken || !workspaceId) {
      logResult({ endpoint: 'Ingestion endpoints', status: 'SKIP', error: 'No workspace' });
      return;
    }

    // Ingest webhook
    try {
      const res = await request.post(`${BASE}/ingestion/webhook/X`, {
        data: {
          id: `test_${Date.now()}`,
          text: 'System check test message',
          user: { screen_name: 'testuser' }
        }
      });
      const body = await res.json();
      logResult({
        endpoint: 'POST /ingestion/webhook/X',
        status: res.status() === 202 ? 'PASS' : 'FAIL',
        httpCode: res.status(),
        details: body
      });

      // Wait for processing
      await new Promise(r => setTimeout(r, 2000));
    } catch (err: any) {
      logResult({ endpoint: 'POST /ingestion/webhook/X', status: 'FAIL', error: err.message });
    }

    // List signals
    try {
      const res = await request.get(`${BASE}/workspaces/${workspaceId}/signals`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const body = await res.json();
      if (res.status() === 200 && body.data?.items) {
        signalId = body.data.items[0]?.id;
        logResult({ endpoint: 'GET /workspaces/:id/signals', status: 'PASS', httpCode: 200 });
      } else {
        logResult({ endpoint: 'GET /workspaces/:id/signals', status: 'FAIL', httpCode: res.status() });
      }
    } catch (err: any) {
      logResult({ endpoint: 'GET /workspaces/:id/signals', status: 'FAIL', error: err.message });
    }

    // Get signal detail
    if (signalId) {
      try {
        const res = await request.get(`${BASE}/workspaces/${workspaceId}/signals/${signalId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        logResult({
          endpoint: 'GET /workspaces/:id/signals/:signalId',
          status: res.status() === 200 ? 'PASS' : 'FAIL',
          httpCode: res.status()
        });
      } catch (err: any) {
        logResult({ endpoint: 'GET /workspaces/:id/signals/:signalId', status: 'FAIL', error: err.message });
      }
    }
  });

  test('✅ Approvals & Responses', async ({ request }) => {
    if (!accessToken || !workspaceId) {
      logResult({ endpoint: 'Approvals endpoints', status: 'SKIP', error: 'No workspace' });
      return;
    }

    // List pending approvals
    try {
      const res = await request.get(`${BASE}/workspaces/${workspaceId}/approvals?status=PENDING`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      logResult({
        endpoint: 'GET /workspaces/:id/approvals',
        status: res.status() === 200 ? 'PASS' : 'FAIL',
        httpCode: res.status()
      });
    } catch (err: any) {
      logResult({ endpoint: 'GET /workspaces/:id/approvals', status: 'FAIL', error: err.message });
    }

    // Generate response
    if (signalId) {
      try {
        const res = await request.post(`${BASE}/workspaces/${workspaceId}/responses/generate/${signalId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const body = await res.json();
        draftId = body.data?.id;
        logResult({
          endpoint: 'POST /workspaces/:id/responses/generate/:signalId',
          status: [201, 200].includes(res.status()) ? 'PASS' : 'FAIL',
          httpCode: res.status()
        });
      } catch (err: any) {
        logResult({ endpoint: 'POST /workspaces/:id/responses/generate/:signalId', status: 'FAIL', error: err.message });
      }
    }
  });

  test('📊 Analytics', async ({ request }) => {
    if (!accessToken || !workspaceId) {
      logResult({ endpoint: 'Analytics endpoints', status: 'SKIP', error: 'No workspace' });
      return;
    }

    try {
      const res = await request.get(`${BASE}/workspaces/${workspaceId}/analytics/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const body = await res.json();
      logResult({
        endpoint: 'GET /workspaces/:id/analytics/summary',
        status: res.status() === 200 && body.data ? 'PASS' : 'FAIL',
        httpCode: res.status(),
        details: body.data
      });
    } catch (err: any) {
      logResult({ endpoint: 'GET /workspaces/:id/analytics/summary', status: 'FAIL', error: err.message });
    }
  });

  test.afterAll(async () => {
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('             SYSTEM CHECK SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    console.log(`✅ PASSED:  ${passed}`);
    console.log(`❌ FAILED:  ${failed}`);
    console.log(`⏭️  SKIPPED: ${skipped}`);
    console.log(`📊 TOTAL:   ${results.length}\n`);

    if (failed > 0) {
      console.log('❌ FAILED ENDPOINTS:\n');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`   ${r.endpoint}`);
        if (r.error) console.log(`      Error: ${r.error}`);
        if (r.httpCode) console.log(`      HTTP: ${r.httpCode}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════\n');
  });
});
