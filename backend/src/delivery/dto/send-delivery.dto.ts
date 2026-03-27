import { IsUUID, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendDeliveryDto {
  @ApiProperty()
  @IsUUID()
  draftId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  idempotencyKey: string;
}
