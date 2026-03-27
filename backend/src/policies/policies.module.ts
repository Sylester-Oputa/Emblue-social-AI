import { Module } from "@nestjs/common";
import { PoliciesController } from "./policies.controller";
import { PoliciesService } from "./policies.service";
import { PolicyEnforcementService } from "./policy-enforcement.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [PoliciesController],
  providers: [PoliciesService, PolicyEnforcementService],
  exports: [PoliciesService, PolicyEnforcementService],
})
export class PoliciesModule {}
