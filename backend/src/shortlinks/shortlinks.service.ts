import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { createHash } from "crypto";

// nanoid v3 (CommonJS compatible)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { nanoid } = require("nanoid");

@Injectable()
export class ShortlinksService {
  private readonly logger = new Logger(ShortlinksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    workspaceId: string;
    destinationUrl: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
  }) {
    const code = nanoid(8);
    return this.prisma.shortlink.create({
      data: {
        workspaceId: params.workspaceId,
        code,
        destinationUrl: params.destinationUrl,
        utmSource: params.utmSource,
        utmMedium: params.utmMedium,
        utmCampaign: params.utmCampaign,
        utmContent: params.utmContent,
      },
    });
  }

  async findAll(workspaceId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.shortlink.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { clicks: true } } },
      }),
      this.prisma.shortlink.count({ where: { workspaceId } }),
    ]);

    return {
      data: data.map((s) => ({ ...s, clickCount: s._count.clicks })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async resolve(
    code: string,
    ip: string,
    userAgent: string,
    referrer?: string,
  ) {
    const shortlink = await this.prisma.shortlink.findUnique({
      where: { code },
    });
    if (!shortlink) throw new NotFoundException("Shortlink not found");

    // Hash IP for privacy (no raw IPs stored)
    const ipHash = createHash("sha256")
      .update(ip)
      .digest("hex")
      .substring(0, 16);

    await this.prisma.shortlinkClick.create({
      data: {
        shortlinkId: shortlink.id,
        ipHash,
        userAgent: userAgent?.substring(0, 500),
        referrer: referrer?.substring(0, 1000),
      },
    });

    // Build destination with UTM params
    const url = new URL(shortlink.destinationUrl);
    if (shortlink.utmSource)
      url.searchParams.set("utm_source", shortlink.utmSource);
    if (shortlink.utmMedium)
      url.searchParams.set("utm_medium", shortlink.utmMedium);
    if (shortlink.utmCampaign)
      url.searchParams.set("utm_campaign", shortlink.utmCampaign);
    if (shortlink.utmContent)
      url.searchParams.set("utm_content", shortlink.utmContent);

    return url.toString();
  }

  async getStats(shortlinkId: string) {
    const shortlink = await this.prisma.shortlink.findUnique({
      where: { id: shortlinkId },
      include: {
        _count: { select: { clicks: true } },
        clicks: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { createdAt: true, referrer: true, userAgent: true },
        },
      },
    });
    if (!shortlink) throw new NotFoundException("Shortlink not found");

    return {
      ...shortlink,
      totalClicks: (shortlink as any)._count?.clicks ?? shortlink.clickCount,
    };
  }

  async delete(id: string, workspaceId: string) {
    const shortlink = await this.prisma.shortlink.findFirst({
      where: { id, workspaceId },
    });
    if (!shortlink) throw new NotFoundException("Shortlink not found");

    await this.prisma.shortlinkClick.deleteMany({ where: { shortlinkId: id } });
    return this.prisma.shortlink.delete({ where: { id } });
  }
}
