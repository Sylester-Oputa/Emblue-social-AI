import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AgentRunService } from "./agent-run.service";
import { AgentRunController } from "./agent-run.controller";

@Global()
@Module({
  controllers: [AgentRunController],
  providers: [AuditService, AgentRunService],
  exports: [AuditService, AgentRunService],
})
export class AuditModule {}
