"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Campaign } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

export function useCampaigns() {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<Campaign[]>({
    queryKey: ["campaigns", workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/campaigns`);
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useCampaign(id: string) {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<Campaign>({
    queryKey: ["campaign", workspaceId, id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/campaigns/${id}`);
      return res.data.data || res.data;
    },
    enabled: !!workspaceId && !!id,
  });
}

export function useCreateCampaign() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      startDate: string;
      endDate?: string;
    }) => {
      const res = await api.post(`/workspaces/${workspaceId}/campaigns`, data);
      return res.data.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      status?: string;
    }) => {
      const res = await api.patch(
        `/workspaces/${workspaceId}/campaigns/${id}`,
        data,
      );
      return res.data.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${workspaceId}/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
