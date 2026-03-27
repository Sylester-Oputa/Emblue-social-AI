# Backend Testing Guide
## How to Run Playwright E2E Tests

This guide explains how to validate the backend implementation using Playwright tests.

---

## Prerequisites

Before running tests, ensure the following services are running:

### 1. PostgreSQL Database
```bash
# Check if PostgreSQL is running on port 5000
netstat -ano | findstr ":5000"

# If not running, start PostgreSQL service
# (Adjust command based on your PostgreSQL installation)
```

### 2. Redis Cache
```bash
# Check if Redis is running on port 6379
netstat -ano | findstr ":6379"

# If not running, start Redis
redis-server
```

### 3. Run Database Migrations
```bash
cd backend
npm run migrate:dev
```

### 4. Seed Test Data (Optional)
```bash
npm run db:seed
```

---

## Starting the Backend Server

### Development Mode (with hot reload)
```bash
cd backend
npm run start:dev

# Wait for:
# 🚀 Emblue Social AI running on http://localhost:3000
# 📚 Swagger docs at http://localhost:3000/docs
```

### Production Mode
```bash
cd backend
npm run build
npm run start:prod
```

---

## Running Playwright Tests

### Run All Tests
```bash
cd backend
npm run test:e2e
```

### Run Specific Test Suite

**System Health Check** (quick validation):
```bash
npx playwright test system-check.spec.ts --reporter=list
```

**Comprehensive API Tests** (full endpoint validation):
```bash
npx playwright test comprehensive-api.spec.ts --reporter=list
```

**Automation Pipeline Tests** (PRD compliance check):
```bash
npx playwright test automation-pipeline.spec.ts --reporter=list
```

### Run Tests with UI Inspector (Debugging)
```bash
npx playwright test --ui
```

### Run Tests in Headed Mode (see browser)
```bash
npx playwright test --headed
```

### Run Tests with Verbose Output
```bash
npx playwright test --reporter=list --reporter=html
```

---

## Expected Test Results

### Current Implementation (Manual Workflow)

#### ✅ PASSING Tests (Baseline Functionality)
- Health checks (`GET /health`, `GET /ready`)
- Authentication flow (register, login, refresh, me)
- Workspace management (CRUD operations)
- User management (CRUD operations)  
- Tenant management
- Signal ingestion (webhook endpoint)
- Signal listing (with filtering)
- Response generation trigger (manual)
- Approval workflow (manual approve/reject)
- Delivery to platforms (manual send)
- Analytics summary
- Integration management

#### ❌ FAILING Tests (Automation Features Not Implemented)
- **FR-10**: Auto-create reply jobs from signals
  - Error: `GET /reply-jobs/queue` returns 404
- **FR-16**: Auto-approve clean suggestions
  - Error: All responses require manual approval
- **FR-17**: Auto-post to platforms
  - Error: Delivery requires manual trigger
- **FR-18**: Auto-escalate risky suggestions
  - Error: No escalation workflow
- **FR-19**: Override escalated content
  - Error: `POST /replies/:id/override` returns 404
- **FR-20**: Pause/resume automation
  - Error: `POST /workspaces/:id/automation/pause` returns 404

---

## Test Output Examples

### Successful Test Run
```
Running 7 tests using 1 worker

  ✓  1 System Health Check › 🏥 Health Endpoints (1.4s)
     ✅ GET /health - 200 OK
     ✅ GET /health/ready - 200 OK
     ✅ GET /docs (Swagger UI) - 200 OK

  ✓  2 System Health Check › 🔐 Authentication Flow (558ms)
     ✅ POST /auth/register - 201 Created
     ✅ POST /auth/login - 200 OK
     ✅ GET /auth/me - 200 OK

  ✓  3 System Health Check › 🏢 Tenant Management (8ms)
     ✅ GET /tenants/:id - 200 OK

  ✓  4 System Health Check › 🏗️ Workspace Management (10ms)
     ✅ POST /workspaces - 201 Created
     ✅ GET /workspaces - 200 OK

  ✓  5 System Health Check › 📨 Ingestion & Signals (37ms)
     ✅ POST /ingestion/webhook/X - 202 Accepted
     ✅ GET /workspaces/:id/signals - 200 OK

  ✓  6 System Health Check › ✅ Approvals & Responses (28ms)
     ✅ POST /responses/generate/:signalId - 200 OK
     ✅ PATCH /approvals/:id/approve - 200 OK

  ✓  7 System Health Check › 📊 Analytics (10ms)
     ✅ GET /analytics/summary - 200 OK

═══════════════════════════════════════════════════════
             SYSTEM CHECK SUMMARY
═══════════════════════════════════════════════════════

✅ PASSED:   11
❌ FAILED:    0
⏭️  SKIPPED:  0
📊 TOTAL:    11

  7 passed (5.8s)
```

### Failed Test Run (Automation Features)
```
Running 11 tests using 1 worker

  ✘  1 FR-10: Auto-create reply job from ingested signal (1.2s)
     ❌ GET /reply-jobs/queue
        HTTP: 404 Not Found
        Expected: List of pending automation jobs
        Actual: Endpoint does not exist

  ✘  2 FR-16: Auto-approve clean suggestions (0.8s)
     ❌ Auto-approval check
        Expected: Response status = 'AUTO_APPROVED'
        Actual: Response status = 'PENDING_APPROVAL'
        Gap: All responses require manual approval

  ✘  3 FR-17: Auto-post approved suggestions to platform (1.5s)
     ❌ Auto-posting check
        Expected: Response status = 'POSTED' after approval
        Actual: Response status = 'APPROVED' (manual send required)
        Gap: No automatic posting after approval

  ✘  4 FR-20: Pause automation for workspace (0.5s)
     ❌ POST /workspaces/:id/automation/pause
        HTTP: 404 Not Found
        Expected: Pause automation for workspace
        Actual: Endpoint does not exist

═══════════════════════════════════════════════════════
             GAP ANALYSIS
═══════════════════════════════════════════════════════

❌ FAILED:    4
⏭️  SKIPPED:  7
📊 TOTAL:    11

These failures indicate missing automation features.
See BACKEND_VALIDATION_REPORT.md for implementation roadmap.
```

---

## Troubleshooting

### Tests Fail with Connection Errors

**Symptom:** All tests fail with HTML response or connection refused

```
❌ GET /health
   Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Cause:** Backend server not running or not accessible

**Fix:**
1. Verify backend is running: `netstat -ano | findstr ":3000"`
2. Check backend logs for startup errors
3. Verify DATABASE_URL in `.env` is correct
4. Run migrations: `npm run migrate:dev`

---

### Tests Fail with Database Errors

**Symptom:** Backend starts but crashes on database operations

```
PrismaClientKnownRequestError: Can't reach database server at `localhost:5000`
```

**Cause:** PostgreSQL not running or wrong port

**Fix:**
1. Check PostgreSQL is running: `netstat -ano | findstr ":5000"`
2. Verify `.env` DATABASE_URL matches your PostgreSQL config
3. Standard PostgreSQL port is 5432, not 5000 - update if needed
4. Test connection: `psql -h localhost -p 5000 -U postgres -d socialops_db`

---

### Tests Fail with Redis Errors

**Symptom:** BullMQ jobs not processing, async tasks hang

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Cause:** Redis not running

**Fix:**
1. Check Redis is running: `netstat -ano | findstr ":6379"`
2. Start Redis: `redis-server` (or via service manager)
3. Test connection: `redis-cli ping` (should return PONG)

---

### Tests Timeout Waiting for Async Processing

**Symptom:** Signal ingestion succeeds but signals never appear in list

```
✓ POST /ingestion/webhook/X - 202 Accepted
✘ GET /signals - Expected at least 1 signal, got 0
```

**Cause:** BullMQ worker not processing jobs

**Fix:**
1. Check backend logs for BullMQ worker errors
2. Increase test timeout: `await new Promise(resolve => setTimeout(resolve, 10000));`
3. Verify Redis is running and accessible
4. Check worker is configured: `@nestjs/bullmq` module loaded

---

### Auth Tests Fail with 401 Unauthorized

**Symptom:** Login succeeds but subsequent requests fail

```
✓ POST /auth/login - 200 OK
✘ GET /auth/me - 401 Unauthorized
```

**Cause:** JWT token not included or expired

**Fix:**
1. Check test sets Authorization header: `{ 'Authorization': 'Bearer ${token}' }`
2. Verify JWT_SECRET in `.env` matches test expectation
3. Check token expiry (JWT_ACCESS_EXPIRY in `.env`)
4. Review test context object stores accessToken correctly

---

### Approval Tests Fail with 403 Forbidden

**Symptom:** Approval endpoint returns permission denied

```
✘ PATCH /approvals/:id/approve - 403 Forbidden
   Message: "Insufficient permissions"
```

**Cause:** User role doesn't have REVIEWER permission

**Fix:**
1. Test user must have `REVIEWER`, `WORKSPACE_ADMIN`, or `TENANT_ADMIN` role
2. Check user creation in test assigns correct role
3. Verify RBAC guard is configured correctly
4. Review Roles decorator on endpoint: `@Roles('REVIEWER')`

---

## Continuous Integration

### Running Tests in CI/CD

**GitHub Actions Example:**
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: socialops_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Run migrations
        run: |
          cd backend
          npm run migrate:deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/socialops_test
      
      - name: Start backend
        run: |
          cd backend
          npm run start:prod &
          sleep 10
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/socialops_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
      
      - name: Run Playwright tests
        run: |
          cd backend
          npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: backend/playwright-report/
```

---

## Test Coverage Reports

### Generate HTML Report
```bash
npx playwright test --reporter=html
```

View report:
```bash
npx playwright show-report
```

### Generate JSON Report (for CI)
```bash
npx playwright test --reporter=json > test-results.json
```

---

## Next Steps

1. **Fix Database Connection**
   - Verify PostgreSQL is running
   - Run migrations
   - Seed test data

2. **Run Baseline Tests**
   - `npx playwright test system-check.spec.ts`
   - Confirm all existing functionality passes

3. **Review Automation Failures**
   - Run `automation-pipeline.spec.ts`
   - Document expected failures (features not implemented)

4. **Implement Missing Features**
   - Follow roadmap in `BACKEND_VALIDATION_REPORT.md`
   - Start with Phase 1 (Policy Engine)
   - Re-run tests after each phase

5. **Update Test Expectations**
   - Uncomment assertions in `automation-pipeline.spec.ts` as features are implemented
   - Add new tests for new endpoints
   - Maintain test coverage above 80%

---

For detailed gap analysis and implementation roadmap, see:
📄 **[BACKEND_VALIDATION_REPORT.md](./BACKEND_VALIDATION_REPORT.md)**
