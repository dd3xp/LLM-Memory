import { useState } from 'react'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import { useChat } from './hooks/useChat'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'qa' | 'chat'>('qa')

  // QA 模式的 hook
  const {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    sendMessage,
    createConversation,
    switchConversation,
    togglePinConversation,
    deleteConversation
  } = useChat('qa')

  // 处理标签切换
  const handleTabChange = (tab: 'qa' | 'chat'): void => {
    setActiveTab(tab)
  }

  // 处理发送消息
  const handleSendMessage = async (content: string): Promise<void> => {
    await sendMessage(content)
  }

  // 处理新建对话
  const handleNewChat = async (): Promise<void> => {
    await createConversation()
  }

  // 处理切换对话
  const handleItemClick = async (id: string): Promise<void> => {
    await switchConversation(id)
  }

  // 处理置顶
  const handleTogglePin = async (id: string): Promise<void> => {
    await togglePinConversation(id)
  }

  // 处理删除
  const handleDelete = async (id: string): Promise<void> => {
    await deleteConversation(id)
  }

  // 格式化消息
  const formatMessages = (msgs: { id: string; role: 'user' | 'assistant'; content: string; timestamp: number }[]) => {
    return msgs.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour12: false })
    }))
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg)',
        overflow: 'hidden'
      }}
    >
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        {activeTab === 'qa' ? (
          // QA 模式
          <>
            <Sidebar
              mode="qa"
              items={conversations.map((conv) => ({
                id: conv.id,
                name: conv.title,
                lastMessage: conv.lastMessage,
                time: conv.time,
                pinned: conv.pinned
              }))}
              activeItemId={currentConversationId || undefined}
              onItemClick={handleItemClick}
              onNewItem={handleNewChat}
              onTogglePin={handleTogglePin}
              onDelete={handleDelete}
            />

            <ChatArea
              messages={formatMessages(messages)}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </>
        ) : (
          // 角色扮演模式 - 暂未实现
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-tertiary)'
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ marginBottom: '16px', opacity: 0.5 }}
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
              角色扮演模式
            </p>
            <p style={{ fontSize: '14px' }}>功能开发中，敬请期待...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
