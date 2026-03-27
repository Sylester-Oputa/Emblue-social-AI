import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-tenant" },
    update: {},
    create: {
      name: "Demo Tenant",
      slug: "demo-tenant",
    },
  });
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.id})`);

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "demo-workspace" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Demo Workspace",
      slug: "demo-workspace",
    },
  });
  console.log(`  ✓ Workspace: ${workspace.name} (${workspace.id})`);

  // Create default approval queue
  let queue = await prisma.approvalQueue.findFirst({
    where: { workspaceId: workspace.id, isDefault: true },
  });
  if (!queue) {
    queue = await prisma.approvalQueue.create({
      data: {
        workspaceId: workspace.id,
        name: "Default Approval Queue",
        isDefault: true,
        slaHours: 24,
      },
    });
    console.log("  ✓ Default approval queue created");
  }

  // Create demo admin user
  const passwordHash = await bcrypt.hash("DemoP@ss123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.emblue.dev" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.emblue.dev",
      passwordHash,
      firstName: "Demo",
      lastName: "Admin",
      role: "TENANT_ADMIN",
    },
  });
  console.log(`  ✓ Admin user: ${admin.email}`);

  // Create membership
  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: admin.id, workspaceId: workspace.id },
    },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: admin.id,
        workspaceId: workspace.id,
        role: "TENANT_ADMIN",
      },
    });
    console.log("  ✓ Admin membership created");
  }

  // Create default policy rules
  const defaultRules = [
    {
      ruleKey: "moderation_block",
      name: "Block moderated content",
      priority: 1,
    },
    {
      ruleKey: "missing_scope",
      name: "Block if missing OAuth scope",
      priority: 2,
    },
    {
      ruleKey: "dm_permission",
      name: "Require approval for DM actions",
      priority: 3,
    },
    { ruleKey: "rate_limit", name: "Block when rate limited", priority: 4 },
    {
      ruleKey: "daily_budget",
      name: "Block if daily budget exceeded",
      priority: 5,
    },
    {
      ruleKey: "negative_sentiment",
      name: "Review negative sentiment signals",
      priority: 6,
    },
    { ruleKey: "low_intent", name: "Review low-intent signals", priority: 7 },
    {
      ruleKey: "prohibited_terms",
      name: "Block prohibited brand terms",
      priority: 8,
    },
    {
      ruleKey: "risk_tolerance",
      name: "Apply brand risk tolerance",
      priority: 9,
    },
    {
      ruleKey: "tiktok_review",
      name: "Review non-like TikTok actions",
      priority: 10,
    },
  ];

  for (const rule of defaultRules) {
    await prisma.policyRule.upsert({
      where: {
        tenantId_ruleKey: { tenantId: tenant.id, ruleKey: rule.ruleKey },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...rule,
      },
    });
  }
  console.log(`  ✓ ${defaultRules.length} default policy rules created`);

  // Create brand profile
  const existingProfile = await prisma.brandProfile.findFirst({
    where: { workspaceId: workspace.id },
  });
  if (!existingProfile) {
    await prisma.brandProfile.create({
      data: {
        workspaceId: workspace.id,
        name: "Demo Brand",
        tone: "professional",
        prohibitedTerms: ["competitor-name", "vulgar-word"],
        riskTolerance: "MEDIUM",
        dailyBudget: 100,
      },
    });
    console.log("  ✓ Brand profile created");
  }

  // ── Demo Platform Connections ──
  const xConnection = await prisma.platformConnection.upsert({
    where: { id: "demo-x-connection" },
    update: {},
    create: {
      id: "demo-x-connection",
      workspaceId: workspace.id,
      platform: "X",
      accountId: "demo_x_account",
      accountName: "Demo Brand X",
      status: "ACTIVE",
    },
  });

  const igConnection = await prisma.platformConnection.upsert({
    where: { id: "demo-ig-connection" },
    update: {},
    create: {
      id: "demo-ig-connection",
      workspaceId: workspace.id,
      platform: "INSTAGRAM",
      accountId: "demo_ig_account",
      accountName: "Demo Brand Instagram",
      status: "ACTIVE",
    },
  });
  console.log("  ✓ Demo platform connections created (X, Instagram)");

  // ── Demo Signals ──
  const demoSignals = [
    {
      platform: "X" as const,
      externalId: "tweet_001",
      content: "Your product broke after 2 days. Terrible quality!",
      authorId: "user_angry_101",
      authorHandle: "@frustrated_buyer",
      actionType: "MENTION",
      sentiment: "NEGATIVE" as const,
      intent: "COMPLAINT" as const,
      isSpam: false,
    },
    {
      platform: "X" as const,
      externalId: "tweet_002",
      content: "How do I reset my password? The help page is confusing.",
      authorId: "user_confused_102",
      authorHandle: "@confused_user",
      actionType: "MENTION",
      sentiment: "NEUTRAL" as const,
      intent: "INQUIRY" as const,
      isSpam: false,
    },
    {
      platform: "X" as const,
      externalId: "tweet_003",
      content: "Just got my order and I love it! Best purchase this year 🎉",
      authorId: "user_happy_103",
      authorHandle: "@happy_customer",
      actionType: "MENTION",
      sentiment: "POSITIVE" as const,
      intent: "PRAISE" as const,
      isSpam: false,
    },
    {
      platform: "X" as const,
      externalId: "tweet_004",
      content: "Would be great if you added dark mode to the mobile app.",
      authorId: "user_suggest_104",
      authorHandle: "@feature_requester",
      actionType: "REPLY",
      sentiment: "NEUTRAL" as const,
      intent: "GENERAL" as const,
      isSpam: false,
    },
    {
      platform: "X" as const,
      externalId: "tweet_005",
      content: "Check out my crypto course! Free money guaranteed! bit.ly/scam",
      authorId: "user_spam_105",
      authorHandle: "@spambot_9000",
      actionType: "MENTION",
      sentiment: "NEUTRAL" as const,
      intent: "GENERAL" as const,
      isSpam: true,
    },
    {
      platform: "INSTAGRAM" as const,
      externalId: "ig_001",
      content: "This looks amazing! Where can I buy this?",
      authorId: "ig_user_201",
      authorHandle: "curious_shopper",
      actionType: "REPLY",
      sentiment: "POSITIVE" as const,
      intent: "INQUIRY" as const,
      isSpam: false,
    },
    {
      platform: "INSTAGRAM" as const,
      externalId: "ig_002",
      content: "I ordered size M but received XL. Please help!",
      authorId: "ig_user_202",
      authorHandle: "wrong_size_buyer",
      actionType: "REPLY",
      sentiment: "NEGATIVE" as const,
      intent: "COMPLAINT" as const,
      isSpam: false,
    },
    {
      platform: "INSTAGRAM" as const,
      externalId: "ig_003",
      content: "Your packaging is so eco-friendly, love it! ♻️",
      authorId: "ig_user_203",
      authorHandle: "eco_lover",
      actionType: "REPLY",
      sentiment: "POSITIVE" as const,
      intent: "PRAISE" as const,
      isSpam: false,
    },
    {
      platform: "INSTAGRAM" as const,
      externalId: "ig_004",
      content:
        "The colors in real life are nothing like the photos. Misleading.",
      authorId: "ig_user_204",
      authorHandle: "disappointed_buyer",
      actionType: "REPLY",
      sentiment: "NEGATIVE" as const,
      intent: "COMPLAINT" as const,
      isSpam: false,
    },
    {
      platform: "FACEBOOK" as const,
      externalId: "fb_001",
      content: "Do you ship internationally? Specifically to Germany?",
      authorId: "fb_user_301",
      authorHandle: "international_buyer",
      actionType: "REPLY",
      sentiment: "NEUTRAL" as const,
      intent: "INQUIRY" as const,
      isSpam: false,
    },
    {
      platform: "FACEBOOK" as const,
      externalId: "fb_002",
      content: "Been a loyal customer for 5 years. Keep up the great work!",
      authorId: "fb_user_302",
      authorHandle: "loyal_customer",
      actionType: "REPLY",
      sentiment: "POSITIVE" as const,
      intent: "PRAISE" as const,
      isSpam: false,
    },
    {
      platform: "FACEBOOK" as const,
      externalId: "fb_003",
      content: "The new app update is terrible. Crashes every time I open it.",
      authorId: "fb_user_303",
      authorHandle: "app_crasher",
      actionType: "REPLY",
      sentiment: "NEGATIVE" as const,
      intent: "COMPLAINT" as const,
      isSpam: false,
    },
    {
      platform: "TIKTOK" as const,
      externalId: "tiktok_001",
      content: "OMG this product is amazing!! Need this in my life 😍",
      authorId: "tt_user_401",
      authorHandle: "tiktok_fan",
      actionType: "REPLY",
      sentiment: "POSITIVE" as const,
      intent: "PRAISE" as const,
      isSpam: false,
    },
    {
      platform: "TIKTOK" as const,
      externalId: "tiktok_002",
      content: "Is this worth the price? Looks kinda expensive for what it is.",
      authorId: "tt_user_402",
      authorHandle: "price_checker",
      actionType: "REPLY",
      sentiment: "NEUTRAL" as const,
      intent: "INQUIRY" as const,
      isSpam: false,
    },
    {
      platform: "TIKTOK" as const,
      externalId: "tiktok_003",
      content: "Got mine yesterday and the quality is 🔥. Highly recommend!",
      authorId: "tt_user_403",
      authorHandle: "satisfied_tiktoker",
      actionType: "REPLY",
      sentiment: "POSITIVE" as const,
      intent: "PRAISE" as const,
      isSpam: false,
    },
  ];

  // ── EXPANDED DEMO SIGNALS (80+ messages) ──
  const expandedSignals = [
    ...demoSignals,
    // Additional X/Twitter messages (30 more)
    {
      platform: "X",
      externalId: "tweet_006",
      content:
        "Your customer service is outstanding! Fixed my issue in 5 minutes.",
      authorId: "user_106",
      authorHandle: "@service_fan",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_007",
      content: "When will you support Apple Pay? It's 2026 already...",
      authorId: "user_107",
      authorHandle: "@payment_asker",
      actionType: "MENTION",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_008",
      content: "This is garbage. Waste of money. Don't buy.",
      authorId: "user_108",
      authorHandle: "@angry_reviewer",
      actionType: "MENTION",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_009",
      content:
        "Just signed up for the premium plan. Excited to explore all features!",
      authorId: "user_109",
      authorHandle: "@new_premium",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "GENERAL",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_010",
      content: "Get rich fast with crypto! Click here: scam.link/xyz",
      authorId: "user_110",
      authorHandle: "@cryptoscam",
      actionType: "MENTION",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: true,
    },
    {
      platform: "X",
      externalId: "tweet_011",
      content: "Do you offer student discounts?",
      authorId: "user_111",
      authorHandle: "@student_buyer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_012",
      content: "Best brand on the market. No contest.",
      authorId: "user_112",
      authorHandle: "@superfan",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_013",
      content: "I want to speak to your manager. This is unacceptable!",
      authorId: "user_113",
      authorHandle: "@karen_energy",
      actionType: "MENTION",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_014",
      content: "Can you add integration with Slack?",
      authorId: "user_114",
      authorHandle: "@feature_suggester",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_015",
      content: "Your app saved me 10 hours of work this week. Thank you!",
      authorId: "user_115",
      authorHandle: "@productivity_win",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_016",
      content: "The mobile app keeps logging me out. Very annoying.",
      authorId: "user_116",
      authorHandle: "@logout_bug",
      actionType: "MENTION",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_017",
      content: "How long does shipping usually take?",
      authorId: "user_117",
      authorHandle: "@shipping_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_018",
      content: "Amazing product quality. Will recommend to all my friends!",
      authorId: "user_118",
      authorHandle: "@referrer",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_019",
      content: "I've been waiting for my refund for 3 weeks. What's going on?",
      authorId: "user_119",
      authorHandle: "@refund_waiter",
      actionType: "MENTION",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_020",
      content: "Does the premium plan include API access?",
      authorId: "user_120",
      authorHandle: "@api_developer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_021",
      content: "Your UI design is so clean and intuitive!",
      authorId: "user_121",
      authorHandle: "@design_lover",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_022",
      content: "404 error on your pricing page. FYI.",
      authorId: "user_122",
      authorHandle: "@bug_reporter",
      actionType: "MENTION",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_023",
      content: "This is the worst purchase I've made this year.",
      authorId: "user_123",
      authorHandle: "@regret_buyer",
      actionType: "MENTION",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_024",
      content: "What's your return policy?",
      authorId: "user_124",
      authorHandle: "@policy_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_025",
      content: "Absolutely love the new features in v3.0!",
      authorId: "user_125",
      authorHandle: "@version_fan",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_026",
      content: "Follow for follow? Let's grow together!",
      authorId: "user_126",
      authorHandle: "@f4f_bot",
      actionType: "MENTION",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: true,
    },
    {
      platform: "X",
      externalId: "tweet_027",
      content: "The checkout process is broken. Can't complete my order.",
      authorId: "user_127",
      authorHandle: "@checkout_fail",
      actionType: "MENTION",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_028",
      content: "Is there a Mac version?",
      authorId: "user_128",
      authorHandle: "@mac_user",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_029",
      content: "Game changer for my business. Worth every penny!",
      authorId: "user_129",
      authorHandle: "@business_user",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_030",
      content: "You promised a feature 6 months ago. Still waiting.",
      authorId: "user_130",
      authorHandle: "@promise_tracker",
      actionType: "MENTION",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_031",
      content: "Can I use this for commercial projects?",
      authorId: "user_131",
      authorHandle: "@license_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_032",
      content: "Fantastic onboarding experience. Very smooth!",
      authorId: "user_132",
      authorHandle: "@onboard_happy",
      actionType: "MENTION",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_033",
      content: "Security vulnerability in your login form. DM me for details.",
      authorId: "user_133",
      authorHandle: "@security_researcher",
      actionType: "MENTION",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_034",
      content: "Unsubscribe me from all your emails. Now.",
      authorId: "user_134",
      authorHandle: "@unsubscribe_me",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "GENERAL",
      isSpam: false,
    },
    {
      platform: "X",
      externalId: "tweet_035",
      content: "How do I export my data?",
      authorId: "user_135",
      authorHandle: "@data_exporter",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },

    // Additional Instagram messages (20 more)
    {
      platform: "INSTAGRAM",
      externalId: "ig_005",
      content: "Drop the link! Need to order this ASAP!",
      authorId: "ig_user_205",
      authorHandle: "eager_buyer",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_006",
      content: "Why is this so expensive? Not worth it.",
      authorId: "ig_user_206",
      authorHandle: "price_critic",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_007",
      content: "Do you ship to Canada?",
      authorId: "ig_user_207",
      authorHandle: "canadian_buyer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_008",
      content: "Obsessed with your aesthetic! 😍",
      authorId: "ig_user_208",
      authorHandle: "aesthetic_lover",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_009",
      content: "Check out my profile for similar products!",
      authorId: "ig_user_209",
      authorHandle: "competitor_spam",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: true,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_010",
      content: "My order still hasn't arrived. Order #12345",
      authorId: "ig_user_210",
      authorHandle: "waiting_customer",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_011",
      content: "What materials is this made from?",
      authorId: "ig_user_211",
      authorHandle: "conscious_buyer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_012",
      content: "Best quality I've ever seen. 10/10!",
      authorId: "ig_user_212",
      authorHandle: "quality_judge",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_013",
      content: "The color is different from what I expected. Disappointed.",
      authorId: "ig_user_213",
      authorHandle: "color_mismatch",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_014",
      content: "Is this available in size XL?",
      authorId: "ig_user_214",
      authorHandle: "size_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_015",
      content: "Your brand story is so inspiring!",
      authorId: "ig_user_215",
      authorHandle: "story_fan",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_016",
      content: "Never received my tracking number. This is unprofessional.",
      authorId: "ig_user_216",
      authorHandle: "tracking_missing",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_017",
      content: "Do you offer wholesale pricing?",
      authorId: "ig_user_217",
      authorHandle: "wholesale_interested",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_018",
      content: "Just recommended you to 5 colleagues. You're welcome!",
      authorId: "ig_user_218",
      authorHandle: "referral_king",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_019",
      content: "I want a refund. The product is defective.",
      authorId: "ig_user_219",
      authorHandle: "refund_requester",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_020",
      content: "Can I customize the color?",
      authorId: "ig_user_220",
      authorHandle: "custom_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_021",
      content: "This changed my daily routine for the better!",
      authorId: "ig_user_221",
      authorHandle: "routine_changer",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_022",
      content: "Follow my page for fashion tips! 💄",
      authorId: "ig_user_222",
      authorHandle: "fashion_spammer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: true,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_023",
      content: "The promo code doesn't work. Please fix.",
      authorId: "ig_user_223",
      authorHandle: "promo_failed",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "INSTAGRAM",
      externalId: "ig_024",
      content: "When's the next sale happening?",
      authorId: "ig_user_224",
      authorHandle: "sale_hunter",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },

    // Additional Facebook messages (20 more)
    {
      platform: "FACEBOOK",
      externalId: "fb_004",
      content: "Perfect gift for my mom's birthday. She loves it!",
      authorId: "fb_user_304",
      authorHandle: "gift_giver",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_005",
      content: "Your website is down. I can't place my order.",
      authorId: "fb_user_305",
      authorHandle: "website_down",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_006",
      content: "What's included in the basic plan?",
      authorId: "fb_user_306",
      authorHandle: "plan_comparer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_007",
      content: "Thank you for the quick response! Issue resolved.",
      authorId: "fb_user_307",
      authorHandle: "resolved_customer",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_008",
      content: "This doesn't work as advertised. False marketing.",
      authorId: "fb_user_308",
      authorHandle: "false_ad_claimer",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_009",
      content: "Can I cancel my subscription without penalty?",
      authorId: "fb_user_309",
      authorHandle: "cancel_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_010",
      content: "5 stars! Exceeded my expectations!",
      authorId: "fb_user_310",
      authorHandle: "five_star",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_011",
      content: "Received damaged item. Need replacement ASAP.",
      authorId: "fb_user_311",
      authorHandle: "damaged_goods",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_012",
      content: "Do you have physical stores?",
      authorId: "fb_user_312",
      authorHandle: "store_locator",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_013",
      content: "Loving the new update! Keep innovating!",
      authorId: "fb_user_313",
      authorHandle: "update_fan",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_014",
      content: "Win free iPhone now! Click here!",
      authorId: "fb_user_314",
      authorHandle: "giveaway_scam",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      isSpam: true,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_015",
      content: "I'm being charged twice. Fix this immediately.",
      authorId: "fb_user_315",
      authorHandle: "double_charge",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_016",
      content: "Are there any Black Friday deals coming?",
      authorId: "fb_user_316",
      authorHandle: "deal_hunter",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_017",
      content: "This solved a problem I didn't know I had!",
      authorId: "fb_user_317",
      authorHandle: "problem_solver",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_018",
      content: "Customer support never responds. Terrible service.",
      authorId: "fb_user_318",
      authorHandle: "no_response",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_019",
      content: "How secure is your payment system?",
      authorId: "fb_user_319",
      authorHandle: "security_conscious",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_020",
      content: "Three years with you and never had a problem. A+ service!",
      authorId: "fb_user_320",
      authorHandle: "long_term_fan",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_021",
      content: "The app crashes on Android 14. Please patch.",
      authorId: "fb_user_321",
      authorHandle: "android_crash",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_022",
      content: "What's the difference between Pro and Enterprise?",
      authorId: "fb_user_322",
      authorHandle: "tier_comparer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "FACEBOOK",
      externalId: "fb_023",
      content: "Thanks for making my job easier!",
      authorId: "fb_user_323",
      authorHandle: "grateful_worker",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },

    // Additional TikTok messages (15 more)
    {
      platform: "TIKTOK",
      externalId: "tiktok_004",
      content: "Link in bio? Where can I get this?",
      authorId: "tt_user_404",
      authorHandle: "link_seeker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_005",
      content: "This is a scam. Don't fall for it!",
      authorId: "tt_user_405",
      authorHandle: "scam_warner",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "GENERAL",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_006",
      content: "Yessss! Finally something that actually works!",
      authorId: "tt_user_406",
      authorHandle: "finally_works",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_007",
      content: "Is this available on Amazon?",
      authorId: "tt_user_407",
      authorHandle: "amazon_buyer",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_008",
      content: "10/10 would buy again!",
      authorId: "tt_user_408",
      authorHandle: "repeat_buyer",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_009",
      content: "Took 3 weeks to arrive. Way too slow.",
      authorId: "tt_user_409",
      authorHandle: "slow_shipping",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_010",
      content: "Does it come with a warranty?",
      authorId: "tt_user_410",
      authorHandle: "warranty_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_011",
      content: "I'm crying this is so good! 😭",
      authorId: "tt_user_411",
      authorHandle: "emotional_fan",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_012",
      content: "Mine arrived broken. Very disappointed.",
      authorId: "tt_user_412",
      authorHandle: "broken_arrival",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_013",
      content: "What colors do you have?",
      authorId: "tt_user_413",
      authorHandle: "color_options",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_014",
      content: "This is exactly what I needed! Chef's kiss! 👨‍🍳💋",
      authorId: "tt_user_414",
      authorHandle: "perfect_fit",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_015",
      content: "False advertising. Reporting to FTC.",
      authorId: "tt_user_415",
      authorHandle: "legal_threat",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_016",
      content: "Can I get this engraved?",
      authorId: "tt_user_416",
      authorHandle: "engraving_asker",
      actionType: "REPLY",
      sentiment: "NEUTRAL",
      intent: "INQUIRY",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_017",
      content: "Already ordered 3! Love love love!",
      authorId: "tt_user_417",
      authorHandle: "bulk_buyer",
      actionType: "REPLY",
      sentiment: "POSITIVE",
      intent: "PRAISE",
      isSpam: false,
    },
    {
      platform: "TIKTOK",
      externalId: "tiktok_018",
      content: "You blocked my account for no reason. Unacceptable!",
      authorId: "tt_user_418",
      authorHandle: "blocked_user",
      actionType: "REPLY",
      sentiment: "NEGATIVE",
      intent: "COMPLAINT",
      isSpam: false,
    },
  ];

  const createdSignals = [];

  // Check if signals already exist and clear old data for fresh seed
  const existingSignalsCount = await prisma.normalizedSignal.count({
    where: { workspaceId: workspace.id },
  });

  if (existingSignalsCount > 0) {
    console.log(
      `  ✓ Found ${existingSignalsCount} existing signals - clearing old data for fresh seed...`,
    );

    // Clean up related data first (in correct order due to foreign keys)
    await prisma.auditLog.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.agentRun.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.approvalAction.deleteMany({});
    const approvalRequests = await prisma.approvalRequest.findMany({
      where: { queue: { workspaceId: workspace.id } },
    });
    await prisma.approvalRequest.deleteMany({
      where: { id: { in: approvalRequests.map((r) => r.id) } },
    });
    await prisma.riskEvent.deleteMany({ where: { workspaceId: workspace.id } });
    await prisma.deliveryAttempt.deleteMany({});
    await prisma.policyDecision.deleteMany({});
    await prisma.responseDraft.deleteMany({
      where: { workspaceId: workspace.id },
    });
    await prisma.moderationResult.deleteMany({});
    await prisma.intentResult.deleteMany({});
    await prisma.sentimentResult.deleteMany({});
    await prisma.normalizedSignal.deleteMany({
      where: { workspaceId: workspace.id },
    });
    await prisma.rawEvent.deleteMany({ where: { workspaceId: workspace.id } });

    console.log("  ✓ Old data cleared");
  }

  // Create signals with varied timestamps (last 7 days)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < expandedSignals.length; i++) {
    const sig = expandedSignals[i];
    const timestamp = new Date(
      sevenDaysAgo + Math.random() * (now - sevenDaysAgo),
    );

    // Create raw event first
    const rawEvent = await prisma.rawEvent.create({
      data: {
        workspaceId: workspace.id,
        platform: sig.platform as any,
        externalEventId: sig.externalId,
        eventType: sig.actionType.toLowerCase(),
        payload: {
          text: sig.content,
          author_id: sig.authorId,
          author: sig.authorHandle,
          created_at: timestamp.toISOString(),
        },
        checksum: crypto
          .createHash("sha256")
          .update(sig.content + sig.externalId)
          .digest("hex"),
      },
    });

    // Create normalized signal
    const signal = await prisma.normalizedSignal.create({
      data: {
        workspaceId: workspace.id,
        rawEventId: rawEvent.id,
        platform: sig.platform as any,
        content: sig.content,
        authorId: sig.authorId,
        authorHandle: sig.authorHandle,
        actionType: sig.actionType,
        status: i < 50 ? "ACTIONED" : i < 70 ? "NORMALIZED" : "QUALIFIED",
        occurredAt: timestamp,
      },
    });

    // Create sentiment, intent, moderation results
    await prisma.sentimentResult.create({
      data: {
        signalId: signal.id,
        label: sig.sentiment as any,
        score:
          sig.sentiment === "POSITIVE"
            ? 0.75 + Math.random() * 0.2
            : sig.sentiment === "NEGATIVE"
              ? 0.1 + Math.random() * 0.3
              : 0.4 + Math.random() * 0.2,
        confidence: 0.8 + Math.random() * 0.15,
      },
    });

    await prisma.intentResult.create({
      data: {
        signalId: signal.id,
        label: sig.intent as any,
        score: 0.8 + Math.random() * 0.15,
        confidence: 0.85 + Math.random() * 0.1,
      },
    });

    await prisma.moderationResult.create({
      data: {
        signalId: signal.id,
        status: sig.isSpam ? "FLAGGED" : "PASSED",
        reasons: sig.isSpam ? ["spam", "promotional"] : [],
        confidence: 0.9 + Math.random() * 0.08,
      },
    });

    createdSignals.push(signal);
  }
  console.log(
    `  ✓ ${createdSignals.length} demo signals created with analysis`,
  );

  // ── Demo Response Drafts (60+ drafts) ──
  const draftTemplates = [
    {
      content:
        "Thank you for reaching out! We've noted your message and our team is looking into it. We'll get back to you shortly.",
      strategy: "empathy_first",
      riskScore: 10,
    },
    {
      content:
        "We appreciate your feedback! This helps us improve. Could you share more details via DM so we can assist further?",
      strategy: "solution_oriented",
      riskScore: 5,
    },
    {
      content:
        "Thanks for the kind words! We're thrilled you're enjoying our product. Feel free to reach out anytime!",
      strategy: "gratitude",
      riskScore: 8,
    },
    {
      content:
        "We're sorry to hear about your experience. Our support team will contact you within 24 hours to resolve this.",
      strategy: "apology_first",
      riskScore: 20,
    },
    {
      content:
        "Great question! You can find more information on our website at example.com/help or contact support@example.com.",
      strategy: "informative",
      riskScore: 12,
    },
    {
      content:
        "We value your loyalty! As a thank you, check your DMs for a special discount code.",
      strategy: "reward",
      riskScore: 15,
    },
    {
      content:
        "Thanks for reporting this! Our team is investigating and will have a fix deployed soon.",
      strategy: "acknowledgment",
      riskScore: 18,
    },
    {
      content:
        "We'd love to help! Please DM us your order number so we can look into this right away.",
      strategy: "direct_help",
      riskScore: 10,
    },
  ];

  const draftStatuses = [
    "DRAFT",
    "AUTO_APPROVED",
    "APPROVED",
    "ESCALATED",
    "SENT",
    "REJECTED",
  ];
  const createdDrafts = [];

  for (let i = 0; i < Math.min(60, createdSignals.length); i++) {
    const signal = createdSignals[i];
    const template = draftTemplates[i % draftTemplates.length];
    const status = draftStatuses[i % draftStatuses.length];
    const riskScore =
      status === "ESCALATED"
        ? 75 + Math.floor(Math.random() * 20)
        : template.riskScore + Math.floor(Math.random() * 15);

    const draft = await prisma.responseDraft.create({
      data: {
        workspaceId: workspace.id,
        signalId: signal.id,
        content: template.content,
        riskLevel:
          riskScore >= 70 ? "HIGH" : riskScore >= 50 ? "MEDIUM" : "LOW",
        riskScore,
        status: status as any,
        approvedBy:
          status === "AUTO_APPROVED"
            ? "system"
            : ["APPROVED", "SENT"].includes(status)
              ? admin.id
              : undefined,
        approvedAt: ["AUTO_APPROVED", "APPROVED", "SENT"].includes(status)
          ? new Date(signal.occurredAt.getTime() + 5 * 60 * 1000)
          : undefined,
        postedAt:
          status === "SENT"
            ? new Date(signal.occurredAt.getTime() + 10 * 60 * 1000)
            : undefined,
        platformPostId: status === "SENT" ? `demo_post_${i}` : undefined,
        platformPostUrl:
          status === "SENT"
            ? `https://${signal.platform.toLowerCase()}.com/status/demo_post_${i}`
            : undefined,
        metadata: {
          strategy: template.strategy,
          confidence: 0.75 + Math.random() * 0.2,
          ranking: (i % 3) + 1,
        },
      },
    });

    createdDrafts.push(draft);

    // Create delivery attempts for SENT drafts (30+ deliveries)
    if (status === "SENT") {
      await prisma.deliveryAttempt.create({
        data: {
          signalId: signal.id,
          draftId: draft.id,
          platform: signal.platform,
          status: "DELIVERED",
          idempotencyKey: `demo_delivery_${i}_${Date.now()}`,
          deliveredAt: new Date(signal.occurredAt.getTime() + 12 * 60 * 1000),
          providerResponse: {
            success: true,
            postId: `demo_post_${i}`,
            postUrl: `https://${signal.platform.toLowerCase()}.com/status/demo_post_${i}`,
            rateLimitRemaining: Math.floor(Math.random() * 100) + 50,
          },
        },
      });
    }
  }
  console.log(`  ✓ ${createdDrafts.length} demo response drafts created`);

  // ── Demo Policy Decisions (60+ decisions) ──
  for (let i = 0; i < Math.min(60, createdSignals.length); i++) {
    const signal = createdSignals[i];
    const draft = createdDrafts[i];
    const riskScore = draft?.riskScore || Math.floor(Math.random() * 100);

    const decisionStatuses = [
      "ALLOWED",
      "ALLOWED_WITH_REVIEW",
      "BLOCKED_POLICY",
      "BLOCKED_MODERATION",
    ];
    const status =
      riskScore >= 80
        ? "BLOCKED_POLICY"
        : riskScore >= 65
          ? "ALLOWED_WITH_REVIEW"
          : "ALLOWED";

    await prisma.policyDecision.create({
      data: {
        signalId: signal.id,
        status: status as any,
        riskScore,
        requiresHumanApproval: riskScore >= 70,
        blockedReasons:
          riskScore >= 80 ? ["high_risk_keywords", "policy_violation"] : [],
        allowedActions: riskScore < 80 ? ["reply", "escalate"] : [],
        ruleIds:
          riskScore >= 70 ? ["risk_tolerance", "negative_sentiment"] : [],
        explanation:
          riskScore >= 80
            ? "High-risk keywords detected and risk threshold exceeded"
            : riskScore >= 65
              ? "Moderate risk - manual review recommended"
              : "Content passes all policy checks",
      },
    });
  }
  console.log("  ✓ Policy decisions created for all signals");

  // ── Demo Risk Events (15+ events) ──
  const riskCategories = [
    "HARASSMENT",
    "SELF_HARM",
    "FRAUD",
    "LEGAL_THREAT",
    "PII_LEAK",
    "OFF_BRAND",
  ];
  const riskLevels = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const riskStatuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED"];

  const highRiskDrafts = createdDrafts.filter((d) => d.riskScore >= 70);
  for (let i = 0; i < Math.min(20, highRiskDrafts.length); i++) {
    const draft = highRiskDrafts[i];
    const signal = createdSignals.find((s) => s.id === draft.signalId);
    const level =
      draft.riskScore >= 90
        ? "CRITICAL"
        : draft.riskScore >= 80
          ? "HIGH"
          : "MEDIUM";

    await prisma.riskEvent.create({
      data: {
        workspaceId: workspace.id,
        signalId: draft.signalId,
        draftId: draft.id,
        category: riskCategories[i % riskCategories.length] as any,
        severity: level as any,
        description: `Risk detected in ${signal?.platform} message: score ${draft.riskScore}/100`,
        status: riskStatuses[i % riskStatuses.length] as any,
        resolvedBy: i % 4 === 0 ? admin.id : undefined,
        resolvedAt: i % 4 === 0 ? new Date() : undefined,
        metadata: {
          riskScore: draft.riskScore,
          detectedKeywords: ["sensitive", "complaint"],
          autoEscalated: true,
          acknowledgedBy: i % 3 === 0 ? admin.id : undefined,
          acknowledgedAt: i % 3 === 0 ? new Date().toISOString() : undefined,
        },
      },
    });
  }
  console.log("  ✓ Risk events created");

  // ── Demo Approval Requests (25+ requests) ──
  const approvalStatuses = ["PENDING", "IN_REVIEW", "APPROVED", "REJECTED"];
  const escalatedDrafts = createdDrafts.filter(
    (d) => d.status === "ESCALATED" || d.riskScore >= 70,
  );

  for (let i = 0; i < Math.min(25, escalatedDrafts.length); i++) {
    const draft = escalatedDrafts[i];
    const status = approvalStatuses[i % approvalStatuses.length];

    const policyDecision = await prisma.policyDecision.findFirst({
      where: { signalId: draft.signalId },
    });

    if (policyDecision) {
      const slaDeadline = new Date(draft.createdAt);
      slaDeadline.setHours(slaDeadline.getHours() + queue.slaHours);

      const approvalRequest = await prisma.approvalRequest.create({
        data: {
          queueId: queue.id,
          policyDecisionId: policyDecision.id,
          signalId: draft.signalId,
          draftId: draft.id,
          status: status as any,
          priority: draft.riskScore >= 90 ? 1 : draft.riskScore >= 75 ? 2 : 3,
          slaDeadline,
          resolvedAt: ["APPROVED", "REJECTED"].includes(status)
            ? new Date()
            : undefined,
        },
      });

      // Create approval action if reviewed
      if (["APPROVED", "REJECTED", "IN_REVIEW"].includes(status)) {
        await prisma.approvalAction.create({
          data: {
            requestId: approvalRequest.id,
            actorId: admin.id,
            action: status as any,
            comment:
              status === "REJECTED"
                ? "Does not meet brand guidelines"
                : "Approved for posting",
          },
        });
      }
    }
  }
  console.log("  ✓ Approval requests created");

  // ── Demo Agent Runs (50+ runs) ──
  const agentNames = [
    "Agent_Reply_Assistant",
    "Agent_Listening",
    "Agent_KPI_Analyst",
  ];
  const agentStatuses = ["SUCCESS", "FAILED", "TIMEOUT"];

  for (let i = 0; i < Math.min(50, createdSignals.length); i++) {
    const signal = createdSignals[i];
    const agentName = agentNames[i % agentNames.length];
    const status =
      i % 10 === 0 ? "FAILED" : i % 15 === 0 ? "TIMEOUT" : "SUCCESS";
    const executionTime = 1000 + Math.floor(Math.random() * 4000);

    await prisma.agentRun.create({
      data: {
        workspaceId: workspace.id,
        agentName,
        inputJson: {
          signalId: signal.id,
          content: signal.content.substring(0, 100),
          platform: signal.platform,
        },
        outputJson:
          status === "SUCCESS"
            ? {
                suggestions: [
                  { text: "Response variant 1", confidence: 0.88 },
                  { text: "Response variant 2", confidence: 0.82 },
                  { text: "Response variant 3", confidence: 0.75 },
                ],
              }
            : {
                error:
                  status === "FAILED" ? "Generation timeout" : "Network error",
              },
        status: status as any,
        latencyMs: executionTime,
        tokenCount:
          status === "SUCCESS"
            ? 150 + Math.floor(Math.random() * 200)
            : undefined,
        modelName: "gpt-4-turbo",
        errorMessage:
          status !== "SUCCESS" ? "Agent execution failed" : undefined,
      },
    });
  }
  console.log("  ✓ Agent run logs created");

  // ── Demo Audit Logs (80+ logs) ──
  const auditActions = [
    "DRAFT_AUTO_APPROVED",
    "DRAFT_ESCALATED",
    "DELIVERY_QUEUED",
    "DELIVERY_SUCCESS",
    "RISK_EVENT_CREATED",
    "APPROVAL_REQUEST_CREATED",
    "WORKSPACE_AUTOMATION_PAUSED",
    "WORKSPACE_AUTOMATION_RESUMED",
    "USER_LOGIN",
    "POLICY_RULE_CREATED",
  ];

  for (let i = 0; i < 80; i++) {
    const action = auditActions[i % auditActions.length];
    const timestamp = new Date(
      sevenDaysAgo + Math.random() * (now - sevenDaysAgo),
    );

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: i % 3 === 0 ? "user" : "system",
        actorId: i % 3 === 0 ? admin.id : undefined,
        action,
        resourceType: action.includes("DRAFT")
          ? "ResponseDraft"
          : action.includes("DELIVERY")
            ? "DeliveryAttempt"
            : "Workspace",
        resourceId:
          createdSignals[i % createdSignals.length]?.id || "demo_resource",
        context: {
          index: i,
          timestamp: timestamp.toISOString(),
          randomData: `audit_${i}`,
        },
        createdAt: timestamp,
      },
    });
  }
  console.log("  ✓ Audit logs created");

  // ── Additional Platform Connections ──
  await prisma.platformConnection.upsert({
    where: { id: "demo-facebook-connection" },
    update: {},
    create: {
      id: "demo-facebook-connection",
      workspaceId: workspace.id,
      platform: "FACEBOOK",
      accountId: "demo_fb_account",
      accountName: "Demo Brand Facebook",
      status: "ACTIVE",
    },
  });

  await prisma.platformConnection.upsert({
    where: { id: "demo-tiktok-connection" },
    update: {},
    create: {
      id: "demo-tiktok-connection",
      workspaceId: workspace.id,
      platform: "TIKTOK",
      accountId: "demo_tt_account",
      accountName: "Demo Brand TikTok",
      status: "ACTIVE",
    },
  });
  console.log(
    "  ✓ All platform connections created (X, Instagram, Facebook, TikTok)",
  );

  // ── More Policy Rules with varied types ──
  const additionalRules = [
    {
      ruleKey: "self_harm_detect",
      name: "Detect self-harm keywords",
      priority: 11,
    },
    {
      ruleKey: "financial_advice",
      name: "Block financial advice requests",
      priority: 12,
    },
    {
      ruleKey: "medical_claims",
      name: "Block unverified medical claims",
      priority: 13,
    },
    {
      ruleKey: "political_content",
      name: "Review political mentions",
      priority: 14,
    },
    {
      ruleKey: "competitor_mention",
      name: "Review competitor comparisons",
      priority: 15,
    },
  ];

  for (const rule of additionalRules) {
    await prisma.policyRule.upsert({
      where: {
        tenantId_ruleKey: { tenantId: tenant.id, ruleKey: rule.ruleKey },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        ...rule,
      },
    });
  }
  console.log(
    `  ✓ ${defaultRules.length + additionalRules.length} total policy rules created`,
  );

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
