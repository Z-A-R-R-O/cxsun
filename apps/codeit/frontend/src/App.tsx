import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar.js'
import { Dashboard } from './pages/Dashboard.js'
import { Pipeline } from './pages/Pipeline.js'
import { AgentConfig } from './pages/AgentConfig.js'
import { RunHistory } from './pages/RunHistory.js'
import { SettingsPage } from './pages/Settings.js'

export function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/agents" element={<AgentConfig />} />
            <Route path="/history" element={<RunHistory />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
