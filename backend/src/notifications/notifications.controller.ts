import { Controller, Get, Patch, Post, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List notifications for current user" })
  async findAll(
    @CurrentUser() user: any,
    @Query("unreadOnly") unreadOnly?: string,
  ) {
    return this.notificationsService.findAll(user.sub, unreadOnly === "true");
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notification count" })
  async unreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  async markRead(@Param("id") id: string, @CurrentUser() user: any) {
    await this.notificationsService.markRead(id, user.sub);
    return { success: true };
  }

  @Post("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllRead(user.sub);
    return { success: true };
  }
}
