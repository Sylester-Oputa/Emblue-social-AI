"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Shortlink, PaginatedResponse } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

interface ShortlinksParams {
  page?: number;
  limit?: number;
}

export function useShortlinks(params: ShortlinksParams = {}) {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<PaginatedResponse<Shortlink>>({
    queryKey: ["shortlinks", workspaceId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));

      const res = await api.get(
        `/workspaces/${workspaceId}/shortlinks?${searchParams}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateShortlink() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      destinationUrl: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
    }) => {
      const res = await api.post(`/workspaces/${workspaceId}/shortlinks`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlinks"] });
    },
  });
}

export function useDeleteShortlink() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workspaces/${workspaceId}/shortlinks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shortlinks"] });
    },
  });
}
