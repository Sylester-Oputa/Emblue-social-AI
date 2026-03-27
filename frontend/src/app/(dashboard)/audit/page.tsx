"use client";

import { useState } from "react";
import { useAgentRuns, useAgentRunStats } from "@/hooks/use-agent-runs";
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
import { Bot, Clock, CheckCircle, XCircle, Gauge } from "lucide-react";

const statusColors: Record<string, string> = {
  SUCCESS:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  TIMEOUT:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function AuditPage() {
  const [agentFilter, setAgentFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAgentRuns({
    page,
    limit: 20,
    agentName: agentFilter || undefined,
  });
  const { data: stats } = useAgentRunStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">AI Audit Log</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const runs = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-purple-500" />
        <h2 className="text-3xl font-bold tracking-tight">AI Audit Log</h2>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.successCount ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.failedCount ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-1">
                <Gauge className="h-4 w-4" />
                Avg Latency
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgLatencyMs
                ? `${(stats.avgLatencyMs / 1000).toFixed(1)}s`
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <Select
          value={agentFilter}
          onValueChange={(val) => {
            setAgentFilter(val === "ALL" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Agents</SelectItem>
            <SelectItem value="Agent_Reply_Assistant">
              Agent_Reply_Assistant
            </SelectItem>
            <SelectItem value="Agent_Listening">Agent_Listening</SelectItem>
            <SelectItem value="Agent_KPI_Analyst">Agent_KPI_Analyst</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Runs List */}
      <div className="space-y-3">
        {runs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No agent runs found</p>
            </CardContent>
          </Card>
        ) : (
          runs.map((run: any) => (
            <Card key={run.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {run.agentName}
                      </Badge>
                      <Badge className={statusColors[run.status] || ""}>
                        {run.status === "SUCCESS" && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {run.status === "FAILED" && (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {run.status}
                      </Badge>
                      {run.modelName && (
                        <Badge variant="secondary">{run.modelName}</Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {run.tokenCount && <span>Tokens: {run.tokenCount}</span>}
                      {run.latencyMs && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(run.latencyMs / 1000).toFixed(2)}s
                        </span>
                      )}
                      <span>{new Date(run.createdAt).toLocaleString()}</span>
                    </div>
                    {run.errorMessage && (
                      <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        {run.errorMessage}
                      </p>
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
