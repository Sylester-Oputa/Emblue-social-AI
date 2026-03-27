import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { RiskEventCategory, RiskEventStatus, RiskLevel } from "@prisma/client";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class RiskEventService {
  private readonly logger = new Logger(RiskEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(params: {
    workspaceId: string;
    draftId?: string;
    signalId?: string;
    category: RiskEventCategory;
    severity: RiskLevel;
    description?: string;
    metadata?: Record<string, any>;
  }) {
    const event = await this.prisma.riskEvent.create({
      data: {
        workspaceId: params.workspaceId,
        draftId: params.draftId,
        signalId: params.signalId,
        category: params.category,
        severity: params.severity,
        description: params.description,
        metadata: params.metadata || {},
      },
    });

    this.logger.log(
      `RiskEvent created: ${event.id} [${params.category}] severity=${params.severity}`,
    );

    return event;
  }

  async findAll(
    workspaceId: string,
    status?: RiskEventStatus,
    severity?: RiskLevel,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { workspaceId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [items, total] = await Promise.all([
      this.prisma.riskEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.riskEvent.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const event = await this.prisma.riskEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException("Risk event not found");
    return event;
  }

  async acknowledge(id: string, userId: string, tenantId: string) {
    const event = await this.findOne(id);

    const updated = await this.prisma.riskEvent.update({
      where: { id },
      data: { status: "ACKNOWLEDGED" },
    });

    await this.auditService.log({
      tenantId,
      actorId: userId,
      action: "RISK_EVENT_ACKNOWLEDGED",
      resourceType: "RiskEvent",
      resourceId: id,
      context: { category: event.category, severity: event.severity },
    });

    this.logger.log(`RiskEvent ${id} acknowledged by ${userId}`);
    return updated;
  }

  async resolve(id: string, userId: string, tenantId: string) {
    const event = await this.findOne(id);

    const updated = await this.prisma.riskEvent.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });

    await this.auditService.log({
      tenantId,
      actorId: userId,
      action: "RISK_EVENT_RESOLVED",
      resourceType: "RiskEvent",
      resourceId: id,
      context: { category: event.category, severity: event.severity },
    });

    this.logger.log(`RiskEvent ${id} resolved by ${userId}`);
    return updated;
  }

  async getStats(workspaceId: string) {
    const [total, openCount, acknowledgedCount, resolvedCount, bySeverity] =
      await Promise.all([
        this.prisma.riskEvent.count({ where: { workspaceId } }),
        this.prisma.riskEvent.count({
          where: { workspaceId, status: "OPEN" },
        }),
        this.prisma.riskEvent.count({
          where: { workspaceId, status: "ACKNOWLEDGED" },
        }),
        this.prisma.riskEvent.count({
          where: { workspaceId, status: "RESOLVED" },
        }),
        this.prisma.riskEvent.groupBy({
          by: ["severity"],
          where: { workspaceId, status: { not: "RESOLVED" } },
          _count: true,
        }),
      ]);

    return {
      total,
      openCount,
      acknowledgedCount,
      resolvedCount,
      bySeverity: bySeverity.reduce(
        (acc, item) => {
          acc[item.severity] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
