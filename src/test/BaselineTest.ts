/**
 * Baseline测试 - 无记忆系统的对照组
 * 用于对比有记忆和无记忆的性能差异
 */

import { LLMService } from '../main/services/LLMService'
import { metrics, PerformanceMetric, QualityMetric } from './MetricsCollector'
import { AutoTokenizer } from '@xenova/transformers'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export class BaselineTest {
  private llmService: LLMService
  private messages: Message[] = []
  private maxMessages: number = 20  // 简单的滑动窗口，保留最近20条
  private tokenizer: any = null

  constructor() {
    this.llmService = new LLMService()
  }

  /**
   * 初始化tokenizer
   */
  async init() {
    console.log('[Baseline] 初始化tokenizer...')
    this.tokenizer = await AutoTokenizer.from_pretrained('Qwen/Qwen2.5-7B-Instruct')
    console.log('[Baseline] 初始化完成')
  }

  /**
   * 计算token数量
   */
  private async countTokens(text: string): Promise<number> {
    const tokens = await this.tokenizer(text)
    return tokens.input_ids.size
  }

  /**
   * 处理消息（无记忆，只有简单滑动窗口）
   */
  async handleMessage(userInput: string): Promise<string> {
    const startTime = Date.now()
    
    try {
      // 1. 添加用户消息
      const userMsg: Message = {
        role: 'user',
        content: userInput,
        timestamp: Date.now()
      }
      this.messages.push(userMsg)

      // 2. 简单滑动窗口：只保留最近N条消息
      if (this.messages.length > this.maxMessages) {
        this.messages = this.messages.slice(-this.maxMessages)
      }

      // 3. 构建上下文（只有滑动窗口，无摘要，无insights）
      const contextMessages = this.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))

      // 4. 生成回复
      const response = await this.llmService.generateResponse(
        contextMessages,
        '你是一个智能助手，名叫 Memory。'
      )

      // 5. 保存助手回复
      const assistantMsg: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      this.messages.push(assistantMsg)

      // 6. 记录指标
      const duration = Date.now() - startTime
      const contextSize = await this.countTokens(contextMessages.map(m => m.content).join('\n'))

      const perfMetric: PerformanceMetric = {
        timestamp: Date.now(),
        operation: 'chat',
        duration,
        success: true
      }
      metrics.recordPerformance(perfMetric)

      const qualityMetric: QualityMetric = {
        timestamp: Date.now(),
        queryId: `baseline-${Date.now()}`,
        userQuery: userInput,
        responseLength: response.length,
        insightsUsed: 0,  // Baseline没有insights
        insightsRelevance: [],
        contextSize,
        summaryUsed: false  // Baseline没有摘要
      }
      metrics.recordQuality(qualityMetric)

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      metrics.recordPerformance({
        timestamp: Date.now(),
        operation: 'chat',
        duration,
        success: false,
        error: String(error)
      })
      throw error
    }
  }

  /**
   * 获取对话历史
   */
  getHistory(): Message[] {
    return [...this.messages]
  }

  /**
   * 清空历史
   */
  clearHistory() {
    this.messages = []
  }
}
