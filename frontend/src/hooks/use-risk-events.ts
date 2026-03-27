"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { RiskEvent, PaginatedResponse } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

interface RiskEventsParams {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
}

export function useRiskEvents(params: RiskEventsParams = {}) {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<PaginatedResponse<RiskEvent>>({
    queryKey: ["risk-events", workspaceId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.status) searchParams.set("status", params.status);
      if (params.severity) searchParams.set("severity", params.severity);

      const res = await api.get(
        `/workspaces/${workspaceId}/risk-events?${searchParams}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useRiskEventStats() {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery({
    queryKey: ["risk-events-stats", workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/risk-events/stats`);
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useAcknowledgeRiskEvent() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await api.patch(
        `/workspaces/${workspaceId}/risk-events/${eventId}/acknowledge`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-events"] });
      queryClient.invalidateQueries({ queryKey: ["risk-events-stats"] });
    },
  });
}

export function useResolveRiskEvent() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await api.patch(
        `/workspaces/${workspaceId}/risk-events/${eventId}/resolve`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-events"] });
      queryClient.invalidateQueries({ queryKey: ["risk-events-stats"] });
    },
  });
}
