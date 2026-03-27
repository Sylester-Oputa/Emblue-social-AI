import { IsString, IsUrl, IsOptional, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../common/dto/query-params.dto";

export class CreateShortlinkDto {
  @ApiProperty()
  @IsUrl()
  @MaxLength(2048)
  destinationUrl: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmContent?: string;
}

export class ShortlinkQueryDto extends PaginationQueryDto {}
