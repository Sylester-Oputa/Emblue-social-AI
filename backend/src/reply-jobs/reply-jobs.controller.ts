import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ReplyJobsService } from "./reply-jobs.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";

@Controller("workspaces/:workspaceId/reply-jobs")
@UseGuards(JwtAuthGuard)
export class ReplyJobsController {
  constructor(private readonly replyJobsService: ReplyJobsService) {}

  /**
   * FR-11: List reply jobs in queue
   * GET /workspaces/:workspaceId/reply-jobs/queue
   */
  @Get("queue")
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  async getQueue(
    @Param("workspaceId") workspaceId: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const result = await this.replyJobsService.getQueue(workspaceId, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * FR-11: Get reply job detail
   * GET /workspaces/:workspaceId/reply-jobs/:jobId
   */
  @Get(":jobId")
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  async getJobDetail(
    @Param("workspaceId") workspaceId: string,
    @Param("jobId") jobId: string,
  ) {
    const result = await this.replyJobsService.getJobDetail(jobId, workspaceId);

    return {
      success: true,
      data: result,
    };
  }
}
