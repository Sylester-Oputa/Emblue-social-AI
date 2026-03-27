import { Module } from "@nestjs/common";
import { SignalsController } from "./signals.controller";
import { SignalsService } from "./signals.service";
import { RiskEventService } from "./risk-event.service";
import { RiskEventController } from "./risk-event.controller";
import { EscalationService } from "./escalation.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [SignalsController, RiskEventController],
  providers: [SignalsService, RiskEventService, EscalationService],
  exports: [SignalsService, RiskEventService, EscalationService],
})
export class SignalsModule {}
