import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Workflow, Cpu, History, Settings } from 'lucide-react'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="logo-icon"
          style={{ marginRight: '2px' }}
        >
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="var(--border-glow)" fill="rgba(255, 255, 255, 0.03)" />
          <path d="M8 9l3 3-3 3" stroke="var(--accent-secondary)" />
          <line x1="13" y1="15" x2="16" y2="15" stroke="var(--text-primary)" />
        </svg>
        CodeIt Studio
      </div>
      <nav className="sidebar-menu">
        <NavLink
          to="/"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
        <NavLink
          to="/pipeline"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Workflow size={20} />
          Pipelines
        </NavLink>
        <NavLink
          to="/agents"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Cpu size={20} />
          Agent Config
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <History size={20} />
          Run History
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={20} />
          Settings
        </NavLink>
      </nav>
    </aside>
  )
}
