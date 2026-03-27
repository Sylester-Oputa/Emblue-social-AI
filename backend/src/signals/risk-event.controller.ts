import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { RiskEventService } from "./risk-event.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { WorkspaceAccessGuard } from "../common/guards/workspace-access.guard";
import { Roles } from "../common/decorators/roles.decorator";
import {
  RiskEventQueryDto,
  CreateRiskEventDto,
  AcknowledgeRiskEventDto,
  ResolveRiskEventDto,
} from "./dto/risk-event-query.dto";
import { WorkspaceIdParamDto } from "../common/dto/query-params.dto";

@ApiTags("Risk Events")
@Controller("workspaces/:workspaceId/risk-events")
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
export class RiskEventController {
  constructor(private readonly riskEventService: RiskEventService) {}

  @Get()
  @Roles(
    "SUPER_ADMIN",
    "TENANT_ADMIN",
    "WORKSPACE_ADMIN",
    "ANALYST",
    "REVIEWER",
  )
  @ApiOperation({ summary: "List risk events for workspace" })
  async findAll(
    @Param() params: WorkspaceIdParamDto,
    @Query() query: RiskEventQueryDto,
  ) {
    return this.riskEventService.findAll(
      params.workspaceId,
      query.status,
      query.severity,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get("stats")
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "ANALYST")
  @ApiOperation({ summary: "Get risk event statistics" })
  async getStats(@Param() params: WorkspaceIdParamDto) {
    return this.riskEventService.getStats(params.workspaceId);
  }

  @Post()
  @Roles(
    "SUPER_ADMIN",
    "TENANT_ADMIN",
    "WORKSPACE_ADMIN",
    "ANALYST",
    "REVIEWER",
  )
  @ApiOperation({ summary: "Manually create a risk event" })
  async create(
    @Param() params: WorkspaceIdParamDto,
    @Body() body: CreateRiskEventDto,
  ) {
    return this.riskEventService.create({
      workspaceId: params.workspaceId,
      ...body,
    });
  }

  @Patch(":id/acknowledge")
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "REVIEWER")
  @ApiOperation({ summary: "Acknowledge a risk event" })
  async acknowledge(@Param("id") id: string, @Request() req: any) {
    return this.riskEventService.acknowledge(
      id,
      req.user.userId,
      req.user.tenantId,
    );
  }

  @Patch(":id/resolve")
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "REVIEWER")
  @ApiOperation({ summary: "Resolve a risk event" })
  async resolve(@Param("id") id: string, @Request() req: any) {
    return this.riskEventService.resolve(
      id,
      req.user.userId,
      req.user.tenantId,
    );
  }
}
