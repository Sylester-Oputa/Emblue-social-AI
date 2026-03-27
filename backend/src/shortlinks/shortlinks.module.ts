import { Module } from "@nestjs/common";
import { ShortlinksService } from "./shortlinks.service";
import { ShortlinksController } from "./shortlinks.controller";

@Module({
  controllers: [ShortlinksController],
  providers: [ShortlinksService],
  exports: [ShortlinksService],
})
export class ShortlinksModule {}
