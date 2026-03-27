import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "StrongP@ss123" })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  })
  password: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @MinLength(1)
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @MinLength(1)
  lastName: string;

  @ApiPropertyOptional({ example: "Acme Corp" })
  @IsOptional()
  @IsString()
  companyName?: string;
}
