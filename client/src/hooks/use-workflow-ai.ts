import { useMutation } from '@tanstack/react-query';
import { Node, Edge } from 'reactflow';

interface GenerateWorkflowRequest {
  prompt: string;
}

interface GenerateWorkflowResponse {
  nodes: Node[];
  edges: Edge[];
}

export function useGenerateWorkflow() {
  return useMutation<GenerateWorkflowResponse, Error, GenerateWorkflowRequest>({
    mutationFn: async ({ prompt }) => {
      const response = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'fetch'
        },
        credentials: 'include',
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate workflow' }));
        throw new Error(error.error || 'Failed to generate workflow');
      }

      const data = await response.json();
      return data;
    },
  });
}
