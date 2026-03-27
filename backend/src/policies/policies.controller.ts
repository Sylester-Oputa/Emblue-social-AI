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
import { PoliciesService } from "./policies.service";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("Policies")
@ApiBearerAuth()
@Controller("workspaces/:workspaceId/policies")
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get("rulesets")
  @Roles("ANALYST", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "List all policy rulesets for tenant" })
  async findAll(@CurrentUser() user: any) {
    return this.policiesService.findAllRules(user.tenantId);
  }

  @Post("rulesets")
  @Roles("WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Create a policy ruleset" })
  async create(
    @CurrentUser() user: any,
    @Body()
    body: {
      ruleKey: string;
      name: string;
      description?: string;
      priority?: number;
      config?: Record<string, any>;
    },
  ) {
    return this.policiesService.createRule(user.tenantId, body);
  }

  @Patch("rulesets/:id")
  @Roles("WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Update a policy ruleset" })
  async update(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      name?: string;
      description?: string;
      priority?: number;
      isActive?: boolean;
      config?: Record<string, any>;
    },
  ) {
    return this.policiesService.updateRule(id, user.tenantId, body);
  }

  @Delete("rulesets/:id")
  @Roles("WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Delete a policy ruleset" })
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.policiesService.deleteRule(id, user.tenantId);
  }
}
