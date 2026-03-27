"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Signal } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

interface SignalsParams {
  page?: number;
  limit?: number;
  status?: string;
  platform?: string;
  search?: string;
}

export function useSignals(params: SignalsParams = {}) {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery({
    queryKey: ["signals", workspaceId, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.status) searchParams.set("status", params.status);
      if (params.platform) searchParams.set("platform", params.platform);
      if (params.search) searchParams.set("search", params.search);

      const res = await api.get(
        `/workspaces/${workspaceId}/signals?${searchParams}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!workspaceId,
  });
}

export function useSignal(signalId: string) {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<Signal>({
    queryKey: ["signal", workspaceId, signalId],
    queryFn: async () => {
      const res = await api.get(
        `/workspaces/${workspaceId}/signals/${signalId}`,
      );
      return res.data.data || res.data;
    },
    enabled: !!workspaceId && !!signalId,
  });
}
