import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../common/dto/query-params.dto";

export class AgentRunQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentName?: string;
}
