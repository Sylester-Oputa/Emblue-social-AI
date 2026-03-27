import { Module, Global } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
