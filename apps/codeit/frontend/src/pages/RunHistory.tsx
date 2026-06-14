import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { client } from '../api/client.js'
import type { RunRecord, PipelineDefinition } from '../types.js'
import { PipelineFlow } from '../components/PipelineFlow.js'
import { TerminalOutput } from '../components/TerminalOutput.js'
import { StatusBadge } from '../components/StatusBadge.js'
import { History, Terminal, ChevronDown, ChevronUp, Search } from 'lucide-react'

export function RunHistory() {
  const [searchParams, setSearchParams] = useSearchParams()
  const runIdParam = searchParams.get('runId')

  const [runs, setRuns] = useState<RunRecord[]>([])
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([])
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null)
  
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [activeStageId, setActiveStageId] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})

  const sseCleanupRef = useRef<(() => void) | null>(null)

  // Fetch runs and pipelines
  const fetchAll = () => {
    Promise.all([
      client.runs.list(),
      client.pipelines.list()
    ]).then(([runsData, pipelinesData]) => {
      setRuns(runsData)
      setPipelines(pipelinesData)
      
      // Select run if param is present
      if (runIdParam) {
        const found = runsData.find(r => r.id === runIdParam)
        if (found) {
          handleSelectRun(found, pipelinesData)
        }
      } else if (runsData.length > 0 && !selectedRun) {
        handleSelectRun(runsData[0], pipelinesData)
      }
    }).catch(err => console.error(err))
  }

  useEffect(() => {
    fetchAll()
    return () => {
      if (sseCleanupRef.current) sseCleanupRef.current()
    }
  }, [runIdParam])

  // Process selected run
  const handleSelectRun = async (run: RunRecord, currentPipelines = pipelines) => {
    if (sseCleanupRef.current) {
      sseCleanupRef.current()
      sseCleanupRef.current = null
    }

    setSearchParams({ runId: run.id })
    setActiveStageId(undefined)
    setExpandedStages({})

    try {
      const fullRun = await client.runs.get(run.id)
      setSelectedRun(fullRun)

      // Construct initial terminal logs based on stage results
      const logs: string[] = [`[System] Loaded execution logs for Run: ${fullRun.id}`]
      fullRun.stageResults.forEach(res => {
        const pipeline = currentPipelines.find(p => p.id === fullRun.pipelineId)
        const stageLabel = pipeline?.stages.find(s => s.id === res.stageId)?.label ?? res.stageId

        if (res.status === 'completed' || res.status === 'failed') {
          logs.push(`[System] Stage ${stageLabel} started.`)
          if (res.output) {
            logs.push(res.output)
          }
          logs.push(`[System] Stage ${stageLabel} ${res.status}. Tokens used: ${res.tokensUsed ?? 0}`)
        }
      })

      if (fullRun.status === 'completed') {
        logs.push(`[System] Run completed successfully. Total tokens: ${fullRun.tokensUsed}`)
      } else if (fullRun.status === 'failed') {
        logs.push(`[System] Run failed. Error: ${fullRun.error ?? 'Unknown error'}`)
      }

      setTerminalLines(logs)

      // If run is running or pending, subscribe to live stream
      if (fullRun.status === 'running' || fullRun.status === 'pending') {
        const pipeline = currentPipelines.find(p => p.id === fullRun.pipelineId)
        
        const cleanup = client.runs.stream(fullRun.id, (event) => {
          setSelectedRun(prev => {
            if (!prev) return null
            const updated = { ...prev }
            
            if (event.type === 'run_started') {
              updated.status = 'running'
              setTerminalLines(t => [...t, `[System] Run execution started...`])
            }
            else if (event.type === 'stage_started') {
              const stageRes = updated.stageResults.find(r => r.stageId === event.stageId)
              if (stageRes) {
                stageRes.status = 'running'
                stageRes.startedAt = new Date().toISOString()
              }
              setActiveStageId(event.stageId)
              const stageLabel = pipeline?.stages.find(s => s.id === event.stageId)?.label ?? event.stageId
              setTerminalLines(t => [...t, `[System] Starting stage: ${stageLabel}`, ''])
            }
            else if (event.type === 'stage_chunk') {
              const stageRes = updated.stageResults.find(r => r.stageId === event.stageId)
              if (stageRes) {
                stageRes.output = (stageRes.output ?? '') + event.chunk
              }
              setTerminalLines(t => {
                const next = [...t]
                if (next.length > 0) {
                  next[next.length - 1] += event.chunk
                }
                return next
              })
            }
            else if (event.type === 'stage_completed') {
              const stageRes = updated.stageResults.find(r => r.stageId === event.stageId)
              if (stageRes) {
                stageRes.status = 'completed'
                stageRes.output = event.output
                stageRes.tokensUsed = event.tokensUsed
                stageRes.completedAt = new Date().toISOString()
              }
              setActiveStageId(undefined)
              setTerminalLines(t => [...t, `[System] Stage completed. Tokens used: ${event.tokensUsed}`])
              updated.tokensUsed += (event.tokensUsed ?? 0)
            }
            else if (event.type === 'stage_failed') {
              const stageRes = updated.stageResults.find(r => r.stageId === event.stageId)
              if (stageRes) {
                stageRes.status = 'failed'
                stageRes.error = event.error
                stageRes.completedAt = new Date().toISOString()
              }
              setActiveStageId(undefined)
              setTerminalLines(t => [...t, `[System] Stage failed! Error: ${event.error}`])
            }
            else if (event.type === 'run_finished') {
              updated.status = 'completed'
              updated.completedAt = new Date().toISOString()
              setTerminalLines(t => [...t, `[System] Run completed successfully. Total tokens: ${event.tokensUsed}`])
              fetchAll() // refresh list
            }
            else if (event.type === 'run_failed') {
              updated.status = 'failed'
              updated.error = event.error
              updated.completedAt = new Date().toISOString()
              setTerminalLines(t => [...t, `[System] Run failed! Error: ${event.error}`])
              fetchAll() // refresh list
            }

            return updated
          })
        })
        sseCleanupRef.current = cleanup
      }

    } catch (err) {
      console.error(err)
    }
  }

  const toggleStageExpand = (stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }))
  }

  const filteredRuns = runs.filter(run => {
    const pipelineName = pipelines.find(p => p.id === run.pipelineId)?.name ?? ''
    return (
      run.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pipelineName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const selectedPipelineDef = pipelines.find(p => p.id === selectedRun?.pipelineId)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Run History</h1>
          <p className="page-subtitle">Inspect historical runs, view real-time streaming traces, and analyze inputs/outputs.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2.5rem', alignItems: 'flex-start' }}>
        {/* Left Sidebar: Runs list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search runs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '0.85rem', color: 'var(--text-muted)' }} />
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxHeight: '650px',
            overflowY: 'auto',
            paddingRight: '0.25rem'
          }}>
            {filteredRuns.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No runs found.
              </div>
            ) : (
              filteredRuns.map(run => {
                const isSelected = selectedRun?.id === run.id
                const pipelineName = pipelines.find(p => p.id === run.pipelineId)?.name ?? run.pipelineId
                return (
                  <div
                    key={run.id}
                    onClick={() => handleSelectRun(run)}
                    style={{
                      padding: '1rem',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-muted)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {run.prompt}
                      </span>
                      <StatusBadge status={run.status} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {pipelineName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>
                      {new Date(run.createdAt).toLocaleString()}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Main Panel: Run Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {selectedRun ? (
            <>
              {/* Top overview card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-muted)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>RUN DETAILS</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0.2rem 0' }}>{selectedRun.prompt}</h2>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      <span>Run ID: <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedRun.id}</strong></span>
                      <span>•</span>
                      <span>Tokens: <strong>{selectedRun.tokensUsed.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Created: <strong>{new Date(selectedRun.createdAt).toLocaleString()}</strong></span>
                    </div>
                  </div>
                  <StatusBadge status={selectedRun.status} />
                </div>

                {/* Pipeline Flow graph visualizer */}
                {selectedPipelineDef && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem' }}>Active Execution Path</h3>
                    <PipelineFlow
                      stages={selectedPipelineDef.stages}
                      edges={selectedPipelineDef.edges}
                      activeStageId={activeStageId}
                      stageResults={selectedRun.stageResults}
                    />
                  </div>
                )}
              </div>

              {/* Streaming Output / Terminal Log */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={18} style={{ color: 'var(--accent-success)' }} /> Live Trace Output
                </h3>
                <TerminalOutput lines={terminalLines} isLoading={selectedRun.status === 'running' || selectedRun.status === 'pending'} />
              </div>

              {/* Accordion List of stage results */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem' }}>Stage Output Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedRun.stageResults.map((res, idx) => {
                    const isExpanded = !!expandedStages[res.stageId]
                    const pipeline = pipelines.find(p => p.id === selectedRun.pipelineId)
                    const stageLabel = pipeline?.stages.find(s => s.id === res.stageId)?.label ?? res.stageId

                    return (
                      <div
                        key={res.stageId}
                        style={{
                          border: '1px solid var(--border-muted)',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.01)',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => toggleStageExpand(res.stageId)}
                          style={{
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: 'rgba(255, 255, 255, 0.02)',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                              STAGE {idx + 1}
                            </span>
                            <span style={{ fontWeight: '700' }}>{stageLabel}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {res.tokensUsed ? `${res.tokensUsed} tokens` : ''}
                            </span>
                            <StatusBadge status={res.status} />
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>

                        {/* Accordion Body */}
                        {isExpanded && (
                          <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-muted)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {res.input && (
                              <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>INPUT CONTEXT</h4>
                                <pre style={{
                                  background: '#040406',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.8rem',
                                  overflowX: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  color: '#cbd5e1'
                                }}>
                                  {res.input}
                                </pre>
                              </div>
                            )}

                            {res.output && (
                              <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-secondary)', marginBottom: '0.5rem' }}>OUTPUT GENERATED</h4>
                                <pre style={{
                                  background: '#040406',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.8rem',
                                  overflowX: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  color: '#34d399'
                                }}>
                                  {res.output}
                                </pre>
                              </div>
                            )}

                            {res.error && (
                              <div>
                                <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-danger)', marginBottom: '0.5rem' }}>STAGE ERROR</h4>
                                <pre style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid var(--accent-danger)',
                                  padding: '0.75rem',
                                  borderRadius: '8px',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.8rem',
                                  color: '#fca5a5',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {res.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 0' }}>
              <History size={48} style={{ color: 'var(--text-dark)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Select a run to view execution traces.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
