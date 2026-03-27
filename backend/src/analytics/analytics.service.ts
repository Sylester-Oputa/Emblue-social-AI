import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(workspaceId: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalSignals,
      actionedSignals,
      pendingApprovals,
      totalDelivered,
      messagesIngested,
      suggestionsGenerated,
      autoApprovedCount,
      escalatedCount,
      riskEventsOpen,
      failedDeliveries,
      agentRunsTotal,
      agentRunsSuccess,
      shortlinksTotal,
      shortlinkClicks,
    ] = await Promise.all([
      this.prisma.normalizedSignal.count({ where: { workspaceId } }),
      this.prisma.normalizedSignal.count({
        where: { workspaceId, status: "ACTIONED" },
      }),
      this.prisma.approvalRequest.count({
        where: {
          queue: { workspaceId },
          status: { in: ["PENDING", "IN_REVIEW"] },
        },
      }),
      this.prisma.deliveryAttempt.count({
        where: { draft: { workspaceId }, status: "DELIVERED" },
      }),
      this.prisma.rawEvent.count({ where: { workspaceId } }),
      this.prisma.responseDraft.count({ where: { workspaceId } }),
      this.prisma.responseDraft.count({
        where: { workspaceId, status: "AUTO_APPROVED" },
      }),
      this.prisma.responseDraft.count({
        where: { workspaceId, status: "ESCALATED" },
      }),
      this.prisma.riskEvent.count({
        where: { workspaceId, status: "OPEN" },
      }),
      this.prisma.deliveryAttempt.count({
        where: { draft: { workspaceId }, status: "FAILED" },
      }),
      this.prisma.agentRun.count({ where: { workspaceId } }),
      this.prisma.agentRun.count({ where: { workspaceId, status: "SUCCESS" } }),
      this.prisma.shortlink.count({ where: { workspaceId } }),
      this.prisma.shortlinkClick.count({
        where: { shortlink: { workspaceId } },
      }),
    ]);

    // Group by platform
    const platformGroups = await this.prisma.normalizedSignal.groupBy({
      by: ["platform"],
      where: { workspaceId },
      _count: { platform: true },
    });

    const signalsByPlatform = platformGroups.reduce(
      (acc, curr) => {
        acc[curr.platform] = curr._count.platform;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Average response time (from signal creation to draft SENT)
    const sentDrafts = await this.prisma.responseDraft.findMany({
      where: { workspaceId, status: "SENT", postedAt: { not: null } },
      select: { postedAt: true, signal: { select: { createdAt: true } } },
      take: 100,
      orderBy: { postedAt: "desc" },
    });

    let avgResponseTimeMs: number | null = null;
    if (sentDrafts.length > 0) {
      const totalMs = sentDrafts.reduce((sum, d) => {
        return sum + (d.postedAt!.getTime() - d.signal.createdAt.getTime());
      }, 0);
      avgResponseTimeMs = totalMs / sentDrafts.length;
    }

    const totalProcessed = autoApprovedCount + escalatedCount;
    const automationRate =
      totalProcessed > 0 ? (autoApprovedCount / totalProcessed) * 100 : null;
    const postingRate =
      totalProcessed > 0 ? (totalDelivered / totalProcessed) * 100 : null;
    const resolutionRate =
      totalSignals > 0 ? (actionedSignals / totalSignals) * 100 : 0;

    return {
      totalSignals,
      actionedSignals,
      pendingApprovals,
      totalDelivered,
      messagesIngested,
      suggestionsGenerated,
      autoApprovedCount,
      escalatedCount,
      riskEventsOpen,
      failedDeliveries,
      signalsByPlatform,
      resolutionRate,
      automationRate,
      postingRate,
      avgResponseTimeMs,
      agentRunsTotal,
      agentRunsSuccess,
      agentSuccessRate:
        agentRunsTotal > 0 ? (agentRunsSuccess / agentRunsTotal) * 100 : null,
      shortlinksTotal,
      shortlinkClicks,
    };
  }
}
