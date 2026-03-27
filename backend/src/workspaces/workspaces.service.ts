import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateWorkspaceDto, user: any, ipAddress?: string) {
    const workspace = await this.prisma.workspace.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        slug: this.generateSlug(dto.name),
      },
    });

    // Create default approval queue for workspace
    await this.prisma.approvalQueue.create({
      data: {
        workspaceId: workspace.id,
        name: "Default Queue",
        isDefault: true,
        slaHours: 24,
      },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "workspace.created",
      resourceType: "workspace",
      resourceId: workspace.id,
      context: { name: dto.name },
      ipAddress,
    });

    return workspace;
  }

  async findAll(tenantId: string) {
    return this.prisma.workspace.findMany({
      where: { tenantId, isActive: true },
      include: {
        _count: { select: { memberships: true } },
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, tenantId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    return workspace;
  }

  async update(
    id: string,
    dto: UpdateWorkspaceDto,
    user: any,
    ipAddress?: string,
  ) {
    await this.ensureTenantOwnership(id, user.tenantId);

    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.settings && { settings: dto.settings }),
      },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "workspace.updated",
      resourceType: "workspace",
      resourceId: id,
      context: { changes: dto },
      ipAddress,
    });

    return workspace;
  }

  async remove(id: string, user: any, ipAddress?: string) {
    await this.ensureTenantOwnership(id, user.tenantId);

    await this.prisma.workspace.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "workspace.deleted",
      resourceType: "workspace",
      resourceId: id,
      ipAddress,
    });

    return { deleted: true };
  }

  async addMember(
    id: string,
    dto: AddMemberDto,
    user: any,
    ipAddress?: string,
  ) {
    await this.ensureTenantOwnership(id, user.tenantId);

    // Verify user belongs to same tenant
    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId: user.tenantId },
    });

    if (!targetUser) {
      throw new NotFoundException("User not found in this tenant");
    }

    // Check unique constraint
    const existing = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: dto.userId, workspaceId: id } },
    });

    if (existing) {
      throw new ConflictException("User is already a member of this workspace");
    }

    const membership = await this.prisma.membership.create({
      data: {
        userId: dto.userId,
        workspaceId: id,
        role: (dto.role || "VIEWER") as any,
      },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "membership.created",
      resourceType: "membership",
      resourceId: membership.id,
      context: { userId: dto.userId, workspaceId: id, role: dto.role },
      ipAddress,
    });

    return membership;
  }

  async removeMember(
    workspaceId: string,
    userId: string,
    user: any,
    ipAddress?: string,
  ) {
    await this.ensureTenantOwnership(workspaceId, user.tenantId);

    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    if (!membership) {
      throw new NotFoundException("Membership not found");
    }

    await this.prisma.membership.delete({
      where: { id: membership.id },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "membership.deleted",
      resourceType: "membership",
      resourceId: membership.id,
      context: { userId, workspaceId },
      ipAddress,
    });

    return { deleted: true };
  }

  private async ensureTenantOwnership(workspaceId: string, tenantId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, tenantId },
    });
    if (!workspace) {
      throw new ForbiddenException("Workspace not found or access denied");
    }
  }

  // ── Automation Controls ──

  async pauseAutomation(
    workspaceId: string,
    user: any,
    reason?: string,
    ipAddress?: string,
  ) {
    await this.ensureTenantOwnership(workspaceId, user.tenantId);

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        automationEnabled: false,
        automationPausedBy: user.sub,
        automationPausedAt: new Date(),
        automationPauseReason: reason || null,
      },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "workspace.automation.paused",
      resourceType: "workspace",
      resourceId: workspaceId,
      context: { reason },
      ipAddress,
    });

    return {
      automationEnabled: workspace.automationEnabled,
      pausedBy: workspace.automationPausedBy,
      pausedAt: workspace.automationPausedAt,
      reason: workspace.automationPauseReason,
    };
  }

  async resumeAutomation(workspaceId: string, user: any, ipAddress?: string) {
    await this.ensureTenantOwnership(workspaceId, user.tenantId);

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        automationEnabled: true,
        automationPausedBy: null,
        automationPausedAt: null,
        automationPauseReason: null,
      },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: "workspace.automation.resumed",
      resourceType: "workspace",
      resourceId: workspaceId,
      ipAddress,
    });

    // Post backlog of auto-approved drafts that were queued while paused
    const backlog = await this.prisma.responseDraft.findMany({
      where: { workspaceId, status: "AUTO_APPROVED" },
    });

    return {
      automationEnabled: workspace.automationEnabled,
      backlogCount: backlog.length,
    };
  }

  async getAutomationStatus(workspaceId: string, tenantId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, tenantId },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const [totalDrafts, autoApproved, escalated, posted] = await Promise.all([
      this.prisma.responseDraft.count({ where: { workspaceId } }),
      this.prisma.responseDraft.count({
        where: { workspaceId, status: "AUTO_APPROVED" },
      }),
      this.prisma.responseDraft.count({
        where: { workspaceId, status: "ESCALATED" },
      }),
      this.prisma.responseDraft.count({
        where: { workspaceId, status: "SENT" },
      }),
    ]);

    return {
      automationEnabled: workspace.automationEnabled,
      pausedBy: workspace.automationPausedBy,
      pausedAt: workspace.automationPausedAt,
      pauseReason: workspace.automationPauseReason,
      stats: { totalDrafts, autoApproved, escalated, posted },
    };
  }

  private generateSlug(input: string): string {
    return (
      input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50) +
      "-" +
      Date.now().toString(36)
    );
  }
}
