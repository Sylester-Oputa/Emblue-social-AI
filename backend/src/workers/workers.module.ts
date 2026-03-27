import { Global, Module } from "@nestjs/common";
import { IngestionProcessor } from "./ingestion.processor";
import { NormalizationProcessor } from "./normalization.processor";
import { PolicyProcessor } from "./policy.processor";
import { AutomationProcessor } from "./automation.processor";
import { AutoApprovalProcessor } from "./auto-approval.processor";
import { DeliveryProcessor } from "./delivery.processor";
import { ResponseGenerationProcessor } from "./response-generation.processor";
import { PoliciesModule } from "../policies/policies.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { ResponsesModule } from "../responses/responses.module";
import { DeliveryModule } from "../delivery/delivery.module";
import { SignalsModule } from "../signals/signals.module";
import { IntelligenceModule } from "../intelligence/intelligence.module";

@Global()
@Module({
  imports: [
    PoliciesModule,
    ApprovalsModule,
    ResponsesModule,
    DeliveryModule,
    SignalsModule,
    IntelligenceModule,
  ],
  providers: [
    IngestionProcessor,
    NormalizationProcessor,
    PolicyProcessor,
    AutomationProcessor,
    AutoApprovalProcessor,
    DeliveryProcessor,
    ResponseGenerationProcessor,
  ],
  exports: [
    IngestionProcessor,
    NormalizationProcessor,
    PolicyProcessor,
    AutomationProcessor,
    AutoApprovalProcessor,
    DeliveryProcessor,
    ResponseGenerationProcessor,
  ],
})
export class WorkersModule {}
