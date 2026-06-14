export interface PipelineStage {
  id: string
  agentId: string
  label: string
}

export interface DAGEdge {
  source: string
  target: string
}

export interface PipelineDefinition {
  id: string
  name: string
  stages: PipelineStage[]
  edges: DAGEdge[]
  createdAt: string
  updatedAt: string
}
