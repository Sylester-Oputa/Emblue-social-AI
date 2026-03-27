import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      objective?: string;
      startDate?: string;
      endDate?: string;
      settings?: any;
    },
  ) {
    return this.prisma.campaign.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description,
        objective: data.objective,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        settings: data.settings || {},
      },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.campaign.findMany({
      where: { workspaceId },
      include: { _count: { select: { drafts: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(workspaceId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: {
        drafts: { take: 20, orderBy: { createdAt: "desc" } },
        _count: { select: { drafts: true } },
      },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  async update(
    workspaceId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      objective?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      settings?: any;
    },
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.objective !== undefined && { objective: data.objective }),
        ...(data.status !== undefined && { status: data.status as any }),
        ...(data.startDate !== undefined && {
          startDate: new Date(data.startDate),
        }),
        ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.settings !== undefined && { settings: data.settings }),
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    await this.prisma.campaign.delete({ where: { id } });
    return { success: true };
  }
}
