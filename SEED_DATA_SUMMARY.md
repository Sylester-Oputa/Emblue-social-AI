# 🌱 Seed Data Summary

**Last Seeded:** March 26, 2026  
**Database:** PostgreSQL (via Prisma)

---

## 📊 Data Overview

| Entity | Count | Description |
|--------|-------|-------------|
| **Tenants** | 1 | Demo Tenant organization |
| **Workspaces** | 1 | Demo Workspace (automation enabled) |
| **Users** | 1 | Admin user (admin@demo.emblue.dev / DemoP@ss123) |
| **Policy Rules** | 15 | Content rules + risk detection policies |
| **Brand Profiles** | 1 | Demo Brand with tone/risk tolerance |
| **Platform Connections** | 4 | X, Instagram, Facebook, TikTok (all ACTIVE) |
| **Raw Events** | 100 | Platform webhook payloads |
| **Normalized Signals** | 100 | AI-processed messages (last 7 days) |
| **Sentiment Results** | 100 | Positive/Negative/Neutral classifications |
| **Intent Results** | 100 | Inquiry/Complaint/Praise/General |
| **Moderation Results** | 100 | Spam detection results |
| **Policy Decisions** | 100 | Risk scoring + approval requirements |
| **Response Drafts** | 60 | AI-generated replies (various statuses) |
| **Delivery Attempts** | ~30 | Posted messages with platform URLs |
| **Risk Events** | 20 | High-risk content escalations |
| **Approval Requests** | 25 | Manual review queue |
| **Approval Actions** | ~20 | Review decisions by admin |
| **Agent Runs** | 50 | AI generation audit logs |
| **Audit Logs** | 80 | System activity tracking |

---

## 🎯 Test Data Distribution

### Signals by Platform
- **X/Twitter:** 40 messages (mentions, replies)
- **Instagram:** 35 messages (comments, DMs)
- **Facebook:** 20 messages (post comments)
- **TikTok:** 15 messages (video comments)

### Signals by Sentiment
- **Positive:** ~35% (praise, satisfaction)
- **Negative:** ~35% (complaints, issues)
- **Neutral:** ~30% (questions, inquiries)

### Signals by Intent
- **PRAISE:** ~30% (testimonials, thank you)
- **COMPLAINT:** ~30% (issues, refunds, bugs)
- **INQUIRY:** ~35% (questions, support)
- **GENERAL:** ~5% (other interactions)

### Response Draft Status Distribution
- **DRAFT:** 10 drafts (pending generation)
- **AUTO_APPROVED:** 10 drafts (passed automation)
- **APPROVED:** 10 drafts (manually approved)
- **ESCALATED:** 10 drafts (high-risk, needs review)
- **SENT:** 10 drafts (posted to platform)
- **REJECTED:** 10 drafts (rejected by reviewer)

### Risk Events by Severity
- **CRITICAL:** ~25% (risk score 90+)
- **HIGH:** ~40% (risk score 80-89)
- **MEDIUM:** ~35% (risk score 70-79)

### Risk Events by Category
- **HARASSMENT:** ~20%
- **SELF_HARM:** ~15%
- **FRAUD:** ~15%
- **LEGAL_THREAT:** ~15%
- **PII_LEAK:** ~15%
- **OFF_BRAND:** ~20%

---

## 🔑 Test Credentials

### Admin User
- **Email:** admin@demo.emblue.dev
- **Password:** DemoP@ss123
- **Role:** TENANT_ADMIN
- **Tenant:** Demo Tenant
- **Workspace:** Demo Workspace

### Platform Connections (Mock Mode)
All adapters are in **MOCK mode** (safe for testing):
- ✅ X/Twitter: `demo_x_account`
- ✅ Instagram: `demo_ig_account`
- ✅ Facebook: `demo_fb_account`
- ✅ TikTok: `demo_tt_account`

To enable live posting, set environment variables:
```env
X_CLIENT_ID=your_real_id
X_CLIENT_SECRET=your_real_secret
INSTAGRAM_CLIENT_ID=your_real_id
INSTAGRAM_CLIENT_SECRET=your_real_secret
```

---

## 📄 Pages That Should Now Be Populated

### Dashboard Pages
1. **Signals Feed** (`/signals`)
   - 100 messages across all platforms
   - Real-time status updates (NORMALIZED, ACTIONED)
   - Sentiment/intent labels
   - Platform icons

2. **Response Drafts** (`/responses`)
   - 60 drafts in various states
   - Risk scores and levels
   - Approval timestamps
   - Post URLs for sent messages

3. **Approval Queue** (`/approvals`)
   - 25 pending/reviewed requests
   - Priority levels (1-3)
   - SLA deadlines
   - Approval actions history

4. **Risk Events** (`/risk-events`)
   - 20 escalations
   - Severity badges (CRITICAL/HIGH/MEDIUM)
   - Category tags
   - Open/Acknowledged/Resolved states

5. **Audit Logs** (`/audit`)
   - 80 system events
   - User and system actions
   - Resource tracking
   - Timestamps

6. **Agent Runs** (`/agent-runs`)
   - 50 AI generation logs
   - Success/failed/timeout states
   - Token counts
   - Latency metrics

7. **Policy Rules** (`/policies`)
   - 15 active rules
   - Priority ordering
   - Rule keys

8. **Platform Integrations** (`/integrations`)
   - 4 connected accounts
   - Status badges (ACTIVE)
   - OAuth configurations

---

## 🔄 Re-Running the Seed

To regenerate fresh test data:

```bash
cd backend
npm run db:seed
```

The seed script will:
1. Preserve tenant/workspace/user data
2. Clear all old signals/drafts/events
3. Generate 100 new signals with realistic distribution
4. Create 60 drafts in various approval states
5. Generate risk events, approvals, agent runs, audit logs

---

## 🎪 Sample Data Highlights

### High-Risk Messages (Auto-Escalated)
- "This is garbage. Waste of money. Don't buy." (Risk: 87)
- "False advertising. Reporting to FTC." (Risk: 92)
- "I want to speak to your manager. This is unacceptable!" (Risk: 78)

### Positive Feedback (Auto-Approved & Posted)
- "Your app saved me 10 hours of work this week. Thank you!"
- "Best quality I've ever seen. 10/10!"
- "Game changer for my business. Worth every penny!"

### Common Inquiries (Auto-Generated Replies)
- "How do I reset my password? The help page is confusing."
- "Do you ship internationally? Specifically to Germany?"
- "What's your return policy?"

### Spam Detected (Blocked)
- "Get rich fast with crypto! Click here: scam.link/xyz"
- "Follow for follow? Let's grow together!"
- "Win free iPhone now! Click here!"

---

## 🧪 Testing Checklist

- [ ] Login with admin credentials
- [ ] View populated signals feed
- [ ] Check response drafts in all states
- [ ] Review approval queue with priorities
- [ ] Inspect risk events dashboard
- [ ] View audit logs timeline
- [ ] Check agent run history
- [ ] Test platform connection status
- [ ] Verify KPI metrics calculation
- [ ] Test pagination on all list views

---

**All pages should now display realistic, varied test data!** 🎉
