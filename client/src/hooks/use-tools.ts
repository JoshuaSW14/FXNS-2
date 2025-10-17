import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Node, Edge } from "reactflow";
import { useAuth } from "@/hooks/use-auth";

export interface Tool {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string;
  slug: string;
  category: string;
  inputSchema: unknown;
  outputSchema: unknown;
  codeKind: string;
  codeRef: string;
  builderConfig: unknown;
  isPublic: boolean;
  createdBy: string | null;
  accessTier: string;
  moderationStatus: string;
  moderatedBy: string | null;
  moderatedAt: Date | null;
  moderationNotes: string | null;
  flaggedReasons: unknown;
}

export function useTools(params?: {
  search?: string;
  category?: string;
  isPublic?: boolean;
}) {
  return useQuery<Tool[]>({
    queryKey: ["/api/workflows", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.category) searchParams.set("category", params.category);
      if (params?.isPublic !== undefined)
        searchParams.set("isPublic", String(params.isPublic));

      const url = `/api/workflows${searchParams.toString() ? `?${searchParams}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch workflows");
      }

      return response.json();
    },
  });
}

export function useMyTools() {
    const { user } = useAuth();
    return useQuery<{ tools: (Tool & { runCount: number })[] }>({
            queryKey: ["/api/tools/me"],
            queryFn: async () => {
                const res = await fetch("/api/tools/me", { credentials: "include", headers: { 'X-Requested-With': 'fetch' } });
                if (!res.ok) throw new Error("Failed to fetch my tools");
                return res.json();
            },
            enabled: !!user,
        });
}

export function useTool(id: string | undefined) {
  return useQuery<Tool>({
    queryKey: [`/api/tools/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/tools/${id}`, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tool");
      }

      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateTool() {
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      category?: string;
      triggerType?: "manual" | "schedule" | "webhook" | "event";
      nodes?: Node[];
      edges?: Edge[];
    }) => {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create tool");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
    },
  });
}

export function useUpdateTool() {
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      category,
      isActive,
      triggerType,
      triggerConfig,
      nodes,
      edges,
    }: {
      id: string;
      name?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
      triggerType?: "manual" | "schedule" | "webhook" | "event";
      triggerConfig?: any;
      nodes?: Node[];
      edges?: Edge[];
    }) => {
      const response = await fetch(`/api/tools/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          description,
          category,
          isActive,
          triggerType,
          triggerConfig,
          nodes,
          edges,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tool");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tools/${variables.id}`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
    },
  });
}

export function useDeleteTool() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tools/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });

      if (!response.ok) {
        throw new Error("Failed to delete tool");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
    },
  });
}

export function useCloneTool() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tools/${id}/clone`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });

      if (!response.ok) {
        throw new Error("Failed to clone tool");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
    },
  });
}

export function useExecuteTool() {
  return useMutation({
    mutationFn: async ({
      id,
      triggerData,
    }: {
      id: string;
      triggerData?: any;
    }) => {
      const response = await fetch(`/api/tools/${id}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "fetch",
        },
        credentials: "include",
        body: JSON.stringify({ triggerData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to execute tool");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tools/${variables.id}/executions`],
      });
    },
  });
}
