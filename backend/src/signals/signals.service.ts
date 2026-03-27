import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class SignalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    workspaceId: string,
    filters: {
      status?: string;
      platform?: string;
      sentiment?: string;
      intent?: string;
      page: number;
      limit: number;
    },
  ) {
    const where: Prisma.NormalizedSignalWhereInput = {
      workspaceId,
      ...(filters.status && { status: filters.status as any }),
      ...(filters.platform && { platform: filters.platform as any }),
      ...(filters.sentiment && {
        sentimentResult: { label: filters.sentiment as any },
      }),
      ...(filters.intent && {
        intentResult: { label: filters.intent as any },
      }),
    };

    const [total, signals] = await Promise.all([
      this.prisma.normalizedSignal.count({ where }),
      this.prisma.normalizedSignal.findMany({
        where,
        include: {
          sentimentResult: true,
          intentResult: true,
          opportunityScore: true,
          moderationResult: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
    ]);

    return {
      items: signals,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async findOne(id: string, workspaceId: string) {
    const signal = await this.prisma.normalizedSignal.findFirst({
      where: { id, workspaceId },
      include: {
        rawEvent: true,
        sentimentResult: true,
        intentResult: true,
        opportunityScore: true,
        moderationResult: true,
        policyDecisions: {
          orderBy: { evaluatedAt: "desc" },
        },
        responseDrafts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!signal) {
      throw new NotFoundException("Signal not found");
    }

    return signal;
  }

  /**
   * FR-12: Get message context with thread, workspace rules, and brand profile
   */
  async getContext(id: string, workspaceId: string) {
    const signal = await this.prisma.normalizedSignal.findFirst({
      where: { id, workspaceId },
      include: {
        rawEvent: true,
        sentimentResult: true,
        intentResult: true,
        responseDrafts: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    if (!signal) {
      throw new NotFoundException("Signal not found");
    }

    // Get workspace with brand profile and active policies
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        brandProfiles: {
          take: 1,
        },
      },
    });

    // Get active policy rules
    const policies = await this.prisma.policyRule.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        ruleKey: true,
        priority: true,
      },
      take: 10,
    });

    // Get thread context (simplified - raw event doesn't have parent/child relationships in current schema)
    const threadContext: any = {
      parent: null,
      children: [],
    };

    return {
      signal: {
        id: signal.id,
        content: signal.content,
        platform: signal.platform,
        authorHandle: signal.authorHandle,
        createdAt: signal.createdAt,
        sentiment: signal.sentimentResult?.label,
        intent: signal.intentResult?.label,
      },
      thread: threadContext,
      workspace: {
        id: workspace?.id,
        name: workspace?.name,
        automationEnabled: workspace?.automationEnabled,
      },
      brandProfile: workspace?.brandProfiles[0]
        ? {
            tone: workspace.brandProfiles[0].tone,
            prohibitedTerms: workspace.brandProfiles[0].prohibitedTerms,
            riskTolerance: workspace.brandProfiles[0].riskTolerance,
          }
        : null,
      activePolicies: policies,
      responseDrafts: signal.responseDrafts.map((draft) => {
        const metadata =
          typeof draft.metadata === "object" ? (draft.metadata as any) : {};
        return {
          id: draft.id,
          content: draft.content,
          status: draft.status,
          confidence: metadata.confidence || null,
          ranking: metadata.ranking || null,
        };
      }),
    };
  }
}
