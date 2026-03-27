import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApprovalStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createRequest(data: { workspaceId: string; policyDecisionId: string; signalId?: string; draftId?: string }) {
    const queue = await this.prisma.approvalQueue.findFirst({
      where: { workspaceId: data.workspaceId, isDefault: true },
    });

    if (!queue) {
      throw new BadRequestException('No default approval queue found for workspace');
    }

    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + queue.slaHours);

    const req = await this.prisma.approvalRequest.create({
      data: {
        queueId: queue.id,
        policyDecisionId: data.policyDecisionId,
        signalId: data.signalId,
        draftId: data.draftId,
        status: 'PENDING',
        slaDeadline,
      },
    });

    const workspace = await this.prisma.workspace.findUnique({ where: { id: data.workspaceId } });
    if (workspace) {
      await this.auditService.log({
        tenantId: workspace.tenantId,
        action: 'APPROVAL_REQUEST_CREATED',
        resourceType: 'ApprovalRequest',
        resourceId: req.id,
        context: { signalId: data.signalId, draftId: data.draftId },
      });
    }

    return req;
  }

  async findAll(
    workspaceId: string,
    filters: { status?: ApprovalStatus; page: number; limit: number },
  ) {
    const where = {
      queue: { workspaceId },
      ...(filters.status && { status: filters.status }),
    };

    const [total, items] = await Promise.all([
      this.prisma.approvalRequest.count({ where }),
      this.prisma.approvalRequest.findMany({
        where,
        include: {
          queue: true,
          draft: true,
          policyDecision: { include: { signal: true } },
        },
        orderBy: { slaDeadline: 'asc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async actionRequest(
    id: string,
    workspaceId: string,
    userId: string,
    action: ApprovalStatus,
    comment?: string,
  ) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, queue: { workspaceId } },
      include: { draft: true, policyDecision: { include: { signal: true } } },
    });

    if (!request) {
      throw new NotFoundException('Approval request not found');
    }

    if (request.status !== 'PENDING' && request.status !== 'IN_REVIEW') {
      throw new BadRequestException(`Cannot action request in ${request.status} status`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: action,
          resolvedAt: new Date(),
        },
      });

      await tx.approvalAction.create({
        data: {
          requestId: id,
          actorId: userId,
          action,
          comment,
        },
      });

      if (request.draftId && action === 'APPROVED') {
        await tx.responseDraft.update({
          where: { id: request.draftId },
          data: { status: 'APPROVED' },
        });
      }

      const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });
      if (workspace) {
        await this.auditService.log({
          tenantId: workspace.tenantId,
          actorId: userId,
          action: `APPROVAL_REQUEST_${action}`,
          resourceType: 'ApprovalRequest',
          resourceId: id,
          context: { comment, draftId: request.draftId, signalId: request.signalId },
        });
      }

      return updated;
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkSLAExpirations() {
    this.logger.log('Running SLA expiration check for pending approvals...');
    
    const expired = await this.prisma.approvalRequest.findMany({
      where: {
        status: { in: ['PENDING', 'IN_REVIEW'] },
        slaDeadline: { lt: new Date() },
      },
      include: { queue: true }
    });

    if (expired.length > 0) {
      for (const req of expired) {
        await this.prisma.approvalRequest.update({
          where: { id: req.id },
          data: { status: 'EXPIRED', resolvedAt: new Date() },
        });
        
        const workspace = await this.prisma.workspace.findUnique({ where: { id: req.queue.workspaceId }});
        if (workspace) {
          await this.auditService.log({
            tenantId: workspace.tenantId,
            action: 'APPROVAL_REQUEST_EXPIRED',
            resourceType: 'ApprovalRequest',
            resourceId: req.id,
          });
        }
      }
    }
  }
}
