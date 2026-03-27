import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    actorId?: string;
    actorType?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    context?: Record<string, any>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        actorType: params.actorType || 'user',
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        context: params.context || {},
        ipAddress: params.ipAddress,
      },
    });
  }
}
