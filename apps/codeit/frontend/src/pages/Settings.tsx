import { useState, useEffect } from 'react'
import { client } from '../api/client.js'
import { Check, Settings, Shield } from 'lucide-react'

export function SettingsPage() {
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [openrouterUrl, setOpenrouterUrl] = useState('')
  const [openrouterHasKey, setOpenrouterHasKey] = useState(false)

  const [openaiKey, setOpenkey] = useState('')
  const [openaiUrl, setOpenurl] = useState('')
  const [openaiHasKey, setOpenaiHasKey] = useState(false)

  const [deepseekKey, setDeepseekKey] = useState('')
  const [deepseekUrl, setDeepseekUrl] = useState('')
  const [deepseekHasKey, setDeepseekHasKey] = useState(false)

  const [opencodeKey, setOpencodeKey] = useState('')
  const [opencodeUrl, setOpencodeUrl] = useState('')
  const [opencodeHasKey, setOpencodeHasKey] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    client.settings.get().then(s => {
      setOpenrouterUrl(s.openrouter.baseUrl)
      setOpenrouterHasKey(s.openrouter.hasKey)

      setOpenurl(s.openai.baseUrl)
      setOpenaiHasKey(s.openai.hasKey)

      setDeepseekUrl(s.deepseek.baseUrl)
      setDeepseekHasKey(s.deepseek.hasKey)

      setOpencodeUrl(s.opencode.baseUrl)
      setOpencodeHasKey(s.opencode.hasKey)
    }).catch(err => console.error(err))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    const payload: any = {}
    if (openrouterKey || openrouterUrl) {
      payload.openrouter = {
        apiKey: openrouterKey || undefined,
        baseUrl: openrouterUrl || undefined,
      }
    }
    if (openaiKey || openaiUrl) {
      payload.openai = {
        apiKey: openaiKey || undefined,
        baseUrl: openaiUrl || undefined,
      }
    }
    if (deepseekKey || deepseekUrl) {
      payload.deepseek = {
        apiKey: deepseekKey || undefined,
        baseUrl: deepseekUrl || undefined,
      }
    }
    if (opencodeKey || opencodeUrl) {
      payload.opencode = {
        apiKey: opencodeKey || undefined,
        baseUrl: opencodeUrl || undefined,
      }
    }

    try {
      await client.settings.update(payload)
      setSuccessMsg('Settings updated successfully!')
      
      // Clear key input fields after save
      setOpenrouterKey('')
      setOpenkey('')
      setDeepseekKey('')
      setOpencodeKey('')

      // Refresh status
      const updated = await client.settings.get()
      setOpenrouterHasKey(updated.openrouter.hasKey)
      setOpenaiHasKey(updated.openai.hasKey)
      setDeepseekHasKey(updated.deepseek.hasKey)
      setOpencodeHasKey(updated.opencode.hasKey)

    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure base endpoints and API Keys for LLM engines.</p>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--accent-success)',
          color: '#6ee7b7',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--accent-danger)',
          color: '#fca5a5',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', borderBottom: '1px solid var(--border-muted)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} style={{ color: 'var(--accent-primary)' }} /> Provider Integrations
        </h2>

        {/* OpenRouter */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--accent-secondary)' }}>OpenRouter</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>API Key {openrouterHasKey && <span style={{ color: 'var(--accent-success)', fontSize: '0.75rem' }}>(Saved)</span>}</label>
              <input
                type="password"
                placeholder={openrouterHasKey ? '••••••••••••••••••••' : 'Enter OpenRouter API Key'}
                value={openrouterKey}
                onChange={e => setOpenrouterKey(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Base URL</label>
              <input
                type="text"
                value={openrouterUrl}
                onChange={e => setOpenrouterUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* OpenAI */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--accent-primary)' }}>OpenAI</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>API Key {openaiHasKey && <span style={{ color: 'var(--accent-success)', fontSize: '0.75rem' }}>(Saved)</span>}</label>
              <input
                type="password"
                placeholder={openaiHasKey ? '••••••••••••••••••••' : 'Enter OpenAI API Key'}
                value={openaiKey}
                onChange={e => setOpenkey(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Base URL</label>
              <input
                type="text"
                value={openaiUrl}
                onChange={e => setOpenurl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* DeepSeek */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--accent-success)' }}>DeepSeek</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>API Key {deepseekHasKey && <span style={{ color: 'var(--accent-success)', fontSize: '0.75rem' }}>(Saved)</span>}</label>
              <input
                type="password"
                placeholder={deepseekHasKey ? '••••••••••••••••••••' : 'Enter DeepSeek API Key'}
                value={deepseekKey}
                onChange={e => setDeepseekKey(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Base URL</label>
              <input
                type="text"
                value={deepseekUrl}
                onChange={e => setDeepseekUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* OpenCoder / OpenCode */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--accent-warning)' }}>OpenCode</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>API Key {opencodeHasKey && <span style={{ color: 'var(--accent-success)', fontSize: '0.75rem' }}>(Saved)</span>}</label>
              <input
                type="password"
                placeholder={opencodeHasKey ? '••••••••••••••••••••' : 'Enter OpenCode API Key'}
                value={opencodeKey}
                onChange={e => setOpencodeKey(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Base URL</label>
              <input
                type="text"
                value={opencodeUrl}
                onChange={e => setOpencodeUrl(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', alignSelf: 'flex-end' }} disabled={isSaving}>
          <Settings size={18} /> {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
