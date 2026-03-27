import { IsString, IsOptional, IsIn } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Jane" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Smith" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: "ANALYST",
    enum: [
      "TENANT_ADMIN",
      "WORKSPACE_ADMIN",
      "ANALYST",
      "REVIEWER",
      "OPERATOR",
      "VIEWER",
    ],
  })
  @IsOptional()
  @IsIn([
    "TENANT_ADMIN",
    "WORKSPACE_ADMIN",
    "ANALYST",
    "REVIEWER",
    "OPERATOR",
    "VIEWER",
  ])
  role?: string;
}
