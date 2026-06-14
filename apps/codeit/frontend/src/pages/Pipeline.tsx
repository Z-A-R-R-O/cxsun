import { useState, useEffect } from 'react'
import { client } from '../api/client.js'
import type { PipelineDefinition, AgentDefinition } from '../types.js'
import { PipelineFlow } from '../components/PipelineFlow.js'
import { Cpu, Workflow } from 'lucide-react'

export function Pipeline() {
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([])
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      client.pipelines.list(),
      client.agents.list()
    ]).then(([pipelinesData, agentsData]) => {
      setPipelines(pipelinesData)
      setAgents(agentsData)
      if (pipelinesData.length > 0) {
        setSelectedPipeline(pipelinesData[0])
      }
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setError('Failed to fetch pipelines and agents configurations.')
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading pipelines...</div>
  if (error) return <div style={{ padding: '3rem', color: 'var(--accent-danger)' }}>{error}</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipelines</h1>
          <p className="page-subtitle">Inspect the Directed Acyclic Graph (DAG) structures connecting agent stages.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {selectedPipeline && (
          <>
            {/* Visual DAG Flow Chart */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Workflow size={20} style={{ color: 'var(--accent-primary)' }} /> Visual Flow: {selectedPipeline.name}
                </h2>
              </div>
              <PipelineFlow stages={selectedPipeline.stages} edges={selectedPipeline.edges} />
            </div>

            {/* Stages Details */}
            <div className="card">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Pipeline Stages Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                {selectedPipeline.stages.map((stage, idx) => {
                  const agent = agents.find(a => a.id === stage.agentId)
                  return (
                    <div
                      key={stage.id}
                      style={{
                        padding: '1.25rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-muted)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          STAGE {idx + 1}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--accent-primary)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontWeight: '600'
                        }}>
                          {stage.id}
                        </span>
                      </div>
                      <h4 style={{ fontWeight: '700', fontSize: '1.1rem', marginTop: '0.25rem' }}>{stage.label}</h4>
                      
                      {agent && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-muted)', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                          <Cpu size={14} style={{ color: 'var(--accent-secondary)' }} />
                          <span style={{ color: 'var(--text-muted)' }}>Agent:</span>
                          <span style={{ fontWeight: '600' }}>{agent.name}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
