/**
 * 记忆组件接口（装饰器模式）
 * 定义记忆管理的通用接口，支持装饰器叠加
 */

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface MemoryContext {
  conversationId: string
  messages: Message[]           // 当前对话消息
  maxContextTokens: number      // 最大上下文 token 数
  countTokens: (text: string) => Promise<number>  // token 计数器
}

export interface ContextResult {
  messages: Message[]           // 构建的上下文消息
  totalTokens: number           // 总 token 数
  metadata: {
    summaryTokens?: number      // 摘要使用的 token
    insightsCount?: number      // 使用的 Insights 数量
    insightsTokens?: number     // Insights 使用的 token
    messagesIncluded: number    // 包含的消息数量
  }
}

/**
 * 记忆组件接口
 * 所有记忆组件（基础组件和装饰器）都实现这个接口
 */
export interface MemoryComponent {
  /**
   * 获取组件名称
   */
  getName(): string

  /**
   * 构建上下文
   * @param context 记忆上下文
   * @param query 当前用户查询
   * @returns 构建的上下文结果
   */
  buildContext(context: MemoryContext, query: string): Promise<ContextResult>

  /**
   * 回复后的处理（异步，不阻塞主流程）
   * @param context 记忆上下文
   * @param userMsg 用户消息
   * @param assistantMsg 助手回复
   */
  afterResponse(context: MemoryContext, userMsg: Message, assistantMsg: Message): Promise<void>

  /**
   * 检查是否需要压缩/清理
   * @param context 记忆上下文
   * @returns 是否执行了压缩
   */
  checkAndCompress(context: MemoryContext): Promise<boolean>
}
