"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useCurrentWorkspaceId } from "./use-workspace";

export function useAutomationStatus() {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<{
    automationEnabled: boolean;
    pausedBy: string | null;
    pausedAt: string | null;
    pauseReason: string | null;
  }>({
    queryKey: ["automation-status", workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/automation/status`);
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
}

export function usePauseAutomation() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason?: string) => {
      const res = await api.post(
        `/workspaces/${workspaceId}/automation/pause`,
        { reason },
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-status"] });
    },
  });
}

export function useResumeAutomation() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await api.post(
        `/workspaces/${workspaceId}/automation/resume`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-status"] });
    },
  });
}
