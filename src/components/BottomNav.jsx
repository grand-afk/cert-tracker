const TABS = [
  { id: 'topics',      icon: '📋', label: 'Topics',   key: '1' },
  { id: 'progress',    icon: '📊', label: 'Progress', key: '2' },
  { id: 'study',       icon: '🎓', label: 'Study',    key: '3' },
  { id: 'calendar',    icon: '📅', label: 'Calendar', key: '4' },
  { id: 'terminology', icon: '📖', label: 'Terms',    key: '5' },
  { id: 'help',        icon: '❓', label: 'Help',     key: '6' },
  { id: 'settings',    icon: '⚙️', label: 'Settings', key: '7' },
]

export default function BottomNav({ view, setView }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`nav-btn ${view === tab.id ? 'nav-btn--active' : ''}`}
          onClick={() => setView(tab.id)}
          aria-current={view === tab.id ? 'page' : undefined}
          title={`${tab.label}  [${tab.key}]`}
        >
          <span className="nav-btn__icon">{tab.icon}</span>
          <span className="nav-btn__label">{tab.label}</span>
          <span className="nav-btn__key">{tab.key}</span>
        </button>
      ))}
    </nav>
  )
}
