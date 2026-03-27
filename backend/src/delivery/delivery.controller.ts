import { Controller, Post, Body, Param, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DeliveryService } from "./delivery.service";
import { Roles } from "../common/decorators/roles.decorator";
import { SendDeliveryDto } from "./dto/send-delivery.dto";

@ApiTags("Delivery")
@ApiBearerAuth()
@Controller("workspaces/:workspaceId/delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post("send")
  @Roles("OPERATOR", "WORKSPACE_ADMIN", "TENANT_ADMIN")
  @ApiOperation({ summary: "Send response draft to social platform" })
  async send(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: SendDeliveryDto,
  ) {
    return this.deliveryService.sendResponse(
      workspaceId,
      dto.draftId,
      dto.idempotencyKey,
    );
  }
}
