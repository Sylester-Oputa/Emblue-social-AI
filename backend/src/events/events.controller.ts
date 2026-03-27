import { Controller, Get, Param, Sse, MessageEvent } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Observable, map } from "rxjs";
import { EventsService } from "./events.service";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Events")
@ApiBearerAuth()
@Controller("workspaces/:workspaceId/events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse("stream")
  @Roles(
    "VIEWER",
    "OPERATOR",
    "REVIEWER",
    "ANALYST",
    "WORKSPACE_ADMIN",
    "TENANT_ADMIN",
  )
  @ApiOperation({ summary: "SSE stream of workspace pipeline events" })
  stream(@Param("workspaceId") workspaceId: string): Observable<MessageEvent> {
    return this.eventsService.getStream(workspaceId).pipe(
      map(
        (event) =>
          ({
            type: event.type,
            data: JSON.stringify(event),
          }) as MessageEvent,
      ),
    );
  }
}
