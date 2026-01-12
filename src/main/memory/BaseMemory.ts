/**
 * 基础记忆组件
 * 实现基于 Token 的滑动窗口记忆
 */

import { MemoryComponent, MemoryContext, ContextResult, Message } from './MemoryComponent'

export class BaseMemory implements MemoryComponent {
  getName(): string {
    return 'BaseMemory'
  }

  /**
   * 构建上下文（基础滑动窗口）
   * 从最新的消息开始往前取，直到达到 token 限制
   */
  async buildContext(context: MemoryContext, query: string): Promise<ContextResult> {
    const result: Message[] = []
    let totalTokens = 0

    // 从最新的消息开始往前取
    for (let i = context.messages.length - 1; i >= 0; i--) {
      const msg = context.messages[i]
      const msgTokens = await context.countTokens(msg.content)

      // 检查是否超过 token 限制
      if (totalTokens + msgTokens > context.maxContextTokens) {
        console.log('[BaseMemory] 达到 token 上限，停止添加历史消息')
        break
      }

      result.unshift(msg) // 插入到开头，保持时间顺序
      totalTokens += msgTokens
    }

    console.log(`[BaseMemory] 构建上下文: ${result.length} 条消息, ${totalTokens} tokens`)

    return {
      messages: result,
      totalTokens,
      metadata: {
        messagesIncluded: result.length
      }
    }
  }

  /**
   * 回复后的处理（基础组件无需处理）
   */
  async afterResponse(
    context: MemoryContext,
    userMsg: Message,
    assistantMsg: Message
  ): Promise<void> {
    // 基础组件不需要后处理
  }

  /**
   * 检查是否需要压缩（基础组件不压缩，只丢弃旧消息）
   */
  async checkAndCompress(context: MemoryContext): Promise<boolean> {
    // 基础滑动窗口不需要压缩，在 buildContext 时自动丢弃旧消息
    return false
  }
}
