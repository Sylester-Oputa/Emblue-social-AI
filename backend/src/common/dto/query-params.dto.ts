import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class PaginationQueryDto {
  @ApiProperty({ required: false, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class UuidParamDto {
  @ApiProperty({ format: "uuid" })
  @IsString()
  id: string;
}

export class WorkspaceIdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsString()
  workspaceId: string;
}
