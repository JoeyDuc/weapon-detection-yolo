import {
  Activity,
  ArrowUpRight,
  AudioLines,
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Command,
  Image,
  LayoutDashboard,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  Settings,
  Sun,
  Video,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { getHealth, getModel } from '../../services/api'
import { usePreferences } from '../../stores/preferences'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
const nav = [
  { to: '/', name: 'Overview', icon: LayoutDashboard },
  { to: '/live', name: 'Live Detection', icon: Video },
  { to: '/video', name: 'Video Analysis', icon: AudioLines },
  { to: '/image', name: 'Image Analysis', icon: Image },
  { to: '/history', name: 'Detection History', icon: Activity },
  { to: '/analytics', name: 'Analytics', icon: BarChart3 },
]
export function Logo() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="currentColor" />
      <path d="M8 20c6-11 18-11 24 0-6 11-18 11-24 0Z" stroke="white" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="4.5" fill="white" />
    </svg>
  )
}
export function Layout() {
  const [mobile, setMobile] = useState(false),
    [help, setHelp] = useState(false)
  const { collapsed, toggleSidebar, theme, setTheme } = usePreferences()
  const location = useLocation()
  const model = useQuery({ queryKey: ['model'], queryFn: getModel, refetchInterval: 30000 })
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, refetchInterval: 30000 })
  const title =
    [...nav, { to: '/settings', name: 'Settings' }].find((n) => n.to === location.pathname)?.name ||
    'Workspace'
  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && <div className="mobile-scrim" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <NavLink to="/" className="brand" onClick={() => setMobile(false)}>
          <Logo />
          <span>
            Aegis<span className="brand-light"> Vision</span>
            <small>VISUAL INTELLIGENCE</small>
          </span>
        </NavLink>
        <Button
          className="mobile-close"
          size="icon"
          variant="ghost"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        >
          <X size={20} />
        </Button>
        <div className="workspace-select">
          <span className="workspace-avatar">A</span>
          <div>
            <strong>Personal workspace</strong>
            <small>Local environment</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav className="main-nav" aria-label="Main navigation">
          {nav.map(({ to, name, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={() => setMobile(false)}
              title={collapsed ? name : undefined}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{name}</span>
              {to === '/live' && <i className="nav-live-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="nav-secondary">
          <span className="nav-label">PREFERENCES</span>
          <NavLink
            to="/settings"
            onClick={() => setMobile(false)}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Settings size={19} strokeWidth={1.7} />
            <span>Settings</span>
          </NavLink>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <BookOpen size={19} strokeWidth={1.7} />
            <span>Getting started</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-model">
            <div className="model-card-icon">
              <Command size={19} />
            </div>
            <div>
              <strong>{model.data?.ready ? 'Model connected' : 'Your model, your machine'}</strong>
              <small>
                {model.data?.ready
                  ? model.data.supported_classes.join(' · ')
                  : 'Private by design. Local by default.'}
              </small>
            </div>
            <span className={`status-dot ${model.data?.ready ? 'green' : 'amber'}`} />
            <NavLink to="/settings" className="model-config">
              {model.data?.ready ? 'View configuration' : 'Connect a model'}
              <ArrowUpRight size={14} />
            </NavLink>
          </div>
          <div className="sidebar-tools">
            <div className="theme-switch">
              <button
                aria-label="Light theme"
                className={theme === 'light' ? 'selected' : ''}
                onClick={() => setTheme('light')}
              >
                <Sun size={15} />
              </button>
              <button
                aria-label="Dark theme"
                className={theme === 'dark' ? 'selected' : ''}
                onClick={() => setTheme('dark')}
              >
                <Moon size={15} />
              </button>
              <button
                aria-label="System theme"
                className={theme === 'system' ? 'selected' : ''}
                onClick={() => setTheme('system')}
              >
                <Monitor size={15} />
              </button>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleSidebar}
            >
              {collapsed ? <ChevronRight size={17} /> : <PanelLeftClose size={17} />}
            </Button>
          </div>
          <div className="profile">
            <span className="profile-avatar">AV</span>
            <div>
              <strong>Local workspace</strong>
              <small>Everything stays on this device</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-home">Workspace</span>
            <ChevronRight size={13} />
            <span>{title}</span>
          </div>
          <div className="topbar-right">
            <span className="local-label">
              <span className={`status-dot ${health.data ? 'green' : 'amber'}`} />
              {health.data
                ? 'Local system connected'
                : health.isPending
                  ? 'Connecting…'
                  : 'Backend offline'}
            </span>
            <span className="topbar-divider" />
            <button
              className="help-button"
              onClick={() => setHelp(true)}
              aria-label="Open getting started guide"
            >
              ?
            </button>
            <span className="top-avatar">AV</span>
          </div>
        </header>
        <main id="main" className="main-content">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
        <footer className="app-footer">
          <span>
            <span className="mini-logo">◈</span> Aegis Vision <span className="footer-dot">·</span>{' '}
            See clearly. Respond intelligently.
          </span>
          <span>Built for thoughtful human review.</span>
        </footer>
      </div>
      <Dialog
        open={help}
        onOpenChange={setHelp}
        title="A clearer view starts here"
        description="Your guide to a private visual intelligence workspace."
      >
        <ol className="guide-list">
          <li>
            <strong>Connect your model</strong>
            <p>
              Place trusted YOLO weights at models/weapon.pt and reload in Settings. COCO
              checkpoints detect knives; gun detection needs custom training.
            </p>
          </li>
          <li>
            <strong>Choose an input</strong>
            <p>
              Analyze an image, process a video, or connect your browser camera. All inference runs
              on your local backend.
            </p>
          </li>
          <li>
            <strong>Review with context</strong>
            <p>
              Explore saved evidence and confidence scores. Predictions are indications requiring
              human review, not assessments of intent.
            </p>
          </li>
        </ol>
        <Button asChild>
          <NavLink to="/settings" onClick={() => setHelp(false)}>
            Open settings
            <ChevronLeft style={{ transform: 'rotate(180deg)' }} size={16} />
          </NavLink>
        </Button>
      </Dialog>
    </div>
  )
}
