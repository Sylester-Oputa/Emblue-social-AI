const http = require('http');

const BASE = 'http://localhost:3000';
let passed = 0, failed = 0;
const issues = [];

// Test context
let token, userId, tenantId, workspaceId, signalId, draftId, connectionId, campaignId, notificationId;

function req(method, path, body, token) {
  return new Promise((resolve) => {
    const url = new URL(BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;
    
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ s: res.statusCode, d: JSON.parse(data) });
        } catch {
          resolve({ s: res.statusCode, d: data });
        }
      });
    });
    r.on('error', e => resolve({ s: 0, d: null, e: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runTests() {
  console.log('\ní·ª COMPREHENSIVE BACKEND QA TEST SUITE\n');
  console.log('â•'.repeat(70));
  
  // ==================== HEALTH CHECKS ====================
  console.log('\ní³‹ PHASE 1: Health & System Checks\n');
  
  const health = await req('GET', '/health');
  console.log('âœ“ Health:', health.s === 200 ? 'PASS' : 'FAIL');
  health.s === 200 ? passed++ : (failed++, issues.push('Health check failed'));
  
  const ready = await req('GET', '/health/ready');
  console.log('âœ“ Readiness:', ready.s === 200 ? 'PASS' : 'FAIL');
  ready.s === 200 ? passed++ : (failed++, issues.push('Readiness check failed'));
  
  // ==================== AUTHENTICATION ====================
  console.log('\ní³‹ PHASE 2: Authentication & Authorization\n');
  
  const email = `qa-${Date.now()}@test.dev`;
  const reg = await req('POST', '/auth/register', {
    email, password: 'Test123!', firstName: 'QA', lastName: 'User', companyName: 'QA Corp'
  });
  console.log('âœ“ Register:', reg.s === 201 ? 'PASS' : 'FAIL');
  if (reg.s === 201) {
    passed++;
    userId = reg.d.data.user.id;
    tenantId = reg.d.data.user.tenantId;
    token = reg.d.data.accessToken;
  } else {
    failed++;
    issues.push('Registration failed');
    console.log('FATAL: Cannot proceed without auth token');
    printSummary();
    return;
  }
  
  const login = await req('POST', '/auth/login', { email, password: 'Test123!' });
  console.log('âœ“ Login:', login.s === 200 ? 'PASS' : 'FAIL');
  login.s === 200 ? passed++ : (failed++, issues.push('Login failed'));
  
  const me = await req('GET', '/auth/me', null, token);
  console.log('âœ“ Get Current User:', me.s === 200 ? 'PASS' : 'FAIL');
  me.s === 200 ? passed++ : (failed++, issues.push('Get current user failed'));
  
  const badLogin = await req('POST', '/auth/login', { email, password: 'WrongPass' });
  console.log('âœ“ Bad Credentials Rejected:', badLogin.s === 401 ? 'PASS' : 'FAIL');
  badLogin.s === 401 ? passed++ : (failed++, issues.push('Bad credentials not rejected'));
  
  // ==================== WORKSPACES ====================
  console.log('\ní³‹ PHASE 3: Workspace Management\n');
  
  const listWs = await req('GET', '/workspaces', null, token);
  console.log('âœ“ List Workspaces:', listWs.s === 200 ? 'PASS' : 'FAIL');
  if (listWs.s === 200) {
    passed++;
    workspaceId = listWs.d.data[0]?.id;
  } else {
    failed++;
    issues.push('List workspaces failed');
  }
  
  if (workspaceId) {
    const getWs = await req('GET', `/workspaces/${workspaceId}`, null, token);
    console.log('âœ“ Get Workspace:', getWs.s === 200 ? 'PASS' : 'FAIL');
    getWs.s === 200 ? passed++ : (failed++, issues.push('Get workspace failed'));
    
    const patchWs = await req('PATCH', `/workspaces/${workspaceId}`, { name: 'QA Workspace Updated' }, token);
    console.log('âœ“ Update Workspace:', patchWs.s === 200 ? 'PASS' : 'FAIL');
    patchWs.s === 200 ? passed++ : (failed++, issues.push('Update workspace failed'));
    
    const autoStatus = await req('GET', `/workspaces/${workspaceId}/automation/status`, null, token);
    console.log('âœ“ Automation Status:', autoStatus.s === 200 ? 'PASS' : 'FAIL');
    autoStatus.s === 200 ? passed++ : (failed++, issues.push('Automation status failed'));
  }
  
  // ==================== INGESTION & SIGNALS ====================
  console.log('\ní³‹ PHASE 4: Ingestion & Signal Processing\n');
  
  const webhook = await req('POST', '/ingestion/webhook/X', {
    event_type: 'mention',
    id: `tweet_qa_${Date.now()}`,
    text: 'I love your product! Best purchase ever.',
    author_id: 'user_123',
    author: '@happy_customer',
    created_at: new Date().toISOString()
  });
  console.log('âœ“ Webhook Ingestion:', webhook.s === 202 ? 'PASS' : 'FAIL');
  webhook.s === 202 ? passed++ : (failed++, issues.push('Webhook ingestion failed'));
  
  if (workspaceId) {
    await new Promise(r => setTimeout(r, 2000)); // Wait for processing
    
    const signals = await req('GET', `/workspaces/${workspaceId}/signals`, null, token);
    console.log('âœ“ List Signals:', signals.s === 200 ? 'PASS' : 'FAIL');
    if (signals.s === 200) {
      passed++;
      signalId = signals.d.data[0]?.id;
    } else {
      failed++;
      issues.push('List signals failed');
    }
    
    if (signalId) {
      const getSignal = await req('GET', `/workspaces/${workspaceId}/signals/${signalId}`, null, token);
      console.log('âœ“ Get Signal Details:', getSignal.s === 200 ? 'PASS' : 'FAIL');
      getSignal.s === 200 ? passed++ : (failed++, issues.push('Get signal failed'));
    }
  }
  
  // ==================== RESPONSES & AI ====================
  console.log('\ní³‹ PHASE 5: AI Response Generation\n');
  
  if (workspaceId && signalId) {
    const generate = await req('POST', `/workspaces/${workspaceId}/responses/generate/${signalId}`, {}, token);
    console.log('âœ“ Generate AI Response:', generate.s === 201 ? 'PASS' : 'FAIL');
    if (generate.s === 201) {
      passed++;
      draftId = generate.d.data.id;
    } else {
      failed++;
      issues.push('AI generation failed');
    }
    
    const listResp = await req('GET', `/workspaces/${workspaceId}/responses`, null, token);
    console.log('âœ“ List Responses:', listResp.s === 200 ? 'PASS' : 'FAIL');
    listResp.s === 200 ? passed++ : (failed++, issues.push('List responses failed'));
    
    const escalated = await req('GET', `/workspaces/${workspaceId}/responses/escalated`, null, token);
    console.log('âœ“ Escalated Responses:', escalated.s === 200 ? 'PASS' : 'FAIL');
    escalated.s === 200 ? passed++ : (failed++, issues.push('Escalated responses failed'));
  }
  
  // ==================== APPROVALS ====================
  console.log('\ní³‹ PHASE 6: Approval Workflow\n');
  
  if (workspaceId) {
    const approvals = await req('GET', `/workspaces/${workspaceId}/approvals`, null, token);
    console.log('âœ“ List Approvals:', approvals.s === 200 ? 'PASS' : 'FAIL');
    approvals.s === 200 ? passed++ : (failed++, issues.push('List approvals failed'));
  }
  
  // ==================== CAMPAIGNS ====================
  console.log('\ní³‹ PHASE 7: Campaign Management (NEW)\n');
  
  if (workspaceId) {
    const createCamp = await req('POST', `/workspaces/${workspaceId}/campaigns`, {
      name: 'QA Test Campaign',
      description: 'Test campaign for QA',
      startDate: new Date().toISOString(),
      status: 'DRAFT'
    }, token);
    console.log('âœ“ Create Campaign:', createCamp.s === 201 ? 'PASS' : 'FAIL');
    if (createCamp.s === 201) {
      passed++;
      campaignId = createCamp.d.data.id;
    } else {
      failed++;
      issues.push('Create campaign failed');
    }
    
    const listCamp = await req('GET', `/workspaces/${workspaceId}/campaigns`, null, token);
    console.log('âœ“ List Campaigns:', listCamp.s === 200 ? 'PASS' : 'FAIL');
    listCamp.s === 200 ? passed++ : (failed++, issues.push('List campaigns failed'));
    
    if (campaignId) {
      const getCamp = await req('GET', `/workspaces/${workspaceId}/campaigns/${campaignId}`, null, token);
      console.log('âœ“ Get Campaign:', getCamp.s === 200 ? 'PASS' : 'FAIL');
      getCamp.s === 200 ? passed++ : (failed++, issues.push('Get campaign failed'));
      
      const updateCamp = await req('PATCH', `/workspaces/${workspaceId}/campaigns/${campaignId}`, {
        name: 'Updated QA Campaign'
      }, token);
      console.log('âœ“ Update Campaign:', updateCamp.s === 200 ? 'PASS' : 'FAIL');
      updateCamp.s === 200 ? passed++ : (failed++, issues.push('Update campaign failed'));
    }
  }
  
  // ==================== NOTIFICATIONS ====================
  console.log('\ní³‹ PHASE 8: Notifications (NEW)\n');
  
  const listNotif = await req('GET', '/notifications', null, token);
  console.log('âœ“ List Notifications:', listNotif.s === 200 ? 'PASS' : 'FAIL');
  listNotif.s === 200 ? passed++ : (failed++, issues.push('List notifications failed'));
  
  const unreadCount = await req('GET', '/notifications/unread-count', null, token);
  console.log('âœ“ Unread Count:', unreadCount.s === 200 ? 'PASS' : 'FAIL');
  unreadCount.s === 200 ? passed++ : (failed++, issues.push('Unread count failed'));
  
  // ==================== OPS & MONITORING ====================
  console.log('\ní³‹ PHASE 9: Ops & Monitoring (NEW)\n');
  
  const opsHealth = await req('GET', '/ops/health', null, token);
  console.log('âœ“ Ops Health:', opsHealth.s === 200 ? 'PASS' : 'FAIL');
  opsHealth.s === 200 ? passed++ : (failed++, issues.push('Ops health failed'));
  
  if (workspaceId) {
    const queues = await req('GET', `/ops/workspaces/${workspaceId}/queues`, null, token);
    console.log('âœ“ Queue Stats:', queues.s === 200 ? 'PASS' : 'FAIL');
    queues.s === 200 ? passed++ : (failed++, issues.push('Queue stats failed'));
    
    const pipeline = await req('GET', `/ops/workspaces/${workspaceId}/pipeline`, null, token);
    console.log('âœ“ Pipeline Stats:', pipeline.s === 200 ? 'PASS' : 'FAIL');
    pipeline.s === 200 ? passed++ : (failed++, issues.push('Pipeline stats failed'));
  }
  
  // ==================== ANALYTICS ====================
  console.log('\ní³‹ PHASE 10: Analytics\n');
  
  if (workspaceId) {
    const analytics = await req('GET', `/workspaces/${workspaceId}/analytics/summary`, null, token);
    console.log('âœ“ Analytics Summary:', analytics.s === 200 ? 'PASS' : 'FAIL');
    analytics.s === 200 ? passed++ : (failed++, issues.push('Analytics summary failed'));
  }
  
  // ==================== INTEGRATIONS ====================
  console.log('\ní³‹ PHASE 11: Platform Integrations\n');
  
  if (workspaceId) {
    const listInt = await req('GET', `/workspaces/${workspaceId}/integrations`, null, token);
    console.log('âœ“ List Integrations:', listInt.s === 200 ? 'PASS' : 'FAIL');
    listInt.s === 200 ? passed++ : (failed++, issues.push('List integrations failed'));
    
    const connectUrl = await req('GET', `/workspaces/${workspaceId}/integrations/connect/X`, null, token);
    console.log('âœ“ OAuth Connect URL:', connectUrl.s === 200 ? 'PASS' : 'FAIL');
    connectUrl.s === 200 ? passed++ : (failed++, issues.push('OAuth connect failed'));
  }
  
  // ==================== SECURITY VALIDATION ====================
  console.log('\ní³‹ PHASE 12: Security Validation\n');
  
  const noAuth = await req('GET', '/workspaces');
  console.log('âœ“ No Token Rejected:', noAuth.s === 401 ? 'PASS' : 'FAIL');
  noAuth.s === 401 ? passed++ : (failed++, issues.push('Unauth request not rejected'));
  
  const badToken = await req('GET', '/workspaces', null, 'invalid.token.here');
  console.log('âœ“ Bad Token Rejected:', badToken.s === 401 ? 'PASS' : 'FAIL');
  badToken.s === 401 ? passed++ : (failed++, issues.push('Bad token not rejected'));
  
  printSummary();
}

function printSummary() {
  console.log('\n' + 'â•'.repeat(70));
  console.log('\ní³Š QA TEST SUMMARY\n');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`âœ… Passed: ${passed}`);
  console.log(`âŒ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed/(passed+failed))*100).toFixed(1)}%`);
  
  if (issues.length > 0) {
    console.log('\nâš ï¸  ISSUES FOUND:\n');
    issues.forEach((issue, i) => console.log(`  ${i+1}. ${issue}`));
  } else {
    console.log('\ní¾‰ ALL TESTS PASSED!');
  }
  
  console.log('\n' + 'â•'.repeat(70) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\ní²¥ TEST SUITE CRASHED:', err.message);
  process.exit(1);
});
