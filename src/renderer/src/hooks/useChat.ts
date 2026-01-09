/**
 * 聊天逻辑 Hook - 支持对话管理和持久化
 */

import { useState, useEffect } from 'react'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ConversationListItem {
  id: string
  title: string
  lastMessage?: string
  time: string
  type: 'qa' | 'chat'
  pinned: boolean
}

export function useChat(mode: 'qa' | 'chat' = 'qa') {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 加载对话列表
  const loadConversations = async (): Promise<void> => {
    try {
      const list = await window.api.getConversationList(mode)
      setConversations(list)
      
      // 如果有对话且没有当前对话，自动选择第一个
      if (list.length > 0 && !currentConversationId) {
        await switchConversation(list[0].id)
      }
    } catch (error) {
      console.error('加载对话列表失败:', error)
    }
  }

  // 创建新对话
  const createConversation = async (): Promise<void> => {
    try {
      const newConv = await window.api.createConversation(mode)
      setCurrentConversationId(newConv.id)
      setMessages([])
      await loadConversations() // 刷新列表
    } catch (error) {
      console.error('创建对话失败:', error)
    }
  }

  // 切换对话
  const switchConversation = async (conversationId: string): Promise<void> => {
    try {
      const dbMessages = await window.api.switchConversation(conversationId)
      setCurrentConversationId(conversationId)
      
      // 转换消息格式
      const formattedMessages: Message[] = dbMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }))
      
      setMessages(formattedMessages)
    } catch (error) {
      console.error('切换对话失败:', error)
    }
  }

  // 切换置顶状态
  const togglePinConversation = async (conversationId: string): Promise<void> => {
    try {
      await window.api.togglePinConversation(conversationId)
      await loadConversations() // 刷新列表
    } catch (error) {
      console.error('切换置顶状态失败:', error)
    }
  }

  // 删除对话
  const deleteConversation = async (conversationId: string): Promise<void> => {
    try {
      await window.api.deleteConversation(conversationId)
      
      // 如果删除的是当前对话，清空消息
      if (conversationId === currentConversationId) {
        setCurrentConversationId(null)
        setMessages([])
      }
      
      await loadConversations() // 刷新列表
    } catch (error) {
      console.error('删除对话失败:', error)
    }
  }

  // 发送消息
  const sendMessage = async (content: string): Promise<void> => {
    // 如果没有当前对话，先创建一个
    if (!currentConversationId) {
      await createConversation()
    }

    // 添加用户消息（乐观更新）
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    }
    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)
    try {
      // 通过 IPC 发送到主进程
      const response = await window.api.sendMessage(content)

      // 添加助手回复
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, assistantMessage])
      
      // 刷新对话列表（更新最后消息和时间）
      await loadConversations()
    } catch (error) {
      console.error('发送消息失败:', error)
      // 添加错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。请检查网络连接或稍后再试。',
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载对话列表
  useEffect(() => {
    loadConversations()
  }, [mode])

  return {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    sendMessage,
    createConversation,
    switchConversation,
    togglePinConversation,
    deleteConversation,
    loadConversations
  }
}
