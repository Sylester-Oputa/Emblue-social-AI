import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { SignalsService } from "./signals.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { WorkspaceAccessGuard } from "../common/guards/workspace-access.guard";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Signals")
@ApiBearerAuth()
@Controller("workspaces/:workspaceId/signals")
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get()
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  @ApiOperation({ summary: "List normalized signals with filters" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "platform", required: false })
  @ApiQuery({ name: "sentiment", required: false })
  @ApiQuery({ name: "intent", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(
    @Param("workspaceId") workspaceId: string,
    @Query("status") status?: string,
    @Query("platform") platform?: string,
    @Query("sentiment") sentiment?: string,
    @Query("intent") intent?: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20",
  ) {
    return this.signalsService.findAll(workspaceId, {
      status,
      platform,
      sentiment,
      intent,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Get(":id")
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  @ApiOperation({ summary: "Get normalized signal detail" })
  async findOne(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.signalsService.findOne(id, workspaceId);
  }

  @Get(":id/context")
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  @ApiOperation({
    summary: "Get message context with thread and workspace rules",
  })
  async getContext(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.signalsService.getContext(id, workspaceId);
  }
}
