import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Node, Edge } from 'reactflow';

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  category?: string | null;
  isActive: boolean;
  isPublic: boolean;
  isTemplate: boolean;
  triggerType: 'manual' | 'schedule' | 'webhook' | 'event';
  triggerConfig: any;
  canvasData?: any;
  executionCount?: number;
  lastExecutedAt?: string | null;
  nodes: Node[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}

export function useWorkflows(params?: { search?: string; category?: string; isPublic?: boolean; isTemplate?: boolean }) {
  return useQuery<Workflow[]>({
    queryKey: ['/api/workflows', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.isPublic !== undefined) searchParams.set('isPublic', String(params.isPublic));
      if (params?.isTemplate !== undefined) searchParams.set('isTemplate', String(params.isTemplate));

      const url = `/api/workflows${searchParams.toString() ? `?${searchParams}` : ''}`;
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }

      return response.json();
    },
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery<Workflow>({
    queryKey: [`/api/workflows/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/workflows/${id}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workflow');
      }

      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  return useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string;
      category?: string;
      triggerType?: 'manual' | 'schedule' | 'webhook' | 'event';
      nodes?: Node[];
      edges?: Edge[];
    }) => {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create workflow');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    },
  });
}

export function useUpdateWorkflow() {
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
      edges 
    }: { 
      id: string; 
      name?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
      triggerType?: 'manual' | 'schedule' | 'webhook' | 'event';
      triggerConfig?: any;
      nodes?: Node[]; 
      edges?: Edge[];
    }) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'include',
        body: JSON.stringify({ 
          name,
          description,
          category,
          isActive,
          triggerType,
          triggerConfig,
          nodes, 
          edges 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/workflows/${variables.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    },
  });
}

export function useDeleteWorkflow() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' },
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    },
  });
}

export function useCloneWorkflow() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/workflows/${id}/clone`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' },
      });

      if (!response.ok) {
        throw new Error('Failed to clone workflow');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    },
  });
}

export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: async ({ id, triggerData }: { id: string; triggerData?: any }) => {
      const response = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
        credentials: 'include',
        body: JSON.stringify({ triggerData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to execute workflow');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/workflows/${variables.id}/executions`] });
    },
  });
}
