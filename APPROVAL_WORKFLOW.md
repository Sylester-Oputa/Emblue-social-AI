# Response Approval Workflow Guide

## Overview

After generating AI responses for social media signals, you have multiple ways to approve and manage them based on their status.

---

## Response Statuses

### 🔵 DRAFT
- **What it means**: Manually created or newly generated responses that haven't been processed yet
- **Where to find**: Signal detail page → Response Drafts section
- **Actions available**: 
  - ✅ **Approve** - Moves to APPROVED status, ready for sending
  - ❌ **Reject** - Moves to REJECTED status

### 🟠 ESCALATED
- **What it means**: High-risk responses (risk score ≥ threshold) requiring human review
- **Where to find**: 
  - **Main location**: `/escalated` page (Escalation Queue)
  - Also visible on signal detail pages
- **Actions available**:
  - ✅ **Approve** - Overrides AI decision, moves to OVERRIDE_APPROVED
  - ❌ **Reject** - Moves to REJECTED status
- **Visual indicator**: Orange left border with AlertTriangle icon

### 🟢 AUTO_APPROVED
- **What it means**: Low-risk responses automatically approved by AI (risk score < threshold)
- **Where to find**: Signal detail page → Response Drafts section
- **Actions available**:
  - ✅ **Approve** - Confirms approval, moves to APPROVED status
  - ❌ **Reject** - Rejects despite AI approval, moves to REJECTED

### ✅ APPROVED / OVERRIDE_APPROVED
- **What it means**: Responses approved and ready to be sent to social platforms
- **Next step**: Use the delivery/send functionality to post to the platform
- **No further approval needed**

### 📤 SENT / POSTED
- **What it means**: Responses successfully delivered to the social platform
- **Actions available**: None (completed)

### ❌ REJECTED
- **What it means**: Responses rejected and won't be sent
- **Actions available**: None (can regenerate new response if needed)

---

## Step-by-Step: How to Approve a Response

### Method 1: From Signal Detail Page

1. **Navigate to Signals**
   - Go to `/signals` page
   - Click on any signal to view details

2. **Generate Response** (if not already generated)
   - Click the **"Generate AI Response"** button in the right sidebar
   - Wait for AI to generate the response
   - The response will appear in the "Response Drafts" section below

3. **Review the Response**
   - Read the generated text carefully
   - Check the **Confidence** score (higher is better)
   - Check the **Risk Score** (lower is safer)
   - Note the **Status** badge (DRAFT, ESCALATED, AUTO_APPROVED)

4. **Take Action**
   - Click **👍 Approve** to approve the response
   - Click **👎 Reject** to reject the response
   - Success toast will appear confirming your action

5. **After Approval**
   - Status changes to APPROVED or OVERRIDE_APPROVED
   - Response is ready to be sent to the platform
   - Use delivery/send functionality to post it

---

### Method 2: From Escalation Queue (for high-risk responses)

1. **Navigate to Escalation Queue**
   - Go to `/escalated` page
   - See all high-risk responses requiring review

2. **Review Each Escalated Draft**
   - **Original Signal**: Shows the customer's message
   - **AI-Generated Response**: Shows what the AI wants to reply
   - **Risk Indicators**: Tags showing why it was escalated
   - **Confidence & Risk Scores**: Numerical indicators

3. **Take Action**
   - Click **✓ Approve** to override AI decision and approve
   - Click **✗ Reject** to reject the response
   - Optionally click **"View Signal"** to see full context

4. **Badge Indicator**
   - Top-right shows: "🛡️ X pending review" (total escalated items)

---

## Status Transitions

```
DRAFT
  ├─ Approve → APPROVED
  └─ Reject  → REJECTED

ESCALATED
  ├─ Approve → OVERRIDE_APPROVED
  └─ Reject  → REJECTED

AUTO_APPROVED
  ├─ Approve → APPROVED
  └─ Reject  → REJECTED

APPROVED / OVERRIDE_APPROVED
  └─ Send → SENT/POSTED
```

---

## Visual Indicators

### Status Colors (on signal detail page)
- 🔵 DRAFT: Gray border and background
- 🟢 APPROVED / AUTO_APPROVED: Green border and background
- 🟠 ESCALATED: Orange border and background
- 🔴 FAILED: Red border and background
- 📘 SENT / POSTED: Blue border and background

### Action Buttons Display Rules
**Approve/Reject buttons appear for:**
- ✅ DRAFT status
- ✅ ESCALATED status
- ✅ AUTO_APPROVED status

**No action buttons for:**
- ❌ APPROVED (already approved)
- ❌ SENT/POSTED (already sent)
- ❌ REJECTED (already rejected)
- ❌ FAILED (delivery failed)

---

## Platform Icons

All responses now display the correct social media platform icon:
- **X (Twitter)**: 𝕏 icon from react-icons
- **Instagram**: 📷 Instagram icon
- **Facebook**: 👤 Facebook icon
- **TikTok**: ♪ TikTok icon

---

## Tips for Efficient Approval

1. **Use Escalation Queue for bulk review**
   - Review all high-risk items in one place
   - Faster than checking individual signals

2. **Check confidence scores**
   - High confidence (>80%) → Usually safe to approve
   - Low confidence (<50%) → Review carefully

3. **Read the original signal context**
   - Always understand what the customer said
   - Ensure response is appropriate and accurate

4. **Monitor risk scores**
   - Risk score is visible in response metadata
   - High risk doesn't always mean bad - just needs review

5. **Use Demo Mode to test**
   - Click "Demo Mode" button in header
   - Generates sample webhook data
   - Test the approval flow with fake data

---

## Troubleshooting

### "Override only allowed on..." error
✅ **Fixed!** All statuses (DRAFT, ESCALATED, AUTO_APPROVED) now support approval

### Response doesn't appear after generating
1. Refresh the page
2. Check browser console for errors
3. Verify backend is running on port 3005

### Can't see approve buttons
- Check the response status
- Buttons only appear for DRAFT, ESCALATED, AUTO_APPROVED
- Already approved responses don't show buttons

### Approve action fails
1. Check you're logged in with correct permissions
2. Verify workspaceId is correct
3. Check backend logs for detailed error

---

## API Endpoints

For developers/debugging:

```
POST /workspaces/:workspaceId/responses/:responseId/override
Body: { action: "approve" | "reject", reason?: string }

Supported statuses: DRAFT, ESCALATED, AUTO_APPROVED
```

---

## Summary

**Quick Reference:**

1. Go to `/signals` → Click signal → Click "Generate AI Response"
2. Review generated response (confidence, risk, content)
3. Click **👍 Approve** or **👎 Reject**
4. For high-risk items, check `/escalated` queue
5. After approval, use send/delivery to post to platform

**That's it!** The approval workflow is now fully functional across all response statuses.
