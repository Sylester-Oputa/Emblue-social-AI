import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { ShortlinksService } from "./shortlinks.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { WorkspaceAccessGuard } from "../common/guards/workspace-access.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";
import { CreateShortlinkDto, ShortlinkQueryDto } from "./dto/shortlink.dto";
import { WorkspaceIdParamDto } from "../common/dto/query-params.dto";

@ApiTags("Shortlinks")
@Controller()
export class ShortlinksController {
  constructor(private readonly shortlinksService: ShortlinksService) {}

  @Post("workspaces/:workspaceId/shortlinks")
  @UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "ANALYST")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a shortlink" })
  async create(
    @Param() params: WorkspaceIdParamDto,
    @Body() body: CreateShortlinkDto,
  ) {
    return this.shortlinksService.create({
      workspaceId: params.workspaceId,
      ...body,
    });
  }

  @Get("workspaces/:workspaceId/shortlinks")
  @UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "ANALYST")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List shortlinks" })
  async findAll(
    @Param() params: WorkspaceIdParamDto,
    @Query() query: ShortlinkQueryDto,
  ) {
    return this.shortlinksService.findAll(
      params.workspaceId,
      query.page || 1,
      query.limit || 20,
    );
  }

  @Get("workspaces/:workspaceId/shortlinks/:id/stats")
  @UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN", "ANALYST")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get shortlink stats" })
  async getStats(@Param("id") id: string) {
    return this.shortlinksService.getStats(id);
  }

  @Delete("workspaces/:workspaceId/shortlinks/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAccessGuard)
  @Roles("SUPER_ADMIN", "TENANT_ADMIN", "WORKSPACE_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a shortlink" })
  async delete(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
  ) {
    await this.shortlinksService.delete(id, workspaceId);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get("s/:code")
  @ApiOperation({ summary: "Redirect shortlink" })
  async redirect(
    @Param("code") code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers["referer"] || req.headers["referrer"] || "";

    const destination = await this.shortlinksService.resolve(
      code,
      ip,
      userAgent,
      referrer as string,
    );
    res.redirect(302, destination);
  }
}
