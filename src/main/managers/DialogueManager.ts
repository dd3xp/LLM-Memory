/**
 * 对话管理器
 * 负责管理单个对话的流程和上下文（问答模式）
 */

import { LLMService } from '../services/LLMService'
import { DatabaseService, Message as DBMessage } from '../services/DatabaseService'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export class DialogueManager {
  private conversationId: string
  private messages: Message[] = []
  private llmService: LLMService
  private db: DatabaseService
  private maxHistoryLength: number = 20 // 保留最近20条消息

  constructor(conversationId: string) {
    this.conversationId = conversationId
    this.llmService = new LLMService()
    this.db = new DatabaseService()
    console.log('[DialogueManager] 对话管理器已初始化, conversationId:', conversationId)
  }

  /**
   * 处理用户消息
   */
  async handleMessage(userMessage: string): Promise<string> {
    try {
      // 1. 保存用户消息到内存和数据库
      const userMsg: Message = {
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      }
      this.messages.push(userMsg)
      
      // 持久化到数据库
      this.db.addMessage({
        id: uuidv4(),
        conversation_id: this.conversationId,
        role: 'user',
        content: userMessage,
        timestamp: userMsg.timestamp
      })

      // 2. 构建上下文（保留最近的消息）
      const contextMessages = this.buildContext()

      // 3. 调用 LLM 生成回复
      const systemPrompt = this.buildSystemPrompt()
      const response = await this.llmService.generateResponse(
        contextMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        systemPrompt
      )

      // 4. 保存助手回复到内存和数据库
      const assistantMsg: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      this.messages.push(assistantMsg)
      
      // 持久化到数据库
      this.db.addMessage({
        id: uuidv4(),
        conversation_id: this.conversationId,
        role: 'assistant',
        content: response,
        timestamp: assistantMsg.timestamp
      })

      // 5. 维护历史长度
      this.trimHistory()

      return response
    } catch (error) {
      console.error('[DialogueManager] 处理消息失败:', error)
      return '抱歉，我遇到了一些问题，请稍后再试。'
    }
  }

  /**
   * 构建上下文
   */
  private buildContext(): Message[] {
    // 返回最近的消息
    return this.messages.slice(-this.maxHistoryLength)
  }

  /**
   * 构建系统提示
   */
  private buildSystemPrompt(): string {
    return `你是一个智能助手，名叫 Memory。

你的特点：
- 友好、专业、乐于助人
- 能够理解上下文并给出准确的回答
- 回答简洁明了，必要时提供详细解释
- 使用自然流畅的中文交流

请认真理解用户的问题，给出有价值的回答。`
  }

  /**
   * 维护历史长度
   */
  private trimHistory(): void {
    if (this.messages.length > this.maxHistoryLength * 2) {
      this.messages = this.messages.slice(-this.maxHistoryLength)
    }
  }

  /**
   * 获取对话历史
   */
  getHistory(): Message[] {
    return [...this.messages]
  }

  /**
   * 清除对话历史
   */
  clearHistory(): void {
    this.messages = []
    console.log('[DialogueManager] 对话历史已清除')
  }

  /**
   * 从数据库加载消息到内存
   */
  loadMessages(dbMessages: DBMessage[]): void {
    this.messages = dbMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp
    }))
    console.log('[DialogueManager] 加载消息:', this.messages.length)
  }

  /**
   * 获取对话ID
   */
  getConversationId(): string {
    return this.conversationId
  }
}
