import { Module } from "@nestjs/common";
import { ResponsesController } from "./responses.controller";
import { ResponsesService } from "./responses.service";
import { IntelligenceModule } from "../intelligence/intelligence.module";

@Module({
  imports: [IntelligenceModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}
