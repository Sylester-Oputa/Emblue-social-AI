import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 'VIEWER', enum: ['TENANT_ADMIN', 'WORKSPACE_ADMIN', 'ANALYST', 'REVIEWER', 'OPERATOR', 'VIEWER'] })
  @IsOptional()
  @IsString()
  role?: string;
}
