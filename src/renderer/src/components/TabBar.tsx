/**
 * 顶部导航栏 - 现代极简设计
 */

interface TabBarProps {
  activeTab: 'qa' | 'chat'
  onTabChange: (tab: 'qa' | 'chat') => void
}

function TabBar({ activeTab, onTabChange }: TabBarProps): React.JSX.Element {
  return (
    <header
      style={{
        height: '56px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px'
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '600',
            color: 'white'
          }}
        >
          M
        </div>
        <span
          style={{
            fontSize: '15px',
            fontWeight: '600',
            color: 'var(--color-text)',
            letterSpacing: '-0.01em'
          }}
        >
          Memory
        </span>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onTabChange('qa')}
          className="transition-colors"
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: '500',
            color: activeTab === 'qa' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            backgroundColor: activeTab === 'qa' ? 'var(--color-bg-tertiary)' : 'transparent'
          }}
        >
          问答模式
        </button>
        <button
          onClick={() => onTabChange('chat')}
          className="transition-colors"
          style={{
            padding: '6px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: '500',
            color: activeTab === 'chat' ? 'var(--color-text)' : 'var(--color-text-secondary)',
            backgroundColor: activeTab === 'chat' ? 'var(--color-bg-tertiary)' : 'transparent'
          }}
        >
          聊天模式
        </button>
      </nav>

      {/* Right Actions */}
      <div style={{ width: '44px' }} />
    </header>
  )
}

export default TabBar
