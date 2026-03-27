import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { IntelligenceService } from "./intelligence.service";

@Module({
  imports: [ConfigModule],
  providers: [IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
