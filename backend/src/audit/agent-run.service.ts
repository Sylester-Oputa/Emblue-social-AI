import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AgentRunStatus } from "@prisma/client";

@Injectable()
export class AgentRunService {
  private readonly logger = new Logger(AgentRunService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logRun(params: {
    workspaceId: string;
    agentName: string;
    inputJson: Record<string, any>;
    outputJson?: Record<string, any>;
    status: AgentRunStatus;
    modelName?: string;
    tokenCount?: number;
    latencyMs?: number;
    errorMessage?: string;
  }) {
    const run = await this.prisma.agentRun.create({
      data: {
        workspaceId: params.workspaceId,
        agentName: params.agentName,
        inputJson: params.inputJson,
        outputJson: params.outputJson || {},
        status: params.status,
        modelName: params.modelName,
        tokenCount: params.tokenCount,
        latencyMs: params.latencyMs,
        errorMessage: params.errorMessage,
      },
    });

    this.logger.log(
      `AgentRun logged: ${run.id} [${params.agentName}] ${params.status} (${params.latencyMs ?? "?"}ms)`,
    );

    return run;
  }

  async findAll(workspaceId: string, page = 1, limit = 20, agentName?: string) {
    const skip = (page - 1) * limit;
    const where: any = { workspaceId };
    if (agentName) where.agentName = agentName;

    const [items, total] = await Promise.all([
      this.prisma.agentRun.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.agentRun.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStats(workspaceId: string) {
    const [total, successCount, failedCount, avgLatency] = await Promise.all([
      this.prisma.agentRun.count({ where: { workspaceId } }),
      this.prisma.agentRun.count({
        where: { workspaceId, status: "SUCCESS" },
      }),
      this.prisma.agentRun.count({
        where: { workspaceId, status: "FAILED" },
      }),
      this.prisma.agentRun.aggregate({
        where: { workspaceId, latencyMs: { not: null } },
        _avg: { latencyMs: true },
      }),
    ]);

    return {
      total,
      successCount,
      failedCount,
      successRate: total > 0 ? (successCount / total) * 100 : null,
      avgLatencyMs: avgLatency._avg.latencyMs,
    };
  }
}
