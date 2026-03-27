"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AgentRun, AgentRunStats, PaginatedResponse } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

interface AgentRunsParams {
  page?: number;
  limit?: number;
  agentName?: string;
}

export function useAgentRuns(params: AgentRunsParams = {}) {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<PaginatedResponse<AgentRun>>({
    queryKey: ["agent-runs", workspaceId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.agentName) searchParams.set("agentName", params.agentName);

      const res = await api.get(
        `/workspaces/${workspaceId}/agent-runs?${searchParams}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useAgentRunStats() {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<AgentRunStats>({
    queryKey: ["agent-runs-stats", workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/agent-runs/stats`);
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}
