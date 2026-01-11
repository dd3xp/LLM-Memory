/**
 * 对话管理器
 * 负责管理单个对话的流程和上下文（问答模式）
 */

import { LLMService } from '../services/LLMService'
import { DatabaseService, Message as DBMessage } from '../services/DatabaseService'
import { CuratorService } from '../services/CuratorService'
import { v4 as uuidv4 } from 'uuid'
import { AutoTokenizer } from '@xenova/transformers'
import { config } from '../../../config'

// 动态导入消融配置（仅在测试环境）
let getAblationConfig: (() => any) | null = null
try {
  const ablationModule = require('../../test/AblationConfig')
  getAblationConfig = ablationModule.getAblationConfig
} catch {
  // 测试模块不存在时忽略
}

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
  private curator: CuratorService // Curator模块
  private maxContextTokens: number
  private tokenizer: any = null // Tokenizer实例
  private tokenizerReady: Promise<void> // Tokenizer初始化Promise
  
  // 对话摘要（历史压缩）
  private conversationSummary: string = '' // 历史对话摘要
  private summaryTokens: number = 0
  
  // 记录待提取insights的消息（Dynamic Cheatsheet）
  private pendingMessages: Message[] = []
  
  // 测试辅助：记录最后一次使用的 insights 数量
  public lastInsightsUsedCount: number = 0

  constructor(conversationId: string, testDbPath?: string) {
    this.conversationId = conversationId
    this.llmService = new LLMService()
    this.db = new DatabaseService(testDbPath) // 支持测试环境传入自定义数据库路径
    this.curator = new CuratorService(this.db) // 传递数据库实例给Curator
    
    // 从配置读取参数（支持消融实验覆盖）
    const ablationConfig = getAblationConfig ? getAblationConfig() : null
    this.maxContextTokens = ablationConfig?.maxContextTokens ?? config.memory.maxContextTokens
    
    // 异步初始化Tokenizer
    this.tokenizerReady = this.initTokenizer()
    
    console.log('[DialogueManager] 对话管理器已初始化, conversationId:', conversationId)
    console.log(`[DialogueManager] 配置: 最大上下文=${this.maxContextTokens} tokens`)
    console.log('[DialogueManager] ✅ Dynamic Cheatsheet (Insights) 已启用')
  }

  /**
   * 初始化Tokenizer
   */
  private async initTokenizer(): Promise<void> {
    try {
      console.log('[DialogueManager] 正在加载Tokenizer...')
      this.tokenizer = await AutoTokenizer.from_pretrained('Qwen/Qwen2.5-7B-Instruct')
      console.log('[DialogueManager] ✅ Tokenizer加载成功')
    } catch (error) {
      console.warn('[DialogueManager] ⚠️ Tokenizer加载失败，将使用估算方法:', error)
      this.tokenizer = null
    }
  }

  /**
   * 精确计算文本的token数量（如果tokenizer可用）
   * 否则降级到估算
   */
  private async countTokens(text: string): Promise<number> {
    // 等待tokenizer初始化完成
    await this.tokenizerReady
    
    if (this.tokenizer) {
      try {
        // 精确计算
        const encoded = await this.tokenizer.encode(text)
        return encoded.length
      } catch (error) {
        console.warn('[DialogueManager] Token计算失败，使用估算:', error)
        return this.estimateTokens(text)
      }
    } else {
      // 降级到估算
      return this.estimateTokens(text)
    }
  }

  /**
   * 估算文本的token数量（降级方案）
   * 粗略估算：中文字符×2.5，其他字符×1.3
   */
  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars
    return Math.ceil(chineseChars * 2.5 + otherChars * 1.3)
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

      // 2. 检查并更新摘要（如果接近上限）
      await this.checkAndSummarizeIfNeeded()

      // 3. 构建上下文（包含摘要+最近消息）
      const contextMessages = await this.buildContextWithSummary()

      // 4. 调用 LLM 生成回复
      const systemPrompt = this.buildSystemPrompt()
      const response = await this.llmService.generateResponse(
        contextMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        systemPrompt
      )

      // 5. 保存助手回复到内存和数据库
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

      // 6. 立即返回响应给用户
      // 在后台异步提取Insights（Dynamic Cheatsheet - 论文核心功能）
      // 论文要求：memory curation after each query（每次查询后）
      // 不阻塞主流程，提升用户体验
      this.extractInsightsAfterQuery(userMsg, assistantMsg)
        .catch(error => {
          console.error('[DialogueManager] 后台Insight提取任务失败:', error)
        })

      return response
    } catch (error) {
      console.error('[DialogueManager] 处理消息失败:', error)
      return '抱歉，我遇到了一些问题，请稍后再试。'
    }
  }

  /**
   * 构建上下文（包含摘要+insights+最近消息）
   */
  private async buildContextWithSummary(): Promise<Message[]> {
    const result: Message[] = []
    let totalTokens = 0
    
    // 1. 如果有摘要，先添加摘要
    if (this.conversationSummary) {
      result.push({
        role: 'assistant',
        content: `[历史对话摘要]\n${this.conversationSummary}`,
        timestamp: Date.now()
      })
      totalTokens = this.summaryTokens
      console.log(`[DialogueManager] 包含摘要: ${this.summaryTokens} tokens`)
    }

    // 2. 获取相关Insights（Dynamic Cheatsheet - 论文核心）
    // 同时受数量和token双重限制
    const userQuery = this.messages[this.messages.length - 1]?.content || ''
    const ablationConfig = getAblationConfig ? getAblationConfig() : null
    const insights = (!ablationConfig || ablationConfig.enableInsightRetrieval)
      ? await this.curator.getRelevantInsights(
          userQuery, 
          this.conversationId, 
          ablationConfig?.maxInsightsTokens ?? config.memory.maxInsightsTokens, // 支持消融实验调整
          this.countTokens.bind(this) // 传入tokenCounter
        )
      : []
    
    if (insights.length > 0) {
      const insightsText = this.curator.formatInsights(insights)
      const insightsTokens = await this.countTokens(insightsText)
      
      result.push({
        role: 'assistant',
        content: insightsText,
        timestamp: Date.now()
      })
      totalTokens += insightsTokens
      this.lastInsightsUsedCount = insights.length // 记录使用的 insights 数量
      console.log(`[DialogueManager] 包含Insights: ${insights.length}条, ${insightsTokens} tokens`)
    } else {
      this.lastInsightsUsedCount = 0 // 没有使用 insights
    }
    
    // 3. 从最新的消息开始往前取
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i]
      const msgTokens = await this.countTokens(msg.content)
      
      // 检查是否超过token限制
      if (totalTokens + msgTokens > this.maxContextTokens) {
        console.log('[DialogueManager] 达到token上限，停止添加历史消息')
        break
      }
      
      const insertPos = this.conversationSummary && insights.length > 0 ? 2 : (this.conversationSummary ? 1 : 0)
      result.splice(insertPos, 0, msg) // 插入到摘要和insights后面
      totalTokens += msgTokens
    }
    
    console.log(`[DialogueManager] 上下文构建完成: ${result.length}条消息, ${totalTokens} tokens (精确)`)
    return result
  }

  /**
   * 提取Insights（每次query后立即提取 - 论文要求）
   * 
   * 论文："DC's memory curation after each query"
   * 即：每次用户查询并得到回复后，立即分析并提取可复用知识
   */
  private async extractInsightsAfterQuery(userMsg: Message, assistantMsg: Message): Promise<void> {
    try {
      const ablationConfig = getAblationConfig ? getAblationConfig() : null
      if (ablationConfig && !ablationConfig.enableInsightExtraction) {
        console.log(`[Dynamic Cheatsheet] ⏭️  Insights提取已禁用（消融实验）`)
        return
      }
      
      // 将本轮对话消息加入pending
      this.pendingMessages.push(userMsg, assistantMsg)
      
      console.log(`[Dynamic Cheatsheet] 🔍 Query后提取Insights... (本次对话轮: ${this.pendingMessages.length / 2}轮)`)
      
      // 异步提取，不阻塞用户体验
      // 传入所有pending消息作为上下文（论文中会考虑历史上下文）
      this.curator.extractInsights(this.pendingMessages, this.conversationId)
        .then(() => {
          console.log(`[Dynamic Cheatsheet] ✅ Insights提取完成`)
        })
        .catch(error => {
          console.error('[Dynamic Cheatsheet] ❌ Insight提取失败:', error)
        })
      
      // 论文中没有提到清空pending的逻辑，保留历史作为提取上下文
      // 但为了避免pending过长，我们可以限制最大长度（例如最近20条消息 = 10轮对话）
      if (this.pendingMessages.length > 20) {
        this.pendingMessages = this.pendingMessages.slice(-20)
        console.log(`[Dynamic Cheatsheet] 📦 Pending消息过长，保留最近20条`)
      }
    } catch (error) {
      console.error('[Dynamic Cheatsheet] ❌ 提取流程异常:', error)
    }
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
   * 检查是否需要摘要（接近上限时）
   */
  private async checkAndSummarizeIfNeeded(): Promise<void> {
    // 计算当前消息的总token数
    let totalTokens = 0
    for (const msg of this.messages) {
      totalTokens += await this.countTokens(msg.content)
    }

    // 如果超过80%阈值，触发摘要
    const threshold = this.maxContextTokens * 0.8
    if (totalTokens > threshold && this.messages.length > 10) {
      await this.generateSummaryAndClear()
    }
  }

  /**
   * 生成摘要并清空旧消息（Cursor策略）
   */
  private async generateSummaryAndClear(): Promise<void> {
    const ablationConfig = getAblationConfig ? getAblationConfig() : null
    if (ablationConfig && !ablationConfig.enableSummary) {
      console.log('[Summary] ⏭️  对话摘要已禁用（消融实验）')
      return
    }
    
    console.log('[Summary] ⚠️ 上下文接近上限，开始生成摘要...')

    // 计算要摘要多少消息（前50%）
    const summarizeCount = Math.floor(this.messages.length / 2)
    const messagesToSummarize = this.messages.slice(0, summarizeCount)

    // 构建摘要prompt
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

    summaryPrompt += '\n\n要求：用简洁的要点格式总结，保留重要细节，控制在5000 tokens内。'

    try {
      // 调用摘要模型生成摘要
      const newSummary = await this.llmService.generateSummary(
        [{ role: 'user', content: summaryPrompt }],
        '你是一个专业的对话摘要助手，擅长提取关键信息。'
      )

      // 更新对话摘要
      this.conversationSummary = newSummary
      this.summaryTokens = await this.countTokens(newSummary)

      // 关键：清空已摘要的消息，只保留最近的
      this.messages = this.messages.slice(summarizeCount)

      // 持久化摘要到数据库
      this.db.updateSummary(this.conversationId, this.conversationSummary, this.summaryTokens)

      console.log(`[Summary] ✅ 摘要完成，清空前${summarizeCount}条消息`)
      console.log(`[Summary] 摘要: ${this.summaryTokens} tokens, 剩余: ${this.messages.length}条消息`)
      console.log(`[Summary] 内容:\n${newSummary}`)

      // 清理低质量的insights（Dynamic Cheatsheet维护）
      await this.curator.pruneInsights(this.conversationId)
    } catch (error) {
      console.error('[Summary] ❌ 摘要生成失败:', error)
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
   * 从数据库加载消息到内存（基于token的智能加载）
   */
  async loadMessages(dbMessages: DBMessage[]): Promise<void> {
    // 等待tokenizer初始化
    await this.tokenizerReady
    
    // 1. 加载对话摘要（持久化的历史压缩）
    const summaryData = this.db.getSummary(this.conversationId)
    this.conversationSummary = summaryData.summary
    this.summaryTokens = summaryData.tokens
    
    if (this.conversationSummary) {
      console.log(`[DialogueManager] 恢复对话摘要: ${this.summaryTokens} tokens`)
    }
    
    // 2. 从最新消息开始往前加载，直到达到token限制
    const result: Message[] = []
    let totalTokens = 0
    
    for (let i = dbMessages.length - 1; i >= 0; i--) {
      const dbMsg = dbMessages[i]
      const msgTokens = await this.countTokens(dbMsg.content) // 精确计算
      
      // 检查token限制
      if (totalTokens + msgTokens > this.maxContextTokens) {
        console.log('[DialogueManager] 达到token上限，停止加载更多历史')
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
    
    console.log(`[DialogueManager] 加载消息: 数据库${dbMessages.length}条, 内存保留${this.messages.length}条, ${totalTokens} tokens (精确)`)
  }

  /**
   * 获取对话ID
   */
  getConversationId(): string {
    return this.conversationId
  }
}
