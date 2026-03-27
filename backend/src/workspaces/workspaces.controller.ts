import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { WorkspacesService } from "./workspaces.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { AddMemberDto } from "./dto/add-member.dto";

@ApiTags("Workspaces")
@ApiBearerAuth()
@Controller("workspaces")
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @Roles("TENANT_ADMIN")
  @ApiOperation({ summary: "Create workspace" })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.workspacesService.create(dto, user, req.ip);
  }

  @Get()
  @ApiOperation({ summary: "List workspaces for current tenant" })
  async findAll(@CurrentUser() user: any) {
    return this.workspacesService.findAll(user.tenantId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get workspace by ID" })
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.workspacesService.findOne(id, user.tenantId);
  }

  @Patch(":id")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Update workspace" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.workspacesService.update(id, dto, user, req.ip);
  }

  @Delete(":id")
  @Roles("TENANT_ADMIN")
  @ApiOperation({ summary: "Delete workspace" })
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.workspacesService.remove(id, user, req.ip);
  }

  @Post(":id/members")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Add member to workspace" })
  async addMember(
    @Param("id") id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.workspacesService.addMember(id, dto, user, req.ip);
  }

  @Delete(":id/members/:userId")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Remove member from workspace" })
  async removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.workspacesService.removeMember(id, userId, user, req.ip);
  }

  // ── Automation Controls ──

  @Get(":id/automation/status")
  @Roles("ANALYST")
  @ApiOperation({ summary: "Get automation status for workspace" })
  async getAutomationStatus(@Param("id") id: string, @CurrentUser() user: any) {
    return this.workspacesService.getAutomationStatus(id, user.tenantId);
  }

  @Post(":id/automation/pause")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Pause automation for workspace" })
  async pauseAutomation(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.workspacesService.pauseAutomation(
      id,
      user,
      body.reason,
      req.ip,
    );
  }

  @Post(":id/automation/resume")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Resume automation for workspace" })
  async resumeAutomation(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.workspacesService.resumeAutomation(id, user, req.ip);
  }
}
