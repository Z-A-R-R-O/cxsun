import type { AgentDefinition, PipelineDefinition, RunRecord, CodeItSettings } from '../types.js'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    throw new Error(errorBody.error ?? `HTTP error ${res.status}: ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

export const client = {
  agents: {
    list: () => request<AgentDefinition[]>('/api/v1/agents'),
    get: (id: string) => request<AgentDefinition>(`/api/v1/agents/${id}`),
    update: (id: string, config: Partial<AgentDefinition['config']>) =>
      request<AgentDefinition>(`/api/v1/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      }),
  },
  pipelines: {
    list: () => request<PipelineDefinition[]>('/api/v1/pipelines'),
    get: (id: string) => request<PipelineDefinition>(`/api/v1/pipelines/${id}`),
    create: (pipeline: PipelineDefinition) =>
      request<{ success: boolean; pipeline: PipelineDefinition }>('/api/v1/pipelines', {
        method: 'POST',
        body: JSON.stringify(pipeline),
      }),
    update: (id: string, pipeline: PipelineDefinition) =>
      request<{ success: boolean; pipeline: PipelineDefinition }>(`/api/v1/pipelines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(pipeline),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/v1/pipelines/${id}`, {
        method: 'DELETE',
      }),
  },
  runs: {
    list: () => request<RunRecord[]>('/api/v1/runs'),
    get: (id: string) => request<RunRecord>(`/api/v1/runs/${id}`),
    create: (pipelineId: string, prompt: string) =>
      request<RunRecord>('/api/v1/runs', {
        method: 'POST',
        body: JSON.stringify({ pipelineId, prompt }),
      }),
    stream: (id: string, onEvent: (event: any) => void): () => void => {
      const eventSource = new EventSource(`/api/v1/runs/${id}/stream`)
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onEvent(data)
        } catch (err) {
          console.error('Failed to parse SSE event:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err)
        eventSource.close()
      }

      return () => {
        eventSource.close()
      }
    },
  },
  settings: {
    get: () => request<CodeItSettings>('/api/v1/settings'),
    update: (settings: Partial<CodeItSettings>) =>
      request<{ success: boolean }>('/api/v1/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
  },
}
