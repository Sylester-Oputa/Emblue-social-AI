import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

export interface ReplyJobQueueItem {
  id: string;
  status: string;
  signalId: string;
  signalContent: string;
  platform: string;
  authorHandle: string;
  createdAt: Date;
  draftCount: number;
  topDraftContent?: string;
  riskScore?: number;
}

export interface ReplyJobDetail {
  id: string;
  signal: any;
  drafts: any[];
  policyDecision?: any;
  approvalRequest?: any;
}

@Injectable()
export class ReplyJobsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated reply job queue
   * FR-11: List reply jobs via GET /reply-jobs/queue
   */
  async getQueue(
    workspaceId: string,
    filters: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    items: ReplyJobQueueItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId,
    };

    // Filter by status if provided
    if (filters.status) {
      where.status = filters.status;
    }

    // Get signals with response drafts
    const signals = await this.prisma.normalizedSignal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        responseDrafts: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        policyDecisions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const total = await this.prisma.normalizedSignal.count({ where });

    const items: ReplyJobQueueItem[] = signals.map((signal) => {
      const topDraft = signal.responseDrafts[0];
      const policyDecision = signal.policyDecisions[0];

      return {
        id: signal.id,
        status: signal.status,
        signalId: signal.id,
        signalContent: signal.content || "",
        platform: signal.platform,
        authorHandle: signal.authorHandle || "unknown",
        createdAt: signal.createdAt,
        draftCount: signal.responseDrafts.length,
        topDraftContent: topDraft?.content,
        riskScore: policyDecision?.riskScore,
      };
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Get detailed reply job information
   * FR-11: Retrieve job details via GET /reply-jobs/:jobId
   */
  async getJobDetail(
    jobId: string,
    workspaceId: string,
  ): Promise<ReplyJobDetail> {
    const signal = await this.prisma.normalizedSignal.findFirst({
      where: {
        id: jobId,
        workspaceId,
      },
      include: {
        responseDrafts: {
          orderBy: { createdAt: "asc" },
        },
        policyDecisions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        rawEvent: true,
      },
    });

    if (!signal) {
      throw new NotFoundException(`Reply job ${jobId} not found`);
    }

    const policyDecision = signal.policyDecisions[0];

    // Get approval request if exists
    let approvalRequest = null;
    if (policyDecision) {
      approvalRequest = await this.prisma.approvalRequest.findFirst({
        where: { policyDecisionId: policyDecision.id },
        include: { queue: true },
      });
    }

    return {
      id: signal.id,
      signal: {
        id: signal.id,
        content: signal.content,
        platform: signal.platform,
        authorHandle: signal.authorHandle,
        status: signal.status,
        createdAt: signal.createdAt,
        rawEvent: signal.rawEvent,
      },
      drafts: signal.responseDrafts.map((draft) => {
        const metadata =
          typeof draft.metadata === "object" ? (draft.metadata as any) : {};
        return {
          id: draft.id,
          content: draft.content,
          ranking: metadata.ranking || null,
          confidence: metadata.confidence || null,
          strategy: metadata.strategy || null,
          status: draft.status,
          createdAt: draft.createdAt,
        };
      }),
      policyDecision: policyDecision
        ? {
            id: policyDecision.id,
            status: policyDecision.status,
            riskScore: policyDecision.riskScore,
            blockedReasons: policyDecision.blockedReasons,
            createdAt: policyDecision.createdAt,
          }
        : null,
      approvalRequest: approvalRequest
        ? {
            id: approvalRequest.id,
            status: approvalRequest.status,
            priority: approvalRequest.priority,
            queueName: approvalRequest.queue.name,
            createdAt: approvalRequest.createdAt,
          }
        : null,
    };
  }
}
