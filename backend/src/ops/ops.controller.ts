import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { OpsService } from "./ops.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Ops")
@ApiBearerAuth()
@Controller("ops")
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get("health")
  @Roles("TENANT_ADMIN")
  @ApiOperation({ summary: "Get system health status" })
  async getSystemHealth() {
    return this.opsService.getSystemHealth();
  }

  @Get("workspaces/:workspaceId/queues")
  @Roles("ANALYST", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Get queue statistics for a workspace" })
  async getQueueStats(@Param("workspaceId") workspaceId: string) {
    return this.opsService.getQueueStats(workspaceId);
  }

  @Get("workspaces/:workspaceId/pipeline")
  @Roles("ANALYST", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Get pipeline statistics for a workspace" })
  async getPipelineStats(@Param("workspaceId") workspaceId: string) {
    return this.opsService.getPipelineStats(workspaceId);
  }
}
