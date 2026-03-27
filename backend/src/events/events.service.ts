import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Subject, Observable } from "rxjs";
import { filter } from "rxjs/operators";

export interface PipelineEvent {
  workspaceId: string;
  type: string; // signal.created, draft.generated, draft.approved, draft.escalated, delivery.success, delivery.failed
  data: any;
  timestamp: string;
}

@Injectable()
export class EventsService {
  private readonly stream$ = new Subject<PipelineEvent>();

  constructor(private readonly eventEmitter: EventEmitter2) {
    // Listen to all pipeline events and push to SSE stream
    this.eventEmitter.on("pipeline.**", (event: PipelineEvent) => {
      this.stream$.next(event);
    });
  }

  /** Emit a pipeline event */
  emit(workspaceId: string, type: string, data: any) {
    const event: PipelineEvent = {
      workspaceId,
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.eventEmitter.emit(`pipeline.${type}`, event);
  }

  /** Get an Observable filtered by workspaceId for SSE */
  getStream(workspaceId: string): Observable<PipelineEvent> {
    return this.stream$
      .asObservable()
      .pipe(filter((event) => event.workspaceId === workspaceId));
  }
}
