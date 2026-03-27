import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { ResponsesService } from "./responses.service";
import { Roles } from "../common/decorators/roles.decorator";
import { OverrideDraftDto } from "./dto/override-draft.dto";

@ApiTags("Responses")
@ApiBearerAuth()
@Controller("workspaces/:workspaceId/responses")
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Get()
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  @ApiOperation({ summary: "List response drafts" })
  @ApiQuery({ name: "signalId", required: false })
  @ApiQuery({ name: "status", required: false })
  async findAll(
    @Param("workspaceId") workspaceId: string,
    @Request() req: any,
    @Query("signalId") signalId?: string,
    @Query("status") status?: string,
  ) {
    return this.responsesService.findAll(
      workspaceId,
      req.user.tenantId,
      signalId,
      status,
    );
  }

  @Get("escalated")
  @Roles("REVIEWER", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "List escalated drafts requiring review" })
  async findEscalated(
    @Param("workspaceId") workspaceId: string,
    @Request() req: any,
  ) {
    return this.responsesService.findEscalated(workspaceId, req.user.tenantId);
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
  @ApiOperation({ summary: "Get response draft detail" })
  async findOne(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Request() req: any,
  ) {
    return this.responsesService.findOne(id, workspaceId, req.user.tenantId);
  }

  @Post()
  @Roles("OPERATOR", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Create manual response draft" })
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body("signalId") signalId: string,
    @Body("content") content: string,
    @Body("ctaText") ctaText: string,
    @Request() req: any,
  ) {
    return this.responsesService.createDraft(
      workspaceId,
      signalId,
      content,
      ctaText,
      req.user.userId,
    );
  }

  @Post("generate/:signalId")
  @Roles("OPERATOR", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Generate AI response draft" })
  async generateAi(
    @Param("workspaceId") workspaceId: string,
    @Param("signalId") signalId: string,
    @Request() req: any,
  ) {
    return this.responsesService.generateStubAIResponse(
      workspaceId,
      signalId,
      req.user.userId,
    );
  }

  @Post(":id/override")
  @Roles("REVIEWER", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Override an escalated draft (approve or reject)" })
  async override(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() body: OverrideDraftDto,
    @Request() req: any,
  ) {
    return this.responsesService.overrideDraft(
      id,
      workspaceId,
      req.user.userId,
      body.action,
      body.comment,
    );
  }

  @Patch(":id")
  @Roles("OPERATOR", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({
    summary: "Update response draft content (creates new version)",
  })
  async update(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body("content") content: string,
    @Body("ctaText") ctaText: string,
    @Request() req: any,
  ) {
    return this.responsesService.updateDraft(
      id,
      workspaceId,
      content,
      ctaText,
      req.user.userId,
    );
  }
}
