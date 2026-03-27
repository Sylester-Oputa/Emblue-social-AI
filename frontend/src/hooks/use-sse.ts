"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentWorkspaceId } from "./use-workspace";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";

export type SSEEventType =
  | "signal.created"
  | "draft.generated"
  | "draft.approved"
  | "draft.escalated"
  | "delivery.success"
  | "delivery.failed";

interface SSEEvent {
  type: SSEEventType;
  data: any;
}

export function useSSE(onEvent?: (event: SSEEvent) => void) {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!workspaceId) return;

    // Always read fresh token on each connection attempt
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const url = `${API_URL}/workspaces/${workspaceId}/events/stream?token=${token}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      retryCountRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const eventType = parsed.type || parsed.eventType;

        // Refresh relevant queries
        queryClient.invalidateQueries({ queryKey: ["analytics"] });
        queryClient.invalidateQueries({ queryKey: ["signals"] });
        queryClient.invalidateQueries({ queryKey: ["responses"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });

        // Show toast based on event type
        switch (eventType) {
          case "signal.created":
            toast.info("New signal received", {
              description: `From ${parsed.data?.platform || "platform"}`,
            });
            break;
          case "draft.approved":
            toast.success("Draft auto-approved", {
              description: "Response ready for delivery",
            });
            break;
          case "draft.escalated":
            toast.warning("Draft escalated", {
              description: "Requires human review",
            });
            break;
          case "delivery.success":
            toast.success("Response delivered", {
              description: "Posted to platform",
            });
            break;
          case "delivery.failed":
            toast.error("Delivery failed", {
              description: parsed.data?.reason || "Check delivery logs",
            });
            break;
        }

        onEventRef.current?.({ type: eventType, data: parsed.data || parsed });
      } catch {
        // ignore non-JSON messages (heartbeats)
      }
    };

    es.onerror = () => {
      es.close();
      retryCountRef.current += 1;
      // Exponential backoff: 5s, 10s, 20s, 40s, capped at 60s
      const delay = Math.min(
        5000 * Math.pow(2, retryCountRef.current - 1),
        60000,
      );
      setTimeout(connect, delay);
    };
  }, [workspaceId, queryClient]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);
}
