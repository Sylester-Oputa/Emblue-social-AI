import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
  console.log('\n📊 Database Record Counts:\n');
  
  const counts = {
    'Signals': await prisma.normalizedSignal.count(),
    'Response Drafts': await prisma.responseDraft.count(),
    'Risk Events': await prisma.riskEvent.count(),
    'Approval Requests': await prisma.approvalRequest.count(),
    'Agent Runs': await prisma.agentRun.count(),
    'Audit Logs': await prisma.auditLog.count(),
    'Delivery Attempts': await prisma.deliveryAttempt.count(),
    'Policy Decisions': await prisma.policyDecision.count(),
    'Platform Connections': await prisma.platformConnection.count(),
  };
  
  Object.entries(counts).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(22)} ${value}`);
  });
  
  console.log('\n✅ All pages should be populated with test data!\n');
  
  await prisma.$disconnect();
}

checkCounts().catch(console.error);
