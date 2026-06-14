import type { AgentDefinition } from '../types.js'
import { Cpu, Terminal, Compass, ShieldAlert, Award, FileCode } from 'lucide-react'

const icons: Record<string, any> = {
  orchestrator: Compass,
  implementation: FileCode,
  'test-gen': Terminal,
  review: Cpu,
  security: ShieldAlert,
  acceptance: Award,
}

interface AgentCardProps {
  agent: AgentDefinition
  onEdit: (agent: AgentDefinition) => void
}

export function AgentCard({ agent, onEdit }: AgentCardProps) {
  const Icon = icons[agent.id] || Cpu

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          background: 'rgba(99, 102, 241, 0.1)',
          padding: '0.75rem',
          borderRadius: '12px',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{agent.name}</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>{agent.role}</span>
        </div>
      </div>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', flexGrow: 1 }}>
        {agent.description}
      </p>

      <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Provider:</span>
          <span style={{ fontWeight: '500' }}>{agent.config.provider}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Model:</span>
          <span style={{ fontWeight: '500', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{agent.config.model}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Budget:</span>
          <span style={{ fontWeight: '500' }}>{agent.config.tokenBudget} tokens</span>
        </div>
      </div>

      <button className="btn btn-secondary" style={{ width: '100%', padding: '0.6rem' }} onClick={() => onEdit(agent)}>
        Configure Agent
      </button>
    </div>
  )
}
