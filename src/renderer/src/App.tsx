import { useState, useEffect } from 'react'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import { useChat } from './hooks/useChat'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'qa' | 'chat'>('qa')
  
  // 使用真实的聊天 hook（只在 QA 模式下）
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
  } = useChat(activeTab)

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
    if (activeTab === 'qa') {
      await switchConversation(id)
    } else {
      // Chat 模式暂不实现
      console.log('Chat 模式切换对话:', id)
    }
  }

  // 处理置顶
  const handleTogglePin = async (id: string): Promise<void> => {
    if (activeTab === 'qa') {
      await togglePinConversation(id)
    }
  }

  // 处理删除
  const handleDelete = async (id: string): Promise<void> => {
    if (activeTab === 'qa') {
      await deleteConversation(id)
    }
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
        <Sidebar
          mode={activeTab}
          items={
            activeTab === 'qa'
              ? conversations.map((conv) => ({
                  id: conv.id,
                  name: conv.title,
                  lastMessage: conv.lastMessage,
                  time: conv.time,
                  pinned: conv.pinned
                }))
              : [] // Chat 模式暂时显示空列表
          }
          activeItemId={currentConversationId || undefined}
          onItemClick={handleItemClick}
          onNewItem={handleNewChat}
          onTogglePin={handleTogglePin}
          onDelete={handleDelete}
        />

        <ChatArea
          messages={messages.map((msg) => ({
            ...msg,
            timestamp:
              typeof msg.timestamp === 'number'
                ? new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                    hour12: false
                  })
                : msg.timestamp
          }))}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export default App
