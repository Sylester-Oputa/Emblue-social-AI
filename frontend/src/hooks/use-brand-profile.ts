"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { BrandProfile } from "@/lib/types";
import { useCurrentWorkspaceId } from "./use-workspace";

export function useBrandProfile() {
  const workspaceId = useCurrentWorkspaceId();

  return useQuery<BrandProfile | null>({
    queryKey: ["brand-profile", workspaceId],
    queryFn: async () => {
      try {
        const res = await api.get(`/workspaces/${workspaceId}/brand-profile`);
        return res.data.data || res.data;
      } catch (err: any) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateBrandProfile() {
  const workspaceId = useCurrentWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      companyName?: string;
      tone?: string;
      prohibitedTerms?: string[];
      requiredPhrases?: string[];
      requiredDisclaimers?: string[];
    }) => {
      const res = await api.put(
        `/workspaces/${workspaceId}/brand-profile`,
        data,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
    },
  });
}
