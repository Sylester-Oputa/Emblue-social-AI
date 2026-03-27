import { IsString, IsOptional, IsObject, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class WebhookPayloadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tweet_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  author_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  user?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  from?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  comment?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  message?: Record<string, any>;

  @ApiPropertyOptional({ description: "Raw webhook metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
