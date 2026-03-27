import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class OpsService {
  private readonly logger = new Logger(OpsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSystemHealth() {
    const checks: Record<string, any> = {};

    // DB connectivity
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: "healthy", latencyMs: 0 };
    } catch (error) {
      checks.database = { status: "unhealthy", error: error.message };
    }

    // Counts for queue depth
    const [
      pendingSignals,
      pendingApprovals,
      queuedDeliveries,
      failedDeliveries,
    ] = await Promise.all([
      this.prisma.normalizedSignal.count({ where: { status: "NORMALIZED" } }),
      this.prisma.approvalRequest.count({
        where: { status: { in: ["PENDING", "IN_REVIEW"] } },
      }),
      this.prisma.deliveryAttempt.count({ where: { status: "QUEUED" } }),
      this.prisma.deliveryAttempt.count({ where: { status: "FAILED" } }),
    ]);

    checks.queues = {
      pendingSignals,
      pendingApprovals,
      queuedDeliveries,
      failedDeliveries,
    };

    // Recent error rate (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [totalRecent, failedRecent] = await Promise.all([
      this.prisma.deliveryAttempt.count({
        where: { createdAt: { gte: oneHourAgo } },
      }),
      this.prisma.deliveryAttempt.count({
        where: { createdAt: { gte: oneHourAgo }, status: "FAILED" },
      }),
    ]);
    checks.errorRate = totalRecent > 0 ? (failedRecent / totalRecent) * 100 : 0;

    const overallStatus =
      checks.database.status === "healthy" && checks.errorRate < 50
        ? "healthy"
        : "degraded";

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  async getQueueStats(workspaceId: string) {
    const [
      pendingSignals,
      pendingApprovals,
      pendingDeliveries,
      activeConnections,
    ] = await Promise.all([
      this.prisma.normalizedSignal.count({
        where: { workspaceId, status: "NORMALIZED" },
      }),
      this.prisma.approvalRequest.count({
        where: {
          queue: { workspaceId },
          status: { in: ["PENDING", "IN_REVIEW"] },
        },
      }),
      this.prisma.deliveryAttempt.count({
        where: {
          draft: { workspaceId },
          status: { in: ["QUEUED", "IN_PROGRESS"] },
        },
      }),
      this.prisma.platformConnection.count({
        where: { workspaceId, status: "ACTIVE" },
      }),
    ]);

    return {
      pendingSignals,
      pendingApprovals,
      pendingDeliveries,
      activeConnections,
    };
  }

  async getPipelineStats(workspaceId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      signalsLastHour,
      signalsLastDay,
      autoApproved,
      escalated,
      delivered,
      failed,
    ] = await Promise.all([
      this.prisma.normalizedSignal.count({
        where: { workspaceId, createdAt: { gte: oneHourAgo } },
      }),
      this.prisma.normalizedSignal.count({
        where: { workspaceId, createdAt: { gte: oneDayAgo } },
      }),
      this.prisma.responseDraft.count({
        where: {
          workspaceId,
          status: "AUTO_APPROVED",
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.responseDraft.count({
        where: {
          workspaceId,
          status: "ESCALATED",
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.deliveryAttempt.count({
        where: {
          draft: { workspaceId },
          status: "DELIVERED",
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.deliveryAttempt.count({
        where: {
          draft: { workspaceId },
          status: "FAILED",
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    const totalProcessed = autoApproved + escalated;
    const automationRate =
      totalProcessed > 0 ? (autoApproved / totalProcessed) * 100 : null;
    const postingRate =
      autoApproved + escalated > 0
        ? (delivered / (autoApproved + escalated)) * 100
        : null;

    return {
      signalsPerHour: signalsLastHour,
      signalsLast24h: signalsLastDay,
      autoApprovedLast24h: autoApproved,
      escalatedLast24h: escalated,
      deliveredLast24h: delivered,
      failedLast24h: failed,
      automationRate,
      postingRate,
    };
  }
}
