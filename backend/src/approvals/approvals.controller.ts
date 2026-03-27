import { Controller, Get, Param, Query, Patch, Body, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { Roles } from '../common/decorators/roles.decorator';
import { ApprovalStatus } from '@prisma/client';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @Roles('VIEWER', 'OPERATOR', 'REVIEWER', 'ANALYST', 'WORKSPACE_ADMIN', 'TENANT_ADMIN')
  @ApiOperation({ summary: 'List approval requests' })
  @ApiQuery({ name: 'status', required: false, enum: ApprovalStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: ApprovalStatus,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.approvalsService.findAll(workspaceId, {
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  }

  @Patch(':id/approve')
  @Roles('REVIEWER', 'WORKSPACE_ADMIN', 'TENANT_ADMIN')
  @ApiOperation({ summary: 'Approve a request' })
  async approve(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Request() req: any,
  ) {
    return this.approvalsService.actionRequest(id, workspaceId, req.user.userId, 'APPROVED', comment);
  }

  @Patch(':id/reject')
  @Roles('REVIEWER', 'WORKSPACE_ADMIN', 'TENANT_ADMIN')
  @ApiOperation({ summary: 'Reject a request' })
  async reject(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body('comment') comment: string,
    @Request() req: any,
  ) {
    return this.approvalsService.actionRequest(id, workspaceId, req.user.userId, 'REJECTED', comment);
  }
}
