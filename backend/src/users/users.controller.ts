import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('WORKSPACE_ADMIN')
  @ApiOperation({ summary: 'List users in tenant' })
  async findAll(@CurrentUser() user: any, @Query('workspaceId') workspaceId?: string) {
    return this.usersService.findAll(user.tenantId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles('WORKSPACE_ADMIN')
  @ApiOperation({ summary: 'Update user profile' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.usersService.update(id, dto, user, req.ip);
  }

  @Patch(':id/deactivate')
  @Roles('TENANT_ADMIN')
  @ApiOperation({ summary: 'Deactivate user' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.usersService.deactivate(id, user, req.ip);
  }
}
