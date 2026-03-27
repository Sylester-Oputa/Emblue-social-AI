"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Response } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

export function useResponses(signalId?: string) {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<Response[]>({
    queryKey: ["responses", workspaceId, signalId],
    queryFn: async () => {
      const params = signalId ? `?signalId=${signalId}` : "";
      const res = await api.get(
        `/workspaces/${workspaceId}/responses${params}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useEscalatedResponses(options?: {
  page?: number;
  limit?: number;
}) {
  const workspaceId = useCurrentWorkspaceId();
  const { page = 1, limit = 20 } = options || {};

  return useQuery<any>({
    queryKey: ["responses", "escalated", workspaceId, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await api.get(
        `/workspaces/${workspaceId}/responses/escalated?${params}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useGenerateResponse() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signalId: string) => {
      const res = await api.post(
        `/workspaces/${workspaceId}/responses/generate/${signalId}`,
      );
      return res.data.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useOverrideResponse() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      action,
      reason,
    }: {
      responseId: string;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const res = await api.post(
        `/workspaces/${workspaceId}/responses/${responseId}/override`,
        { action, reason },
      );
      return res.data.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
