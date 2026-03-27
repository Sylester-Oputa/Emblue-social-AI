import { IsString, IsEnum, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlatformType } from '@prisma/client';

export class ConnectIntegrationDto {
  @ApiProperty({ enum: PlatformType })
  @IsEnum(PlatformType)
  platform: PlatformType;

  @ApiProperty({ example: 'my-brand-account' })
  @IsString()
  accountId: string;

  @ApiProperty({ example: 'My Brand Account' })
  @IsString()
  accountName: string;

  @ApiProperty({ example: ['read', 'write'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  scopes: string[];

  // In a real app, these would come from the OAuth callback, not the request body
  // However, since we are stubbing OAuth, we accept them here for testing purposes
  @ApiProperty({ example: 'stub-access-token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ example: 'stub-refresh-token' })
  @IsString()
  refreshToken: string;
}
