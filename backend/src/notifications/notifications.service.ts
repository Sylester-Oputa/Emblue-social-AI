import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    resourceId?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, resourceId },
    });
    this.logger.log(`Notification created for user ${userId}: ${type}`);
    return notification;
  }

  async findAll(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // Helper to create common notification types
  async notifyEscalation(userId: string, signalId: string, reason: string) {
    return this.create(
      userId,
      "escalation",
      "Signal Escalated",
      `A signal requires your review: ${reason}`,
      signalId,
    );
  }

  async notifyApproval(userId: string, draftId: string) {
    return this.create(
      userId,
      "approval",
      "Draft Approved",
      "A response draft has been approved and is ready for delivery.",
      draftId,
    );
  }

  async notifyDeliveryFailure(
    userId: string,
    attemptId: string,
    error: string,
  ) {
    return this.create(
      userId,
      "delivery_failure",
      "Delivery Failed",
      `A response delivery failed: ${error}`,
      attemptId,
    );
  }
}
