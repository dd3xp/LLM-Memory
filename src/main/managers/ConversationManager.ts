/**
 * 对话管理器 - 管理多个对话的创建、切换、删除
 */

import { DatabaseService, Conversation, Message } from '../services/DatabaseService'
import { DialogueManager } from './DialogueManager'
import { v4 as uuidv4 } from 'uuid'

export interface ConversationListItem {
  id: string
  title: string
  lastMessage?: string
  time: string
  type: 'qa' | 'chat'
  pinned: boolean
}

export class ConversationManager {
  private db: DatabaseService
  private dialogueManagers: Map<string, DialogueManager> = new Map()
  private currentConversationId: string | null = null

  constructor() {
    this.db = new DatabaseService()
    console.log('[ConversationManager] 对话管理器已初始化')
  }

  /**
   * 创建新对话
   */
  createConversation(type: 'qa' | 'chat' = 'qa'): Conversation {
    const id = uuidv4()
    const title = type === 'qa' ? '新对话' : '新角色对话'
    
    const conversation = this.db.createConversation({
      id,
      title,
      type,
      character_id: undefined
    })

    // 创建对应的 DialogueManager
    const dialogueManager = new DialogueManager(id)
    this.dialogueManagers.set(id, dialogueManager)
    
    // 设置为当前对话
    this.currentConversationId = id
    
    console.log('[ConversationManager] 创建新对话:', id)
    return conversation
  }

  /**
   * 获取对话列表（用于 Sidebar 显示）
   */
  getConversationList(type: 'qa' | 'chat' = 'qa'): ConversationListItem[] {
    const conversations = this.db.getConversations(type)
    
    return conversations.map(conv => {
      const lastMsg = this.db.getLastMessage(conv.id)
      
      return {
        id: conv.id,
        title: conv.title,
        lastMessage: lastMsg?.content,
        time: this.formatTime(conv.updated_at),
        type: conv.type,
        pinned: conv.pinned === 1
      }
    })
  }

  /**
   * 切换到指定对话
   */
  switchConversation(conversationId: string): Message[] {
    const conversation = this.db.getConversation(conversationId)
    
    if (!conversation) {
      console.error('[ConversationManager] 对话不存在:', conversationId)
      throw new Error('对话不存在')
    }

    this.currentConversationId = conversationId

    // 如果该对话的 DialogueManager 不存在，创建它
    if (!this.dialogueManagers.has(conversationId)) {
      const dialogueManager = new DialogueManager(conversationId)
      this.dialogueManagers.set(conversationId, dialogueManager)
    }

    // 从数据库加载消息历史
    const messages = this.db.getMessages(conversationId)
    const dialogueManager = this.dialogueManagers.get(conversationId)!
    
    // 将消息加载到 DialogueManager
    dialogueManager.loadMessages(messages)

    console.log('[ConversationManager] 切换对话:', conversationId)
    return messages
  }

  /**
   * 获取当前对话的 DialogueManager
   */
  getCurrentDialogueManager(): DialogueManager | null {
    if (!this.currentConversationId) {
      return null
    }
    
    return this.dialogueManagers.get(this.currentConversationId) || null
  }

  /**
   * 发送消息到当前对话
   */
  async sendMessage(content: string): Promise<string> {
    if (!this.currentConversationId) {
      // 如果没有当前对话，自动创建一个
      this.createConversation('qa')
    }

    const dialogueManager = this.getCurrentDialogueManager()
    
    if (!dialogueManager) {
      throw new Error('当前对话不存在')
    }

    // 通过 DialogueManager 处理消息（会自动保存到数据库）
    const response = await dialogueManager.handleMessage(content)
    
    // 更新对话标题（如果是第一条消息）
    const messages = this.db.getMessages(this.currentConversationId!)
    if (messages.length === 2) { // 用户消息 + AI回复
      // 使用第一条用户消息的前20个字符作为标题
      const title = content.length > 20 ? content.substring(0, 20) + '...' : content
      this.db.updateConversation(this.currentConversationId!, { title })
    }

    return response
  }

  /**
   * 获取当前对话的消息历史
   */
  getCurrentMessages(): Message[] {
    if (!this.currentConversationId) {
      return []
    }
    
    return this.db.getMessages(this.currentConversationId)
  }

  /**
   * 切换对话置顶状态
   */
  togglePinConversation(conversationId: string): void {
    const conversation = this.db.getConversation(conversationId)
    if (!conversation) {
      throw new Error('对话不存在')
    }
    
    const newPinnedState = conversation.pinned === 0
    this.db.togglePinConversation(conversationId, newPinnedState)
    
    console.log('[ConversationManager] 切换置顶状态:', conversationId, newPinnedState)
  }

  /**
   * 删除对话
   */
  deleteConversation(conversationId: string): void {
    // 从数据库删除
    this.db.deleteConversation(conversationId)
    
    // 从内存删除
    this.dialogueManagers.delete(conversationId)
    
    // 如果删除的是当前对话，清空当前对话
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null
    }
    
    console.log('[ConversationManager] 删除对话:', conversationId)
  }

  /**
   * 格式化时间显示
   */
  private formatTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    
    if (diff < minute) {
      return '刚刚'
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`
    } else if (diff < 2 * day) {
      return '昨天'
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`
    } else {
      const date = new Date(timestamp)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
  }

  /**
   * 关闭管理器（释放资源）
   */
  close(): void {
    this.db.close()
    this.dialogueManagers.clear()
    console.log('[ConversationManager] 管理器已关闭')
  }
}
