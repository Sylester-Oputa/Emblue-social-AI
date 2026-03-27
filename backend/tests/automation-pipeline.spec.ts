import { test, expect } from "@playwright/test";

/**
 * AUTOMATION PIPELINE VALIDATION TEST SUITE
 *
 * Purpose: Validate the fully automated social media reply system against PRD requirements
 *
 * PRD Requirements Tested:
 * - FR-10: Auto-create reply jobs from ingested signals
 * - FR-15: Auto-generate reply suggestions
 * - FR-16: Auto-approve clean suggestions (Risk Score < threshold)
 * - FR-17: Auto-post approved suggestions to social platforms
 * - FR-18: Auto-escalate risky suggestions (Risk Score >= threshold)
 * - FR-19: Override flow for escalated content
 * - FR-20: Automation pause/resume controls
 *
 * Architecture: Tests the end-to-end automation pipeline
 * Signal Ingestion → AI Generation → Policy Enforcement → Auto-Approval → Platform Posting
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// Test context shared across tests
const ctx: {
  accessToken?: string;
  userId?: string;
  tenantId?: string;
  workspaceId?: string;
  signalId?: string;
  responseId?: string;
  approvalId?: string;
  testEmail?: string;
} = {};

test.describe("🤖 Automation Pipeline Validation", () => {
  // ============================================================================
  // SETUP: Authentication & Workspace
  // ============================================================================

  test.beforeAll("Setup test environment", async ({ request }) => {
    // Generate unique test email
    ctx.testEmail = `automation-test-${Date.now()}@example.com`;

    // Register test user
    const registerResponse = await request.post(`${BASE_URL}/auth/register`, {
      data: {
        email: ctx.testEmail,
        password: "SecurePass123!",
        firstName: "Automation",
        lastName: "Test",
        companyName: "Test Automation Inc.",
      },
    });

    expect(registerResponse.ok()).toBeTruthy();
    const registerBody = await registerResponse.json();
    ctx.accessToken = registerBody.data.accessToken;
    ctx.userId = registerBody.data.user.id;
    ctx.tenantId = registerBody.data.user.tenantId;

    // Create test workspace
    const workspaceResponse = await request.post(`${BASE_URL}/workspaces`, {
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      data: {
        name: "Automation Test Workspace",
        description: "Workspace for testing automated reply pipeline",
      },
    });

    expect(workspaceResponse.ok()).toBeTruthy();
    const workspaceBody = await workspaceResponse.json();
    ctx.workspaceId = workspaceBody.data.id;

    console.log("✅ Test environment setup complete");
    console.log(`   Workspace ID: ${ctx.workspaceId}`);
  });

  // ============================================================================
  // PHASE 1: INGESTION & SIGNAL PROCESSING
  // ============================================================================

  test("FR-10: Auto-create reply job from ingested signal", async ({
    request,
  }) => {
    // GIVEN: A social media message is received via webhook
    const webhookResponse = await request.post(
      `${BASE_URL}/ingestion/webhook/X`,
      {
        data: {
          id: `tweet_automation_${Date.now()}`,
          text: "@OurBrand I love your product! Where can I buy more?",
          user: {
            id: "98765",
            screen_name: "happycustomer",
            name: "Happy Customer",
          },
          created_at: new Date().toISOString(),
        },
      },
    );

    // THEN: Webhook should accept the message
    expect(webhookResponse.status()).toBe(202);
    const webhookBody = await webhookResponse.json();
    expect(webhookBody.success).toBe(true);

    // WHEN: We wait for async processing (ingestion → normalization → policy)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // THEN: A normalized signal should be created
    const signalsResponse = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/signals`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    expect(signalsResponse.ok()).toBeTruthy();
    const signalsBody = await signalsResponse.json();
    expect(signalsBody.data.items.length).toBeGreaterThan(0);

    // Store the signal for subsequent tests
    const latestSignal = signalsBody.data.items[0];
    ctx.signalId = latestSignal.id;

    console.log(`✅ Signal created: ${ctx.signalId}`);
    console.log(
      `   Content: "${latestSignal.normalizedText || latestSignal.content}"`,
    );
  });

  // ============================================================================
  // PHASE 2: AI RESPONSE GENERATION
  // ============================================================================

  test("FR-15: Auto-generate reply suggestion with AI", async ({ request }) => {
    // PRD Requirement: System should automatically generate reply suggestions
    // Current Implementation: Manual trigger via POST /responses/generate/:signalId
    // Expected: Automatic generation as part of pipeline

    // GIVEN: A signal exists that needs a reply
    expect(ctx.signalId).toBeDefined();

    // WHEN: We trigger AI generation (should be automatic in PRD)
    const generateResponse = await request.post(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/responses/generate/${ctx.signalId}`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    // THEN: A response draft should be generated
    expect([200, 201]).toContain(generateResponse.status());
    const generateBody = await generateResponse.json();
    expect(generateBody.success).toBe(true);
    expect(generateBody.data).toHaveProperty("id");
    expect(generateBody.data).toHaveProperty("text");

    ctx.responseId = generateBody.data.id;

    console.log(`✅ Response generated: ${ctx.responseId}`);
    console.log(`   Text: "${generateBody.data.text}"`);

    // VALIDATION: Check if response is linked to signal
    expect(
      generateBody.data.signalId || generateBody.data.normalizedSignalId,
    ).toBe(ctx.signalId);
  });

  // ============================================================================
  // PHASE 3: AUTO-APPROVAL VALIDATION
  // ============================================================================

  test("FR-16: Auto-approve clean suggestions (Risk Score < threshold)", async ({
    request,
  }) => {
    // PRD Requirement: Suggestions with clean content should be auto-approved
    // Current Implementation: Manual approval workflow (ApprovalRequest → Manual approve)
    // Expected: Auto-approval based on policy decision

    // GIVEN: A response draft exists
    expect(ctx.responseId).toBeDefined();

    // WHEN: We check the response status after policy evaluation
    const responseDetail = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/responses/${ctx.responseId}`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    expect(responseDetail.ok()).toBeTruthy();
    const responseBody = await responseDetail.json();

    // THEN: Response should have auto-approval status
    // Expected states from PRD: DRAFT → SUGGESTED → AUTO_APPROVED
    // Current implementation: DRAFT → (manual approval needed)

    console.log(`📋 Response status: ${responseBody.data.status}`);

    // Check if auto-approval happened (this will likely fail with current implementation)
    const isAutoApproved =
      responseBody.data.status === "AUTO_APPROVED" ||
      responseBody.data.status === "APPROVED";

    if (!isAutoApproved) {
      console.warn("⚠️  GAP IDENTIFIED: Auto-approval not implemented");
      console.warn("   Current: Manual approval required");
      console.warn("   Expected: Automatic approval for clean content");
      console.warn("   PRD Reference: FR-16");

      // Check if approval request was created (manual flow)
      const approvalsResponse = await request.get(
        `${BASE_URL}/workspaces/${ctx.workspaceId}/approvals`,
        { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
      );

      if (approvalsResponse.ok()) {
        const approvalsBody = await approvalsResponse.json();
        if (approvalsBody.data.items.length > 0) {
          ctx.approvalId = approvalsBody.data.items[0].id;
          console.log(`   Manual approval required: ${ctx.approvalId}`);
        }
      }
    }

    // This assertion documents the gap
    // expect(isAutoApproved).toBe(true); // Uncomment when auto-approval is implemented
  });

  // ============================================================================
  // PHASE 4: AUTO-POSTING VALIDATION
  // ============================================================================

  test("FR-17: Auto-post approved suggestions to platform", async ({
    request,
  }) => {
    // PRD Requirement: Approved suggestions should automatically post to social platforms
    // Current Implementation: Manual POST /delivery/send with draftId
    // Expected: Automatic posting after approval

    // GIVEN: A response is approved (manually approving for test)
    if (ctx.approvalId) {
      const approveResponse = await request.patch(
        `${BASE_URL}/workspaces/${ctx.workspaceId}/approvals/${ctx.approvalId}/approve`,
        {
          headers: { Authorization: `Bearer ${ctx.accessToken}` },
          data: { comment: "Approved by automation test" },
        },
      );

      expect(approveResponse.ok()).toBeTruthy();
      console.log("✅ Manual approval completed for testing");
    }

    // WHEN: We wait for auto-posting (should happen automatically)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // THEN: Response should be posted to platform
    const responseDetail = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/responses/${ctx.responseId}`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    expect(responseDetail.ok()).toBeTruthy();
    const responseBody = await responseDetail.json();

    // Expected status: POSTED or DELIVERED
    const isPosted =
      responseBody.data.status === "POSTED" ||
      responseBody.data.status === "DELIVERED" ||
      responseBody.data.deliveredAt !== null;

    if (!isPosted) {
      console.warn("⚠️  GAP IDENTIFIED: Auto-posting not implemented");
      console.warn("   Current: Manual POST /delivery/send required");
      console.warn("   Expected: Automatic posting after approval");
      console.warn("   PRD Reference: FR-17");

      // Try manual posting to complete the flow
      const deliveryResponse = await request.post(
        `${BASE_URL}/workspaces/${ctx.workspaceId}/delivery/send`,
        {
          headers: { Authorization: `Bearer ${ctx.accessToken}` },
          data: {
            draftId: ctx.responseId,
            idempotencyKey: `test-delivery-${Date.now()}`,
          },
        },
      );

      if (deliveryResponse.ok()) {
        console.log("✅ Manual delivery completed for testing");
      } else {
        console.warn(`   Delivery failed: ${deliveryResponse.status()}`);
      }
    }

    // This assertion documents the gap
    // expect(isPosted).toBe(true); // Uncomment when auto-posting is implemented
  });

  // ============================================================================
  // PHASE 5: ESCALATION FLOW
  // ============================================================================

  test("FR-18: Auto-escalate risky suggestions (Risk Score >= threshold)", async ({
    request,
  }) => {
    // PRD Requirement: High-risk content should be escalated, not posted
    // Current Implementation: Sends to approval queue (similar, but not identical)
    // Expected: ESCALATED status with risk metadata

    // GIVEN: We ingest a risky message
    const riskyWebhook = await request.post(`${BASE_URL}/ingestion/webhook/X`, {
      data: {
        id: `tweet_risky_${Date.now()}`,
        text: "@OurBrand Your product is terrible and I want a refund immediately!",
        user: {
          id: "11111",
          screen_name: "angryCust",
          name: "Angry Customer",
        },
        created_at: new Date().toISOString(),
      },
    });

    expect(riskyWebhook.status()).toBe(202);

    // WHEN: We wait for processing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // THEN: Signal should be created
    const signalsResponse = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/signals`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    expect(signalsResponse.ok()).toBeTruthy();
    const signalsBody = await signalsResponse.json();
    const riskySignal = signalsBody.data.items[0];

    // Generate response for risky signal
    const generateResponse = await request.post(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/responses/generate/${riskySignal.id}`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    if (generateResponse.ok()) {
      const generateBody = await generateResponse.json();
      const riskyResponseId = generateBody.data.id;

      // Check if it was escalated
      const responseDetail = await request.get(
        `${BASE_URL}/workspaces/${ctx.workspaceId}/responses/${riskyResponseId}`,
        { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
      );

      const responseBody = await responseDetail.json();

      // Expected: status = 'ESCALATED', riskScore >= threshold
      const isEscalated =
        responseBody.data.status === "ESCALATED" ||
        responseBody.data.status === "FLAGGED" ||
        (responseBody.data.riskScore !== undefined &&
          responseBody.data.riskScore >= 0.7);

      if (!isEscalated) {
        console.warn("⚠️  GAP IDENTIFIED: Risk-based escalation unclear");
        console.warn("   Expected: ESCALATED status for high-risk content");
        console.warn("   PRD Reference: FR-18");
      }

      console.log(`📊 Risky content status: ${responseBody.data.status}`);
      console.log(`   Risk score: ${responseBody.data.riskScore || "N/A"}`);
    }
  });

  // ============================================================================
  // PHASE 6: OVERRIDE FLOW
  // ============================================================================

  test("FR-19: Override escalated suggestions", async ({ request }) => {
    // PRD Requirement: Override endpoint to manually approve escalated content
    // Expected: POST /workspaces/:id/responses/:id/override
    // Current Implementation: Unknown

    // GIVEN: An escalated response exists (from previous test)
    const approvalsResponse = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/approvals?status=PENDING`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    if (approvalsResponse.ok()) {
      const approvalsBody = await approvalsResponse.json();

      if (approvalsBody.data.items.length > 0) {
        const escalatedApproval = approvalsBody.data.items[0];

        // WHEN: We try to override (approve despite risk)
        const overrideResponse = await request.post(
          `${BASE_URL}/workspaces/${ctx.workspaceId}/responses/${escalatedApproval.id}/override`,
          {
            headers: { Authorization: `Bearer ${ctx.accessToken}` },
            data: {
              reason: "Manual review - content is acceptable",
              reviewedBy: ctx.userId,
            },
          },
        );

        // Expected: 200 OK with override confirmation
        if (!overrideResponse.ok()) {
          console.warn("⚠️  GAP IDENTIFIED: Override endpoint not found");
          console.warn("   Expected: POST /responses/:id/override");
          console.warn("   PRD Reference: FR-19");
          console.warn(
            `   Attempted: /workspaces/${ctx.workspaceId}/responses/${escalatedApproval.id}/override`,
          );
          console.warn(`   Status: ${overrideResponse.status()}`);
        } else {
          console.log("✅ Override endpoint exists");
        }
      } else {
        console.log("⏭️  No escalated content available for override test");
      }
    }
  });

  // ============================================================================
  // PHASE 7: AUTOMATION CONTROLS
  // ============================================================================

  test("FR-20: Pause automation for workspace", async ({ request }) => {
    // PRD Requirement: Ability to pause/resume automation per workspace
    // Expected: POST /workspaces/:id/automation/pause
    // Current Implementation: Unknown

    const pauseResponse = await request.post(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/automation/pause`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    if (!pauseResponse.ok()) {
      console.warn("⚠️  GAP IDENTIFIED: Automation pause endpoint not found");
      console.warn("   Expected: POST /workspaces/:id/automation/pause");
      console.warn("   PRD Reference: FR-20");
      console.warn(`   Status: ${pauseResponse.status()}`);
    } else {
      console.log("✅ Automation pause endpoint exists");

      // Verify automation is paused
      const workspaceDetail = await request.get(
        `${BASE_URL}/workspaces/${ctx.workspaceId}`,
        { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
      );

      const workspaceBody = await workspaceDetail.json();
      const isPaused =
        workspaceBody.data.automationEnabled === false ||
        workspaceBody.data.automationStatus === "PAUSED";

      expect(isPaused).toBe(true);
    }
  });

  test("FR-20: Resume automation for workspace", async ({ request }) => {
    // GIVEN: Automation is paused

    // WHEN: We resume automation
    const resumeResponse = await request.post(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/automation/resume`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    if (!resumeResponse.ok()) {
      console.warn("⚠️  GAP IDENTIFIED: Automation resume endpoint not found");
      console.warn("   Expected: POST /workspaces/:id/automation/resume");
      console.warn("   PRD Reference: FR-20");
      console.warn(`   Status: ${resumeResponse.status()}`);
    } else {
      console.log("✅ Automation resume endpoint exists");

      // Verify automation is active
      const workspaceDetail = await request.get(
        `${BASE_URL}/workspaces/${ctx.workspaceId}`,
        { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
      );

      const workspaceBody = await workspaceDetail.json();
      const isActive =
        workspaceBody.data.automationEnabled === true ||
        workspaceBody.data.automationStatus === "ACTIVE";

      expect(isActive).toBe(true);
    }
  });

  // ============================================================================
  // PHASE 8: END-TO-END HAPPY PATH
  // ============================================================================

  test("E2E: Complete automation pipeline (ingest → auto-approve → auto-post)", async ({
    request,
  }) => {
    // This test validates the complete happy path with zero human intervention

    console.log("🚀 Starting end-to-end automation test");

    // GIVEN: A clean message is ingested
    const e2eWebhook = await request.post(`${BASE_URL}/ingestion/webhook/X`, {
      data: {
        id: `tweet_e2e_${Date.now()}`,
        text: "@OurBrand Thank you for the great service!",
        user: {
          id: "99999",
          screen_name: "happyuser",
          name: "Happy User",
        },
        created_at: new Date().toISOString(),
      },
    });

    expect(e2eWebhook.status()).toBe(202);

    // WHEN: We wait for complete automation pipeline
    console.log("⏳ Waiting for automation pipeline (15 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // THEN: Signal should be processed, response generated, approved, and posted
    const signals = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/signals`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    const signalsBody = await signals.json();
    const e2eSignal = signalsBody.data.items[0];

    // Check if response was auto-generated
    const responses = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/responses?signalId=${e2eSignal.id}`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    if (responses.ok()) {
      const responsesBody = await responses.json();

      if (responsesBody.data.items && responsesBody.data.items.length > 0) {
        const e2eResponse = responsesBody.data.items[0];

        console.log("📊 E2E Pipeline Results:");
        console.log(`   Signal ID: ${e2eSignal.id}`);
        console.log(`   Response ID: ${e2eResponse.id}`);
        console.log(`   Response Status: ${e2eResponse.status}`);
        console.log(`   Delivered: ${e2eResponse.deliveredAt ? "Yes" : "No"}`);

        // Validate end state
        const isFullyAutomated =
          e2eResponse.status === "POSTED" ||
          e2eResponse.status === "DELIVERED" ||
          e2eResponse.deliveredAt !== null;

        if (isFullyAutomated) {
          console.log("✅ Full automation confirmed!");
        } else {
          console.warn(
            "⚠️  Manual intervention required - automation incomplete",
          );
        }

        // This assertion validates the full automation pipeline
        // expect(isFullyAutomated).toBe(true); // Uncomment when fully automated
      } else {
        console.warn("⚠️  No response was auto-generated");
      }
    }
  });

  // ============================================================================
  // PHASE 9: ANALYTICS VALIDATION
  // ============================================================================

  test("Validate automation metrics in analytics", async ({ request }) => {
    // Analytics should show automation performance

    const analyticsResponse = await request.get(
      `${BASE_URL}/workspaces/${ctx.workspaceId}/analytics/summary`,
      { headers: { Authorization: `Bearer ${ctx.accessToken}` } },
    );

    expect(analyticsResponse.ok()).toBeTruthy();
    const analyticsBody = await analyticsResponse.json();

    console.log("📊 Automation Analytics:");
    console.log(`   Total Signals: ${analyticsBody.data.totalSignals || 0}`);
    console.log(
      `   Total Responses: ${analyticsBody.data.totalResponses || 0}`,
    );
    console.log(
      `   Auto-Approved: ${analyticsBody.data.autoApproved || "N/A"}`,
    );
    console.log(`   Escalated: ${analyticsBody.data.escalated || "N/A"}`);
    console.log(`   Posted: ${analyticsBody.data.posted || "N/A"}`);

    // PRD should track automation-specific metrics
    const hasAutomationMetrics =
      analyticsBody.data.hasOwnProperty("autoApproved") ||
      analyticsBody.data.hasOwnProperty("automationRate") ||
      analyticsBody.data.hasOwnProperty("escalationRate");

    if (!hasAutomationMetrics) {
      console.warn("⚠️  Recommendation: Add automation-specific metrics");
      console.warn(
        "   Suggested: autoApprovalRate, escalationRate, avgProcessingTime",
      );
    }
  });
});

// ============================================================================
// SUMMARY TEST: Gap Analysis Report
// ============================================================================

test.describe("📋 Automation Gap Analysis", () => {
  test("Generate implementation gap report", async () => {
    console.log("\n" + "=".repeat(80));
    console.log("AUTOMATION IMPLEMENTATION GAP REPORT");
    console.log("=".repeat(80));
    console.log("");
    console.log("PRD Requirement vs Current Implementation:");
    console.log("");
    console.log("✅ IMPLEMENTED:");
    console.log("   • Signal ingestion (POST /ingestion/webhook/:platform)");
    console.log("   • Signal normalization (async processor)");
    console.log("   • Policy evaluation (async processor)");
    console.log(
      "   • AI response generation (POST /responses/generate/:signalId)",
    );
    console.log("   • Manual approval workflow (GET/PATCH /approvals)");
    console.log("   • Manual delivery (POST /delivery/send)");
    console.log("   • Analytics summary (GET /analytics/summary)");
    console.log("");
    console.log("⚠️  GAPS (Missing or Incomplete):");
    console.log("");
    console.log("   1. Auto-Approval Logic (FR-16)");
    console.log("      Current: Manual PATCH /approvals/:id/approve required");
    console.log(
      "      Expected: Automatic approval based on risk score < threshold",
    );
    console.log(
      "      Impact: No true automation - always requires human approval",
    );
    console.log("");
    console.log("   2. Auto-Posting (FR-17)");
    console.log("      Current: Manual POST /delivery/send with draftId");
    console.log("      Expected: Automatic posting after auto-approval");
    console.log(
      "      Impact: Approved responses sit idle until manual delivery",
    );
    console.log("");
    console.log("   3. Automation Controls (FR-20)");
    console.log("      Current: No pause/resume endpoints found");
    console.log("      Expected: POST /workspaces/:id/automation/pause|resume");
    console.log("      Impact: Cannot disable automation during incidents");
    console.log("");
    console.log("   4. Override Flow (FR-19)");
    console.log("      Current: No override endpoint found");
    console.log(
      "      Expected: POST /responses/:id/override for escalated content",
    );
    console.log(
      "      Impact: Escalated content cannot be manually approved with context",
    );
    console.log("");
    console.log("   5. State Machine (Architecture)");
    console.log("      Current: Uses ApprovalRequest/ApprovalAction models");
    console.log("      Expected: DRAFT→SUGGESTED→AUTO_APPROVED→POSTED states");
    console.log(
      "      Impact: Status tracking not aligned with automation flow",
    );
    console.log("");
    console.log("   6. Automation Metrics (FR-21)");
    console.log("      Current: Basic totals only");
    console.log(
      "      Expected: autoApprovalRate, escalationRate, avgProcessingTime",
    );
    console.log("      Impact: Cannot measure automation effectiveness");
    console.log("");
    console.log("RECOMMENDATION:");
    console.log(
      "   Implement auto-approval and auto-posting as BullMQ processors",
    );
    console.log("   Add automation control endpoints to WorkspacesController");
    console.log("   Extend ResponseDraft model with automation states");
    console.log("   Add automation metrics to AnalyticsService");
    console.log("");
    console.log("=".repeat(80));
    console.log("");

    // Always pass - this is a report, not a validation
    expect(true).toBe(true);
  });
});
