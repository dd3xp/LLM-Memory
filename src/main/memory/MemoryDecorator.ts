/**
 * 记忆装饰器基类
 * 所有装饰器继承此类，通过组合方式增强功能
 */

import { MemoryComponent, MemoryContext, ContextResult, Message } from './MemoryComponent'

export abstract class MemoryDecorator implements MemoryComponent {
  protected wrapped: MemoryComponent

  constructor(wrapped: MemoryComponent) {
    this.wrapped = wrapped
  }

  /**
   * 获取完整的组件链名称
   */
  getName(): string {
    return `${this.getDecoratorName()}(${this.wrapped.getName()})`
  }

  /**
   * 获取当前装饰器的名称（子类实现）
   */
  protected abstract getDecoratorName(): string

  /**
   * 构建上下文（默认委托给被包装的组件）
   */
  async buildContext(context: MemoryContext, query: string): Promise<ContextResult> {
    return this.wrapped.buildContext(context, query)
  }

  /**
   * 回复后的处理（默认委托给被包装的组件）
   */
  async afterResponse(
    context: MemoryContext,
    userMsg: Message,
    assistantMsg: Message
  ): Promise<void> {
    return this.wrapped.afterResponse(context, userMsg, assistantMsg)
  }

  /**
   * 检查是否需要压缩（默认委托给被包装的组件）
   */
  async checkAndCompress(context: MemoryContext): Promise<boolean> {
    return this.wrapped.checkAndCompress(context)
  }
}
