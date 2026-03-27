"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { AnalyticsSummary } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

export function useAnalytics() {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<AnalyticsSummary>({
    queryKey: ["analytics", workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/analytics/summary`);
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}
