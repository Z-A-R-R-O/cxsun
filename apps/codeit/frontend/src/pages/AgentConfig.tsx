import { useState, useEffect } from 'react'
import { client } from '../api/client.js'
import type { AgentDefinition } from '../types.js'
import { AgentCard } from '../components/AgentCard.js'
import { X, Check } from 'lucide-react'

export function AgentConfig() {
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [editingAgent, setEditingAgent] = useState<AgentDefinition | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [temperature, setTemperature] = useState(0.4)
  const [tokenBudget, setTokenBudget] = useState(4000)
  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    client.agents.list().then(setAgents).catch(err => console.error(err))
  }, [])

  const handleEditClick = (agent: AgentDefinition) => {
    setEditingAgent(agent)
    setSystemPrompt(agent.config.systemPrompt)
    setProvider(agent.config.provider)
    setModel(agent.config.model)
    setTemperature(agent.config.temperature)
    setTokenBudget(agent.config.tokenBudget)
    setSuccessMsg('')
    setErrorMsg('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAgent) return

    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const updated = await client.agents.update(editingAgent.id, {
        systemPrompt,
        provider,
        model,
        temperature,
        tokenBudget,
      })
      setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
      setSuccessMsg(`Successfully configured ${editingAgent.name}!`)
      setTimeout(() => {
        setEditingAgent(null)
      }, 1000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update agent')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Configuration</h1>
          <p className="page-subtitle">Inspect and customize system prompts, LLM routes, budgets, and temperatures per agent.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onEdit={handleEditClick} />
        ))}
      </div>

      {/* Elegant Configuration Modal */}
      {editingAgent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
            <button
              onClick={() => setEditingAgent(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>Configure: {editingAgent.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{editingAgent.description}</p>

            {successMsg && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--accent-success)',
                color: '#6ee7b7',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem'
              }}>
                <Check size={16} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--accent-danger)',
                color: '#fca5a5',
                padding: '0.75rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  style={{ minHeight: '140px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>LLM Provider</label>
                  <select value={provider} onChange={e => setProvider(e.target.value)}>
                    <option value="openrouter">OpenRouter</option>
                    <option value="openai">Direct OpenAI</option>
                    <option value="deepseek">DeepSeek API</option>
                    <option value="opencode">OpenCode AI</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Model Name</label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Temperature ({temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={e => setTemperature(parseFloat(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label>Token Budget</label>
                  <input
                    type="number"
                    value={tokenBudget}
                    onChange={e => setTokenBudget(parseInt(e.target.value, 10))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingAgent(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
