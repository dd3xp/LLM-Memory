/**
 * Insights 装饰器
 * 为记忆系统添加知识库功能（Dynamic Cheatsheet）
 */

import { MemoryDecorator } from './MemoryDecorator'
import { MemoryComponent, MemoryContext, ContextResult, Message } from './MemoryComponent'
import { CuratorService } from '../services/CuratorService'
import { DatabaseService } from '../services/DatabaseService'
import { config } from '../../../config'

export class InsightsDecorator extends MemoryDecorator {
  private curator: CuratorService
  private maxInsightsTokens: number
  private pendingMessages: Message[] = [] // 待提取的消息
  public lastInsightsUsedCount: number = 0

  constructor(
    wrapped: MemoryComponent,
    db: DatabaseService,
    maxInsightsTokens?: number
  ) {
    super(wrapped)
    this.curator = new CuratorService(db)
    this.maxInsightsTokens = maxInsightsTokens || config.memory.maxInsightsTokens
  }

  protected getDecoratorName(): string {
    return 'Insights'
  }

  /**
   * 构建上下文（添加相关 Insights）
   */
  async buildContext(context: MemoryContext, query: string): Promise<ContextResult> {
    // 先让被包装的组件构建基础上下文
    const baseResult = await this.wrapped.buildContext(context, query)

    // 获取相关的 Insights
    const insights = await this.curator.getRelevantInsights(
      query,
      context.conversationId,
      this.maxInsightsTokens,
      context.countTokens
    )

    if (insights.length > 0) {
      const insightsText = this.curator.formatInsights(insights)
      const insightsTokens = await context.countTokens(insightsText)

      // 创建 Insights 消息
      const insightsMsg: Message = {
        role: 'assistant',
        content: insightsText,
        timestamp: Date.now()
      }

      // 插入到上下文开头（在摘要之后，如果有的话）
      // 找到第一条用户消息的位置
      let insertPos = 0
      for (let i = 0; i < baseResult.messages.length; i++) {
        if (baseResult.messages[i].role === 'user') {
          insertPos = i
          break
        }
        insertPos = i + 1
      }

      baseResult.messages.splice(insertPos, 0, insightsMsg)
      baseResult.totalTokens += insightsTokens
      baseResult.metadata.insightsCount = insights.length
      baseResult.metadata.insightsTokens = insightsTokens

      this.lastInsightsUsedCount = insights.length
      console.log(`[InsightsDecorator] 添加 Insights: ${insights.length} 条, ${insightsTokens} tokens`)
    } else {
      this.lastInsightsUsedCount = 0
    }

    return baseResult
  }

  /**
   * 回复后的处理（提取 Insights）
   */
  async afterResponse(
    context: MemoryContext,
    userMsg: Message,
    assistantMsg: Message
  ): Promise<void> {
    // 先调用被包装组件的后处理
    await this.wrapped.afterResponse(context, userMsg, assistantMsg)

    // 将本轮对话加入待提取队列
    this.pendingMessages.push(userMsg, assistantMsg)

    console.log(`[InsightsDecorator] 准备提取 Insights... (本次对话轮: ${this.pendingMessages.length / 2} 轮)`)

    // 异步提取 Insights，不阻塞主流程
    this.extractInsightsAsync(context.conversationId)
      .catch(error => {
        console.error('[InsightsDecorator] Insights 提取失败:', error)
      })

    // 限制 pending 消息长度（最近 20 条 = 10 轮对话）
    if (this.pendingMessages.length > 20) {
      this.pendingMessages = this.pendingMessages.slice(-20)
      console.log('[InsightsDecorator] Pending 消息过长，保留最近 20 条')
    }
  }

  /**
   * 异步提取 Insights
   */
  private async extractInsightsAsync(conversationId: string): Promise<void> {
    try {
      await this.curator.extractInsights(
        this.pendingMessages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        })),
        conversationId
      )
      console.log('[InsightsDecorator] Insights 提取完成')
    } catch (error) {
      console.error('[InsightsDecorator] Insights 提取异常:', error)
    }
  }

  /**
   * 检查是否需要压缩（同时清理低质量 Insights）
   */
  async checkAndCompress(context: MemoryContext): Promise<boolean> {
    const compressed = await this.wrapped.checkAndCompress(context)

    // 如果触发了压缩，同时清理低质量 Insights
    if (compressed) {
      await this.curator.pruneInsights(context.conversationId)
    }

    return compressed
  }

  /**
   * 获取使用的 Insights 数量
   */
  getLastInsightsUsedCount(): number {
    return this.lastInsightsUsedCount
  }
}
