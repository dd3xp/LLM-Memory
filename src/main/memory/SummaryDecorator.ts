/**
 * 摘要装饰器
 * 为记忆系统添加对话摘要压缩功能
 */

import { MemoryDecorator } from './MemoryDecorator'
import { MemoryComponent, MemoryContext, ContextResult, Message } from './MemoryComponent'
import { LLMService } from '../services/LLMService'
import { DatabaseService } from '../services/DatabaseService'

export class SummaryDecorator extends MemoryDecorator {
  private llmService: LLMService
  private db: DatabaseService
  private conversationSummary: string = ''
  private summaryTokens: number = 0
  private compressThreshold: number = 0.8 // 80% 阈值触发压缩
  private compressRatio: number = 0.5     // 压缩前 50% 的消息

  constructor(
    wrapped: MemoryComponent,
    db: DatabaseService,
    llmService?: LLMService
  ) {
    super(wrapped)
    this.db = db
    this.llmService = llmService || new LLMService()
  }

  protected getDecoratorName(): string {
    return 'Summary'
  }

  /**
   * 加载已存储的摘要
   */
  loadSummary(conversationId: string): void {
    const summaryData = this.db.getSummary(conversationId)
    this.conversationSummary = summaryData.summary
    this.summaryTokens = summaryData.tokens

    if (this.conversationSummary) {
      console.log(`[SummaryDecorator] 恢复摘要: ${this.summaryTokens} tokens`)
    }
  }

  /**
   * 构建上下文（添加摘要）
   */
  async buildContext(context: MemoryContext, query: string): Promise<ContextResult> {
    // 先让被包装的组件构建基础上下文
    const baseResult = await this.wrapped.buildContext(context, query)

    // 如果有摘要，添加到上下文开头
    if (this.conversationSummary) {
      const summaryMsg: Message = {
        role: 'assistant',
        content: `[历史对话摘要]\n${this.conversationSummary}`,
        timestamp: Date.now()
      }

      // 插入到开头
      baseResult.messages.unshift(summaryMsg)
      baseResult.totalTokens += this.summaryTokens
      baseResult.metadata.summaryTokens = this.summaryTokens

      console.log(`[SummaryDecorator] 添加摘要: ${this.summaryTokens} tokens`)
    }

    return baseResult
  }

  /**
   * 检查是否需要压缩
   */
  async checkAndCompress(context: MemoryContext): Promise<boolean> {
    // 计算当前消息的总 token 数
    let totalTokens = this.summaryTokens
    for (const msg of context.messages) {
      totalTokens += await context.countTokens(msg.content)
    }

    // 如果超过阈值，触发压缩
    const threshold = context.maxContextTokens * this.compressThreshold
    if (totalTokens > threshold && context.messages.length > 10) {
      await this.generateSummaryAndClear(context)
      return true
    }

    // 继续检查被包装组件
    return this.wrapped.checkAndCompress(context)
  }

  /**
   * 生成摘要并清空旧消息
   */
  private async generateSummaryAndClear(context: MemoryContext): Promise<void> {
    console.log('[SummaryDecorator] 上下文接近上限，开始生成摘要...')

    // 计算要摘要多少消息（前 50%）
    const summarizeCount = Math.floor(context.messages.length * this.compressRatio)
    const messagesToSummarize = context.messages.slice(0, summarizeCount)

    // 构建摘要 prompt
    let summaryPrompt = '请简洁总结以下对话的关键信息，保留重要决策、结论和待办事项：\n\n'

    // 如果已有摘要，先包含
    if (this.conversationSummary) {
      summaryPrompt += `# 之前的摘要：\n${this.conversationSummary}\n\n`
    }

    // 添加要摘要的消息
    summaryPrompt += '# 对话内容：\n'
    summaryPrompt += messagesToSummarize
      .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n\n')

    summaryPrompt += '\n\n要求：用简洁的要点格式总结，保留重要细节，控制在 5000 tokens 内。'

    try {
      // 调用摘要模型生成摘要
      const newSummary = await this.llmService.generateSummary(
        [{ role: 'user', content: summaryPrompt }],
        '你是一个专业的对话摘要助手，擅长提取关键信息。'
      )

      // 更新摘要
      this.conversationSummary = newSummary
      this.summaryTokens = await context.countTokens(newSummary)

      // 清空已摘要的消息（修改原数组）
      context.messages.splice(0, summarizeCount)

      // 持久化摘要到数据库
      this.db.updateSummary(context.conversationId, this.conversationSummary, this.summaryTokens)

      console.log(`[SummaryDecorator] 摘要完成，清空前 ${summarizeCount} 条消息`)
      console.log(`[SummaryDecorator] 摘要: ${this.summaryTokens} tokens, 剩余: ${context.messages.length} 条消息`)
    } catch (error) {
      console.error('[SummaryDecorator] 摘要生成失败:', error)
    }
  }

  /**
   * 获取当前摘要信息
   */
  getSummaryInfo(): { summary: string; tokens: number } {
    return {
      summary: this.conversationSummary,
      tokens: this.summaryTokens
    }
  }
}
