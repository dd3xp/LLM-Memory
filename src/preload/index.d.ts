import { ElectronAPI } from '@electron-toolkit/preload'

interface Conversation {
  id: string
  title: string
  type: 'qa' | 'chat'
  character_id?: string
  created_at: number
  updated_at: number
}

interface ConversationListItem {
  id: string
  title: string
  lastMessage?: string
  time: string
  type: 'qa' | 'chat'
  pinned: boolean
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatAPI {
  // 对话管理
  createConversation: (type?: 'qa' | 'chat') => Promise<Conversation>
  getConversationList: (type?: 'qa' | 'chat') => Promise<ConversationListItem[]>
  switchConversation: (conversationId: string) => Promise<Message[]>
  togglePinConversation: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  
  // 消息管理
  sendMessage: (message: string) => Promise<string>
  getMessages: () => Promise<Message[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ChatAPI
  }
}
