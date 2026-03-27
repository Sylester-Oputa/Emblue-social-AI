import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles('VIEWER', 'OPERATOR', 'REVIEWER', 'ANALYST', 'WORKSPACE_ADMIN', 'TENANT_ADMIN')
  @ApiOperation({ summary: 'Get workspace analytics summary' })
  async getSummary(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getSummary(workspaceId);
  }
}
