import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CampaignsService } from "./campaigns.service";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Campaigns")
@ApiBearerAuth()
@Controller("workspaces/:workspaceId/campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Create a campaign" })
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      objective?: string;
      startDate?: string;
      endDate?: string;
      settings?: any;
    },
  ) {
    return this.campaignsService.create(workspaceId, body);
  }

  @Get()
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  @ApiOperation({ summary: "List campaigns for workspace" })
  async findAll(@Param("workspaceId") workspaceId: string) {
    return this.campaignsService.findAll(workspaceId);
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
  @ApiOperation({ summary: "Get campaign by ID" })
  async findOne(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.campaignsService.findOne(workspaceId, id);
  }

  @Patch(":id")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Update a campaign" })
  async update(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      objective?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      settings?: any;
    },
  ) {
    return this.campaignsService.update(workspaceId, id, body);
  }

  @Delete(":id")
  @Roles("WORKSPACE_ADMIN")
  @ApiOperation({ summary: "Delete a campaign" })
  async remove(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    return this.campaignsService.remove(workspaceId, id);
  }
}
