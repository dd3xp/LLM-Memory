/**
 * Baseline测试 - 无记忆系统的对照组
 * 用于对比有记忆和无记忆的性能差异
 * 
 * 使用与 Full Memory 相同的 token-based 滑动窗口，
 * 区别在于：没有 Summary、没有 Insights
 */

import { LLMService } from '../../main/services/LLMService'
import { metrics, PerformanceMetric, QualityMetric } from '../MetricsCollector'
import { AutoTokenizer } from '@xenova/transformers'
import { COMPARISON_MAX_CONTEXT_TOKENS } from '../TestConfig'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export class BaselineTest {
  private llmService: LLMService
  private messages: Message[] = []
  private maxContextTokens: number  // 与 Full Memory 相同的 token 限制
  private tokenizer: any = null

  constructor(maxContextTokens: number = COMPARISON_MAX_CONTEXT_TOKENS) {
    this.llmService = new LLMService()
    this.maxContextTokens = maxContextTokens
  }

  /**
   * 初始化tokenizer
   */
  async init() {
    console.log('[Baseline] 初始化tokenizer...')
    this.tokenizer = await AutoTokenizer.from_pretrained('Qwen/Qwen2.5-7B-Instruct')
    console.log(`[Baseline] 初始化完成, maxContextTokens: ${this.maxContextTokens}`)
  }

  /**
   * 计算token数量
   */
  private async countTokens(text: string): Promise<number> {
    const tokens = await this.tokenizer(text)
    return tokens.input_ids.size
  }

  /**
   * 处理消息（无记忆，只有 token-based 滑动窗口）
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

      // 2. 按 token 数构建上下文（与 Full Memory 相同的滑动窗口方式）
      const contextMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []
      let totalTokens = 0
      
      // 从最新消息往前取，直到达到 token 上限
      for (let i = this.messages.length - 1; i >= 0; i--) {
        const msg = this.messages[i]
        const msgTokens = await this.countTokens(msg.content)
        
        if (totalTokens + msgTokens > this.maxContextTokens) {
          console.log(`[Baseline] 达到token上限 (${this.maxContextTokens})，截断历史消息`)
          break
        }
        
        contextMessages.unshift({
          role: msg.role,
          content: msg.content
        })
        totalTokens += msgTokens
      }

      console.log(`[Baseline] 上下文: ${contextMessages.length} 条消息, ${totalTokens} tokens`)

      // 3. 生成回复
      const response = await this.llmService.generateResponse(
        contextMessages,
        '你是一个智能助手，名叫 J0K3R KH3VV。'
      )

      // 4. 保存助手回复
      const assistantMsg: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      this.messages.push(assistantMsg)

      // 5. 记录指标
      const duration = Date.now() - startTime

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
        insightsUsed: 0,  // Baseline 没有 insights
        insightsRelevance: [],
        contextSize: totalTokens,  // 使用实际的 token 数
        summaryUsed: false  // Baseline 没有摘要
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
