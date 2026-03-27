import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { IntelligenceService } from "../intelligence/intelligence.service";

@Injectable()
export class ResponsesService {
  private readonly logger = new Logger(ResponsesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly intelligenceService: IntelligenceService,
  ) {}

  private async verifyWorkspaceTenant(workspaceId: string, tenantId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, tenantId },
    });
    if (!workspace) {
      throw new ForbiddenException("Workspace not found or access denied");
    }
    return workspace;
  }

  async findAll(
    workspaceId: string,
    tenantId: string,
    signalId?: string,
    status?: string,
  ) {
    await this.verifyWorkspaceTenant(workspaceId, tenantId);
    return this.prisma.responseDraft.findMany({
      where: {
        workspaceId,
        ...(signalId && { signalId }),
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: "desc" },
      include: { versions: { orderBy: { version: "desc" } } },
    });
  }

  async findEscalated(workspaceId: string, tenantId: string) {
    await this.verifyWorkspaceTenant(workspaceId, tenantId);
    return this.prisma.responseDraft.findMany({
      where: { workspaceId, status: "ESCALATED" },
      orderBy: { createdAt: "desc" },
      include: {
        signal: {
          include: {
            sentimentResult: true,
            intentResult: true,
            policyDecisions: true,
          },
        },
        versions: { orderBy: { version: "desc" } },
      },
    });
  }

  async findOne(id: string, workspaceId: string, tenantId?: string) {
    if (tenantId) {
      await this.verifyWorkspaceTenant(workspaceId, tenantId);
    }
    const draft = await this.prisma.responseDraft.findFirst({
      where: { id, workspaceId },
      include: { versions: { orderBy: { version: "desc" } }, signal: true },
    });
    if (!draft) throw new NotFoundException("Response draft not found");
    return draft;
  }

  private async checkProhibitedTerms(workspaceId: string, content: string) {
    const profile = await this.prisma.brandProfile.findFirst({
      where: { workspaceId },
    });
    if (!profile || profile.prohibitedTerms.length === 0) return;

    const lowerContent = content.toLowerCase();
    for (const term of profile.prohibitedTerms) {
      if (lowerContent.includes(term.toLowerCase())) {
        throw new BadRequestException(
          `Content contains prohibited brand term: ${term}`,
        );
      }
    }
  }

  async createDraft(
    workspaceId: string,
    signalId: string,
    content: string,
    ctaText?: string,
    userId?: string,
  ) {
    await this.checkProhibitedTerms(workspaceId, content);

    return this.prisma.$transaction(async (tx) => {
      const draft = await tx.responseDraft.create({
        data: {
          workspaceId,
          signalId,
          content,
          ctaText,
          status: "DRAFT",
          version: 1,
        },
      });

      await tx.responseDraftVersion.create({
        data: {
          draftId: draft.id,
          version: 1,
          content,
          ctaText,
          createdBy: userId,
        },
      });

      return draft;
    });
  }

  async updateDraft(
    id: string,
    workspaceId: string,
    content: string,
    ctaText?: string,
    userId?: string,
  ) {
    await this.checkProhibitedTerms(workspaceId, content);

    const draft = await this.findOne(id, workspaceId);

    if (draft.status !== "DRAFT" && draft.status !== "REJECTED") {
      throw new BadRequestException(
        `Cannot edit draft in ${draft.status} status`,
      );
    }

    const newVersion = draft.version + 1;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.responseDraft.update({
        where: { id },
        data: { content, ctaText, version: newVersion, status: "DRAFT" },
      });

      await tx.responseDraftVersion.create({
        data: {
          draftId: id,
          version: newVersion,
          content,
          ctaText,
          createdBy: userId,
        },
      });

      return updated;
    });
  }

  /**
   * Generate AI-powered response drafts for a signal.
   * Creates 3 reply variants via IntelligenceService and returns the top-ranked one.
   * The other 2 are stored as alternative drafts.
   */
  async generateAIResponse(
    workspaceId: string,
    signalId: string,
    userId?: string,
  ) {
    const signal = await this.prisma.normalizedSignal.findUnique({
      where: { id: signalId },
    });
    if (!signal) throw new NotFoundException("Signal not found");

    const replies = await this.intelligenceService.generateResponses(
      signalId,
      workspaceId,
    );

    this.logger.log(
      `Generated ${replies.length} AI replies for signal ${signalId}`,
    );

    // Create all 3 drafts — the highest confidence one is returned as primary
    const drafts = [];
    for (const reply of replies) {
      const draft = await this.createDraft(
        workspaceId,
        signalId,
        reply.content,
        reply.ctaText,
        userId,
      );
      // Store generation metadata
      await this.prisma.responseDraft.update({
        where: { id: draft.id },
        data: {
          metadata: {
            confidence: reply.confidence,
            strategy: reply.strategy,
          } as any,
        },
      });
      drafts.push({ ...draft, confidence: reply.confidence });
    }

    // Return the highest-confidence draft
    drafts.sort((a, b) => b.confidence - a.confidence);
    return drafts[0];
  }

  /** @deprecated Use generateAIResponse instead */
  async generateStubAIResponse(
    workspaceId: string,
    signalId: string,
    userId?: string,
  ) {
    return this.generateAIResponse(workspaceId, signalId, userId);
  }

  async overrideDraft(
    draftId: string,
    workspaceId: string,
    reviewerId: string,
    action: "approve" | "reject",
    comment?: string,
  ) {
    const draft = await this.prisma.responseDraft.findFirst({
      where: { id: draftId, workspaceId },
    });
    if (!draft) throw new NotFoundException("Response draft not found");

    // Allow override for ESCALATED, DRAFT, and AUTO_APPROVED statuses
    if (!["ESCALATED", "DRAFT", "AUTO_APPROVED"].includes(draft.status)) {
      throw new BadRequestException(
        `Override only allowed on ESCALATED, DRAFT, or AUTO_APPROVED drafts. Current: ${draft.status}`,
      );
    }

    const overrideDecision = {
      reviewerId,
      action,
      comment: comment || null,
      timestamp: new Date().toISOString(),
    };

    // Determine new status based on action and original status
    let newStatus: string;
    if (action === "approve") {
      newStatus =
        draft.status === "ESCALATED" ? "OVERRIDE_APPROVED" : "APPROVED";
    } else {
      newStatus = "REJECTED";
    }

    const updated = await this.prisma.responseDraft.update({
      where: { id: draftId },
      data: {
        status: newStatus as any,
        overrideDecision: overrideDecision as any,
        ...(action === "approve" && {
          approvedBy: reviewerId,
          approvedAt: new Date(),
        }),
      },
    });

    // Also resolve the approval request if one exists
    const approvalRequest = await this.prisma.approvalRequest.findFirst({
      where: { draftId, status: { in: ["PENDING", "IN_REVIEW"] } },
    });
    if (approvalRequest) {
      await this.prisma.approvalRequest.update({
        where: { id: approvalRequest.id },
        data: {
          status: action === "approve" ? "APPROVED" : "REJECTED",
          resolvedAt: new Date(),
        },
      });
      await this.prisma.approvalAction.create({
        data: {
          requestId: approvalRequest.id,
          actorId: reviewerId,
          action: action === "approve" ? "APPROVED" : "REJECTED",
          comment,
        },
      });
    }

    // Audit log
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (workspace) {
      await this.auditService.log({
        tenantId: workspace.tenantId,
        actorId: reviewerId,
        action: `DRAFT_OVERRIDE_${action.toUpperCase()}`,
        resourceType: "ResponseDraft",
        resourceId: draftId,
        context: { overrideDecision },
      });
    }

    return updated;
  }
}
