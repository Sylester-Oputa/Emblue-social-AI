"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Workspace } from "@/lib/types";

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get("/workspaces");
      return res.data.data || res.data;
    },
  });
}

export function useCurrentWorkspaceId(): string | null {
  const { data } = useWorkspaces();
  return data?.[0]?.id ?? null;
}
