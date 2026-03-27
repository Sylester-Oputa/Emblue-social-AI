import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { AgentRunService } from "./agent-run.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { WorkspaceAccessGuard } from "../common/guards/workspace-access.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { AgentRunQueryDto } from "./dto/agent-run-query.dto";
import { WorkspaceIdParamDto } from "../common/dto/query-params.dto";

@ApiTags("Agent Runs")
@Controller("workspaces/:workspaceId/agent-runs")
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
export class AgentRunController {
  constructor(private readonly agentRunService: AgentRunService) {}

  @Get()
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "ANALYST")
  @ApiOperation({ summary: "List agent runs for workspace" })
  async findAll(
    @Param() params: WorkspaceIdParamDto,
    @Query() query: AgentRunQueryDto,
  ) {
    return this.agentRunService.findAll(
      params.workspaceId,
      query.page || 1,
      query.limit || 20,
      query.agentName,
    );
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "ANALYST")
  @ApiOperation({ summary: "Get agent run statistics" })
  async getStats(@Param("workspaceId") workspaceId: string) {
    return this.agentRunService.getStats(workspaceId);
  }
}
