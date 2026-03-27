import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Marketing Team' })
  @IsString()
  @MinLength(1)
  name: string;
}
