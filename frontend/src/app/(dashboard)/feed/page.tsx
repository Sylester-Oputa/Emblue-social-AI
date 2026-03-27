"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSSE, SSEEventType } from "@/hooks/use-sse";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Radio,
  CheckCircle,
  AlertTriangle,
  Send,
  XCircle,
  Sparkles,
  ArrowDown,
} from "lucide-react";

interface FeedEvent {
  id: string;
  type: SSEEventType;
  data: any;
  timestamp: Date;
}

const eventConfig: Record<string, { icon: any; color: string; label: string }> =
  {
    "signal.created": {
      icon: Radio,
      color: "text-blue-500",
      label: "Signal Received",
    },
    "draft.generated": {
      icon: Sparkles,
      color: "text-purple-500",
      label: "Draft Generated",
    },
    "draft.approved": {
      icon: CheckCircle,
      color: "text-green-500",
      label: "Auto-Approved",
    },
    "draft.escalated": {
      icon: AlertTriangle,
      color: "text-orange-500",
      label: "Escalated",
    },
    "delivery.success": {
      icon: Send,
      color: "text-emerald-500",
      label: "Delivered",
    },
    "delivery.failed": {
      icon: XCircle,
      color: "text-red-500",
      label: "Failed",
    },
  };

const tabs = [
  "All",
  "Auto-Approved",
  "Escalated",
  "Delivered",
  "Failed",
] as const;
const tabFilters: Record<string, SSEEventType[]> = {
  All: [],
  "Auto-Approved": ["draft.approved"],
  Escalated: ["draft.escalated"],
  Delivered: ["delivery.success"],
  Failed: ["delivery.failed"],
};

export default function FeedPage() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [hasNew, setHasNew] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load events from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("feed-events");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restore dates
        const restored = parsed.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
        setEvents(restored);
        // Update counter to avoid ID collisions
        const maxId = Math.max(
          ...restored.map((e: any) => parseInt(e.id.replace("evt-", "")) || 0),
          0,
        );
        counterRef.current = maxId;
      }
    } catch (error) {
      console.error("Failed to load feed events:", error);
    }
    setIsHydrated(true);
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (isHydrated && events.length > 0) {
      try {
        localStorage.setItem("feed-events", JSON.stringify(events));
      } catch (error) {
        console.error("Failed to save feed events:", error);
      }
    }
  }, [events, isHydrated]);

  const handleEvent = useCallback(
    (event: { type: SSEEventType; data: any }) => {
      counterRef.current += 1;
      setEvents((prev) => [
        {
          id: `evt-${counterRef.current}`,
          type: event.type,
          data: event.data,
          timestamp: new Date(),
        },
        ...prev.slice(0, 99),
      ]);
      setHasNew(true);
    },
    [],
  );

  useSSE(handleEvent);

  const filtered =
    activeTab === "All"
      ? events
      : events.filter((e) => tabFilters[activeTab]?.includes(e.type));

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setHasNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Live Feed</h2>
        <Badge variant="outline" className="animate-pulse">
          <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500 inline-block" />
          Live
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* New events banner */}
      {hasNew && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={scrollToTop}
        >
          <ArrowDown className="mr-2 h-4 w-4" /> New events available
        </Button>
      )}

      {/* Events list */}
      <ScrollArea className="h-[calc(100vh-280px)]" ref={scrollRef}>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Radio className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Waiting for pipeline events...
                  <br />
                  <span className="text-sm">
                    Use the Demo Mode button to trigger a live demo
                  </span>
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((event) => {
              const config =
                eventConfig[event.type] || eventConfig["signal.created"];
              const Icon = config.icon;
              return (
                <Card key={event.id} className="transition-all hover:shadow-md">
                  <CardContent className="flex items-start gap-4 py-4">
                    <div className={`mt-0.5 ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{config.label}</p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {event.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {event.data?.content ||
                          event.data?.message ||
                          JSON.stringify(event.data).slice(0, 120)}
                      </p>
                      {event.data?.platform && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {event.data.platform}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
