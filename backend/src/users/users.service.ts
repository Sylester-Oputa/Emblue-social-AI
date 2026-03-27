import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(tenantId: string, workspaceId?: string) {
    if (workspaceId) {
      const memberships = await this.prisma.membership.findMany({
        where: { workspaceId, user: { tenantId } },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });
      return memberships.map((m) => ({ ...m.user, membershipRole: m.role }));
    }

    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          include: {
            workspace: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: any, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Prevent privilege escalation: actor can only assign roles below their own level
    if (dto.role) {
      const ROLE_HIERARCHY: Record<string, number> = {
        SUPER_ADMIN: 100,
        TENANT_ADMIN: 90,
        WORKSPACE_ADMIN: 80,
        ANALYST: 60,
        REVIEWER: 50,
        OPERATOR: 40,
        VIEWER: 10,
      };
      const actorLevel = ROLE_HIERARCHY[actor.role] || 0;
      const targetLevel = ROLE_HIERARCHY[dto.role] || 0;
      if (targetLevel >= actorLevel) {
        throw new ForbiddenException(
          "Cannot assign a role equal to or higher than your own",
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.role && { role: dto.role as any }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    await this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.sub,
      action: "user.updated",
      resourceType: "user",
      resourceId: id,
      context: { changes: dto },
      ipAddress,
    });

    return updated;
  }

  async deactivate(id: string, actor: any, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: actor.tenantId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (id === actor.sub) {
      throw new ForbiddenException("Cannot deactivate yourself");
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      tenantId: actor.tenantId,
      actorId: actor.sub,
      action: "user.deactivated",
      resourceType: "user",
      resourceId: id,
      ipAddress,
    });

    return { deactivated: true };
  }
}
