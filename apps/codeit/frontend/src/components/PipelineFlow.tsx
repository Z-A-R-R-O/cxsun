import type { PipelineStage, DAGEdge, RunRecord } from '../types.js'

interface PipelineFlowProps {
  stages: PipelineStage[]
  edges: DAGEdge[]
  activeStageId?: string
  stageResults?: RunRecord['stageResults']
}

export function PipelineFlow({ stages, edges, activeStageId, stageResults }: PipelineFlowProps) {
  const adj = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  
  stages.forEach(s => {
    adj.set(s.id, [])
    inDegree.set(s.id, 0)
  })

  edges.forEach(e => {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  })

  const layers: string[][] = []
  const currentNodes = stages.filter(s => inDegree.get(s.id) === 0).map(s => s.id)
  
  if (currentNodes.length > 0) {
    layers.push(currentNodes)
  }

  const visited = new Set<string>(currentNodes)
  let nextQueue = [...currentNodes]

  while (nextQueue.length > 0) {
    const nextLayer: string[] = []
    const tempQueue: string[] = []

    for (const node of nextQueue) {
      const neighbors = adj.get(node) ?? []
      for (const next of neighbors) {
        if (!visited.has(next)) {
          visited.add(next)
          nextLayer.push(next)
          tempQueue.push(next)
        }
      }
    }
    if (nextLayer.length > 0) {
      layers.push(nextLayer)
    }
    nextQueue = tempQueue
  }

  stages.forEach(s => {
    if (!visited.has(s.id)) {
      if (layers.length === 0) layers.push([])
      layers[0].push(s.id)
    }
  })

  const coords = new Map<string, { x: number; y: number }>()
  const width = 850
  const height = 300
  
  layers.forEach((layer, layerIdx) => {
    const x = 40 + layerIdx * 200
    const count = layer.length
    layer.forEach((nodeId, idx) => {
      const y = (height / 2) - ((count - 1) * 50) + (idx * 100) - 20
      coords.set(nodeId, { x, y })
    })
  })

  return (
    <div className="flow-svg-container">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.3)" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-primary)" />
          </marker>
        </defs>

        {edges.map((edge, idx) => {
          const from = coords.get(edge.source)
          const to = coords.get(edge.target)
          if (!from || !to) return null
          
          const isEdgeActive = activeStageId === edge.source
          const dx = to.x - from.x
          const xMid = from.x + dx / 2
          const pathD = `M ${from.x + 140} ${from.y + 20} C ${xMid} ${from.y + 20}, ${xMid} ${to.y + 20}, ${to.x} ${to.y + 20}`

          return (
            <path
              key={idx}
              d={pathD}
              className={`edge ${isEdgeActive ? 'active' : ''}`}
              markerEnd={isEdgeActive ? "url(#arrow-active)" : "url(#arrow)"}
            />
          )
        })}

        {stages.map((stage) => {
          const coord = coords.get(stage.id)
          if (!coord) return null
          
          const result = stageResults?.find(r => r.stageId === stage.id)
          const status = result?.status ?? 'pending'
          const isActive = activeStageId === stage.id || status === 'running'
          
          let stateClass = ''
          if (isActive) stateClass = 'active'
          else if (status === 'completed') stateClass = 'completed'
          else if (status === 'failed') stateClass = 'failed'

          return (
            <g key={stage.id} transform={`translate(${coord.x}, ${coord.y})`} className={`node ${stateClass}`}>
              <rect width="140" height="40" rx="8" />
              <text x="70" y="24" textAnchor="middle">{stage.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
