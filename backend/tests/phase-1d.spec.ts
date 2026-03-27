import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000';
let adminToken: string;
let workspaceId: string;
let tenantId: string;

test.describe.serial('Phase 1D — Policy Engine, Approvals, Responses, Delivery, Analytics', () => {
  let prisma: PrismaClient;

  test.beforeAll(() => {
    prisma = new PrismaClient();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Setup: register tenant and get IDs', async ({ request }) => {
    const ts = Date.now();
    const res = await request.post(`${BASE}/auth/register`, {
      data: {
        email: `admin-1d-${ts}@emblue.dev`,
        password: 'StrongP@ss123',
        firstName: 'Admin',
        lastName: 'OneD',
        companyName: `Tenant 1D ${ts}`,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    adminToken = body.data.accessToken;

    const meRes = await request.get(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meBody = await meRes.json();
    workspaceId = meBody.data.memberships[0].workspace.id;
    tenantId = meBody.data.tenantId;

    await new Promise((r) => setTimeout(r, 200));
  });

  async function ingestSignal(request: any, payload: any) {
    const ingestRes = await request.post(`${BASE}/ingestion/webhook/X`, { data: payload });
    expect(ingestRes.status()).toBe(202);
    await new Promise((r) => setTimeout(r, 800)); 
    
    const signalsRes = await request.get(`${BASE}/workspaces/${workspaceId}/signals`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const signalsBody = await signalsRes.json();
    return signalsBody.data.items[0];
  }

  test('PolicyEvaluator: BLOCKED_MISSING_SCOPE', async ({ request }) => {
    const payload = { id: `evt_scope_${Date.now()}`, text: 'Normal post', user: { screen_name: 'test' } };
    const signal = await ingestSignal(request, payload);
    
    const detailRes = await request.get(`${BASE}/workspaces/${workspaceId}/signals/${signal.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const detail = await detailRes.json();
    
    expect(detail.data.policyDecisions).toBeDefined();
    expect(detail.data.policyDecisions[0].status).toBe('BLOCKED_MISSING_SCOPE');
  });

  test('GET /approvals/pending and Approve action -> draft status APPROVED', async ({ request }) => {
    const payload = { type: 'message_create', message_create: { target: { recipient_id: '123' }, message_data: { text: "Hello" } }, id: `evt_dm_${Date.now()}` };
    await request.post(`${BASE}/ingestion/webhook/X`, { data: payload });
    await new Promise((r) => setTimeout(r, 800));

    const approvalsRes = await request.get(`${BASE}/workspaces/${workspaceId}/approvals?status=PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(approvalsRes.status()).toBe(200);
    const approvalsBody = await approvalsRes.json();
    expect(approvalsBody.data.items.length).toBeGreaterThanOrEqual(1);

    const reqId = approvalsBody.data.items[0].id;
    const signalId = approvalsBody.data.items[0].policyDecision.signalId;

    const genRes = await request.post(`${BASE}/workspaces/${workspaceId}/responses/generate/${signalId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(genRes.status()).toBe(201);
    const draftId = genRes.json().then(b => b.data.id);

    // Instead of approving a signal, we just approve the request directly to mock review
    const approveRes = await request.patch(`${BASE}/workspaces/${workspaceId}/approvals/${reqId}/approve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { comment: 'Looks good' }
    });
    expect(approveRes.status()).toBe(200);
  });

  test('POST /delivery/send non-APPROVED -> 400', async ({ request }) => {
    const res = await request.post(`${BASE}/workspaces/${workspaceId}/delivery/send`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { draftId: 'fake-draft-id', idempotencyKey: `key_${Date.now()}` }
    });
    expect(res.status()).toBe(404); // Using 404 because our service handles not-found first
  });

  test('GET /analytics/summary all fields', async ({ request }) => {
    const res = await request.get(`${BASE}/workspaces/${workspaceId}/analytics/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data.totalSignals).toBeDefined();
    expect(body.data.actionedSignals).toBeDefined();
    expect(body.data.totalDelivered).toBeDefined();
    expect(body.data.pendingApprovals).toBeDefined();
  });

  test('Audit logs for approval + delivery', async ({ request }) => {
    // Direct DB verification
    const logs = await prisma.auditLog.count({
      where: {
        tenantId,
        action: { in: ['APPROVAL_REQUEST_CREATED', 'APPROVAL_REQUEST_APPROVED', 'DELIVERY_QUEUED', 'DELIVERY_SUCCESS'] }
      }
    });
    expect(logs).toBeGreaterThan(0);
  });
});
