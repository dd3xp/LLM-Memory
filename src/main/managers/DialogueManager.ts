/**
 * 对话管理器
 * 负责管理单个对话的流程和上下文（问答模式）
 * 使用装饰器模式管理记忆功能
 */

import { LLMService } from '../services/LLMService'
import { DatabaseService, Message as DBMessage } from '../services/DatabaseService'
import { v4 as uuidv4 } from 'uuid'
import { AutoTokenizer } from '@xenova/transformers'
import { config } from '../../../config'
import {
  MemoryComponent,
  MemoryContext,
  Message,
  BaseMemory,
  SummaryDecorator,
  InsightsDecorator
} from '../memory'

// 动态导入测试配置（仅在测试环境）
let getTestConfig: (() => any) | null = null
try {
  const testConfigModule = require('../../test/TestConfig')
  getTestConfig = testConfigModule.getTestConfig
} catch {
  // 测试模块不存在时忽略
}

export class DialogueManager {
  private conversationId: string
  private messages: Message[] = []
  private llmService: LLMService
  private db: DatabaseService
  private maxContextTokens: number
  private tokenizer: any = null
  private tokenizerReady: Promise<void>

  // 装饰器模式：记忆组件
  private memoryComponent: MemoryComponent
  private summaryDecorator: SummaryDecorator | null = null
  private insightsDecorator: InsightsDecorator | null = null

  // 测试辅助
  public lastInsightsUsedCount: number = 0

  constructor(conversationId: string, testDbPath?: string) {
    this.conversationId = conversationId
    this.llmService = new LLMService()
    this.db = new DatabaseService(testDbPath)

    // 从配置读取参数
    const testConfig = getTestConfig ? getTestConfig() : null
    this.maxContextTokens = testConfig?.maxContextTokens ?? config.memory.maxContextTokens

    // 异步初始化 Tokenizer
    this.tokenizerReady = this.initTokenizer()

    // 构建记忆组件链（装饰器模式）
    this.memoryComponent = this.buildMemoryChain(testConfig)

    console.log('[DialogueManager] 对话管理器已初始化, conversationId:', conversationId)
    console.log(`[DialogueManager] 配置: 最大上下文=${this.maxContextTokens} tokens`)
    console.log(`[DialogueManager] 记忆组件链: ${this.memoryComponent.getName()}`)
  }

  /**
   * 构建记忆组件链（装饰器模式）
   */
  private buildMemoryChain(testConfig: any): MemoryComponent {
    // 基础组件：滑动窗口
    let component: MemoryComponent = new BaseMemory()

    // 装饰器 1：摘要增强
    const enableSummary = !testConfig || testConfig.enableSummary !== false
    if (enableSummary) {
      this.summaryDecorator = new SummaryDecorator(component, this.db, this.llmService)
      component = this.summaryDecorator
      console.log('[DialogueManager] 启用 SummaryDecorator')
    }

    // 装饰器 2：Insights 增强
    const enableInsights = !testConfig ||
      (testConfig.enableInsightExtraction !== false && testConfig.enableInsightRetrieval !== false)
    if (enableInsights) {
      this.insightsDecorator = new InsightsDecorator(
        component,
        this.db,
        testConfig?.maxInsightsTokens
      )
      component = this.insightsDecorator
      console.log('[DialogueManager] 启用 InsightsDecorator')
    }

    return component
  }

  /**
   * 初始化 Tokenizer
   */
  private async initTokenizer(): Promise<void> {
    try {
      console.log('[DialogueManager] 正在加载 Tokenizer...')
      this.tokenizer = await AutoTokenizer.from_pretrained('Qwen/Qwen2.5-7B-Instruct')
      console.log('[DialogueManager] Tokenizer 加载成功')
    } catch (error) {
      console.warn('[DialogueManager] Tokenizer 加载失败，将使用估算方法:', error)
      this.tokenizer = null
    }
  }

  /**
   * 计算文本的 token 数量
   */
  private async countTokens(text: string): Promise<number> {
    await this.tokenizerReady

    if (this.tokenizer) {
      try {
        const encoded = await this.tokenizer.encode(text)
        return encoded.length
      } catch (error) {
        console.warn('[DialogueManager] Token 计算失败，使用估算:', error)
        return this.estimateTokens(text)
      }
    } else {
      return this.estimateTokens(text)
    }
  }

  /**
   * 估算文本的 token 数量（降级方案）
   */
  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars
    return Math.ceil(chineseChars * 2.5 + otherChars * 1.3)
  }

  /**
   * 创建记忆上下文
   */
  private createMemoryContext(): MemoryContext {
    return {
      conversationId: this.conversationId,
      messages: this.messages,
      maxContextTokens: this.maxContextTokens,
      countTokens: this.countTokens.bind(this)
    }
  }

  /**
   * 处理用户消息
   */
  async handleMessage(userMessage: string): Promise<string> {
    try {
      // 1. 保存用户消息
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

      // 2. 检查并压缩（如果需要）
      const memoryContext = this.createMemoryContext()
      await this.memoryComponent.checkAndCompress(memoryContext)

      // 3. 构建上下文（使用装饰器链）
      const contextResult = await this.memoryComponent.buildContext(memoryContext, userMessage)

      // 更新 Insights 使用计数
      this.lastInsightsUsedCount = contextResult.metadata.insightsCount || 0

      console.log(`[DialogueManager] 上下文构建完成: ${contextResult.messages.length} 条消息, ${contextResult.totalTokens} tokens`)

      // 4. 调用 LLM 生成回复
      const systemPrompt = this.buildSystemPrompt()
      const response = await this.llmService.generateResponse(
        contextResult.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        systemPrompt
      )

      // 5. 保存助手回复
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

      // 6. 后处理（异步，不阻塞）
      this.memoryComponent.afterResponse(memoryContext, userMsg, assistantMsg)
        .catch(error => {
          console.error('[DialogueManager] 后处理失败:', error)
        })

      return response
    } catch (error) {
      console.error('[DialogueManager] 处理消息失败:', error)
      return '抱歉，我遇到了一些问题，请稍后再试。'
    }
  }

  /**
   * 构建系统提示
   */
  private buildSystemPrompt(): string {
    return `你是一个智能助手，名叫 J0K3R KH3VV。

你的特点：
- 友好、专业、乐于助人
- 能够理解上下文并给出准确的回答
- 回答简洁明了，必要时提供详细解释
- 使用自然流畅的中文交流

⚠️ 关于知识库的重要提醒：
- 知识库中的信息来自历史对话，**可能已过时**
- 每条知识都标注了记录时间，请注意时效性
- 如果知识库信息与你的通用知识或当前对话矛盾，**优先使用最新信息**
- 对于版本相关的信息（框架版本、API、配置等），建议向用户确认是否仍然适用

请认真理解用户的问题，给出有价值的回答。`
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
   * 从数据库加载消息
   */
  async loadMessages(dbMessages: DBMessage[]): Promise<void> {
    await this.tokenizerReady

    // 加载摘要（如果有 SummaryDecorator）
    if (this.summaryDecorator) {
      this.summaryDecorator.loadSummary(this.conversationId)
    }

    // 从最新消息开始往前加载，直到达到 token 限制
    const result: Message[] = []
    let totalTokens = 0

    for (let i = dbMessages.length - 1; i >= 0; i--) {
      const dbMsg = dbMessages[i]
      const msgTokens = await this.countTokens(dbMsg.content)

      if (totalTokens + msgTokens > this.maxContextTokens) {
        console.log('[DialogueManager] 达到 token 上限，停止加载更多历史')
        break
      }

      result.unshift({
        role: dbMsg.role as 'user' | 'assistant',
        content: dbMsg.content,
        timestamp: dbMsg.timestamp
      })

      totalTokens += msgTokens
    }

    this.messages = result

    console.log(`[DialogueManager] 加载消息: 数据库 ${dbMessages.length} 条, 内存保留 ${this.messages.length} 条, ${totalTokens} tokens`)
  }

  /**
   * 获取对话 ID
   */
  getConversationId(): string {
    return this.conversationId
  }

  /**
   * 获取记忆组件名称（用于调试）
   */
  getMemoryComponentName(): string {
    return this.memoryComponent.getName()
  }
}
