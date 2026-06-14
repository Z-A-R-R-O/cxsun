import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { client } from '../api/client.js'
import type { RunRecord, AgentDefinition, PipelineDefinition } from '../types.js'
import { Play, CheckCircle, XCircle, Zap, Cpu } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge.js'

export function Dashboard() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([])
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      client.runs.list(),
      client.pipelines.list(),
      client.agents.list()
    ]).then(([runsData, pipelinesData, agentsData]) => {
      setRuns(runsData)
      setPipelines(pipelinesData)
      setAgents(agentsData)
      if (pipelinesData.length > 0) {
        setSelectedPipeline(pipelinesData[0].id)
      }
    }).catch(err => {
      console.error('Failed to load dashboard data:', err)
      setError('Could not connect to backend. Make sure the server is running on port 7810.')
    })
  }, [])

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsSubmitting(true)
    setError('')
    try {
      const run = await client.runs.create(selectedPipeline, prompt)
      navigate(`/history?runId=${run.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to start run')
      setIsSubmitting(false)
    }
  }

  // Calculate metrics
  const totalRuns = runs.length
  const completedRuns = runs.filter(r => r.status === 'completed').length
  const failedRuns = runs.filter(r => r.status === 'failed').length
  const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0
  const totalTokens = runs.reduce((acc, r) => acc + r.tokensUsed, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Monitor agent pipelines and trigger new automated runs.</p>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--accent-danger)',
          color: '#fca5a5',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={16} /> Total Runs
          </div>
          <div className="stat-value">{totalRuns}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-success)' }}>
            <CheckCircle size={16} /> Success Rate
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-success)' }}>{successRate}%</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
            <XCircle size={16} /> Failed Runs
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-danger)' }}>{failedRuns}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
            <Zap size={16} /> Total Tokens
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>{totalTokens.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Trigger Run Form */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Play size={20} className="text-primary" /> Start New Run
          </h2>
          <form onSubmit={handleStartRun}>
            <div className="form-group">
              <label>Select Pipeline</label>
              <select
                value={selectedPipeline}
                onChange={e => setSelectedPipeline(e.target.value)}
                disabled={pipelines.length === 0}
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Prompt / Project Description</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what you want the agent chain to build..."
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isSubmitting || pipelines.length === 0}>
              <Play size={18} /> {isSubmitting ? 'Starting...' : 'Trigger Agent Chain'}
            </button>
          </form>
        </div>

        {/* Recent Runs */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Recent Runs</h2>
          {runs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
              No runs triggered yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {runs.slice(0, 5).map(run => {
                const pipelineName = pipelines.find(p => p.id === run.pipelineId)?.name ?? run.pipelineId
                return (
                  <div
                    key={run.id}
                    onClick={() => navigate(`/history?runId=${run.id}`)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-muted)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-glow)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-muted)'}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden', marginRight: '1rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.95rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {run.prompt}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {pipelineName} • {new Date(run.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
