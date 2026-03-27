"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Integration } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

export function useIntegrations() {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<Integration[]>({
    queryKey: ["integrations", workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/integrations`);
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useConnectIntegration() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      platform: string;
      accountId: string;
      accountName: string;
      scopes: string[];
      accessToken: string;
      refreshToken: string;
    }) => {
      const res = await api.post(
        `/workspaces/${workspaceId}/integrations`,
        data,
      );
      return res.data.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

export function useDisconnectIntegration() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${workspaceId}/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}
