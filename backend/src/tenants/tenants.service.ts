import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findOne(id: string, currentTenantId: string) {
    if (id !== currentTenantId) {
      throw new ForbiddenException('Cannot access another tenant');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto, user: any, ipAddress?: string) {
    if (id !== user.tenantId) {
      throw new ForbiddenException('Cannot modify another tenant');
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.settings && { settings: dto.settings }),
      },
    });

    await this.audit.log({
      tenantId: user.tenantId,
      actorId: user.sub,
      action: 'tenant.updated',
      resourceType: 'tenant',
      resourceId: id,
      context: { changes: dto },
      ipAddress,
    });

    return tenant;
  }
}
