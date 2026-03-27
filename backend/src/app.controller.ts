import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check with service statuses' })
  async ready() {
    const dbHealth = await this.prisma.healthCheck();
    return {
      status: 'ready',
      services: {
        database: dbHealth,
      },
    };
  }
}
