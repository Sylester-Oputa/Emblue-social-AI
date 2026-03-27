import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log('Workspaces:');
  for (const w of workspaces) {
    console.log(`- ${w.id} (Tenant: ${w.tenantId}) | ${w.name} | ${w.createdAt}`);
  }

  const signals = await prisma.normalizedSignal.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log('\nNormalized Signals:');
  for (const s of signals) {
    console.log(`- ${s.id} | Workspace: ${s.workspaceId} | RawEvent: ${s.rawEventId}`);
  }

  const rawEvents = await prisma.rawEvent.findMany({
    orderBy: { createdAt: 'desc' },
  });
  console.log('\nRaw Events:');
  for (const r of rawEvents) {
    console.log(`- ${r.id} | Workspace: ${r.workspaceId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
