import { IsOptional, IsEnum, IsString, IsObject } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { RiskEventStatus, RiskLevel, RiskEventCategory } from "@prisma/client";
import { PaginationQueryDto } from "../../common/dto/query-params.dto";

export class RiskEventQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: RiskEventStatus, required: false })
  @IsOptional()
  @IsEnum(RiskEventStatus)
  status?: RiskEventStatus;

  @ApiProperty({ enum: RiskLevel, required: false })
  @IsOptional()
  @IsEnum(RiskLevel)
  severity?: RiskLevel;
}

export class CreateRiskEventDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  draftId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  signalId?: string;

  @ApiProperty({ enum: RiskEventCategory })
  @IsEnum(RiskEventCategory)
  category: RiskEventCategory;

  @ApiProperty({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  severity: RiskLevel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AcknowledgeRiskEventDto {
  @ApiProperty()
  @IsString()
  acknowledgedBy: string;
}

export class ResolveRiskEventDto {
  @ApiProperty()
  @IsString()
  resolvedBy: string;
}
