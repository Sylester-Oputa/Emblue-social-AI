"use client";

import { useState } from "react";
import {
  useRiskEvents,
  useRiskEventStats,
  useAcknowledgeRiskEvent,
  useResolveRiskEvent,
} from "@/hooks/use-risk-events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-400 text-white",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  ACKNOWLEDGED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  RESOLVED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

export default function RiskEventsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useRiskEvents({
    page,
    limit: 20,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });
  const { data: stats } = useRiskEventStats();
  const acknowledge = useAcknowledgeRiskEvent();
  const resolve = useResolveRiskEvent();

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge.mutateAsync(id);
      toast.success("Risk event acknowledged");
    } catch {
      toast.error("Failed to acknowledge");
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolve.mutateAsync(id);
      toast.success("Risk event resolved");
    } catch {
      toast.error("Failed to resolve");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Risk Events</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const events = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-red-500" />
          <h2 className="text-3xl font-bold tracking-tight">Risk Events</h2>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">
              Open
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.openCount ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-500">
              Acknowledged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.acknowledgedCount ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.resolvedCount ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val === "ALL" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={severityFilter}
          onValueChange={(val) => {
            setSeverityFilter(val === "ALL" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No risk events found</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event: any) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={severityColors[event.severity] || ""}>
                        {event.severity}
                      </Badge>
                      <Badge className={statusColors[event.status] || ""}>
                        {event.status}
                      </Badge>
                      <Badge variant="outline">{event.category}</Badge>
                    </div>
                    <p className="text-sm">{event.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                      {event.resolvedAt && (
                        <span>
                          {" "}
                          &middot; Resolved{" "}
                          {new Date(event.resolvedAt).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {event.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(event.id)}
                        disabled={acknowledge.isPending}
                      >
                        {acknowledge.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4 mr-1" />
                        )}
                        Acknowledge
                      </Button>
                    )}
                    {(event.status === "OPEN" ||
                      event.status === "ACKNOWLEDGED") && (
                      <Button
                        size="sm"
                        onClick={() => handleResolve(event.id)}
                        disabled={resolve.isPending}
                      >
                        {resolve.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        )}
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
