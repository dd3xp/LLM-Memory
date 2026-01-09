/**
 * 情绪状态接口
 * 使用状态模式管理角色情绪
 */

export interface EmotionContext {
  setState(state: EmotionState): void
  getCurrentEmotion(): string
}

export abstract class EmotionState {
  protected context: EmotionContext

  constructor(context: EmotionContext) {
    this.context = context
  }

  /**
   * 获取情绪名称
   */
  abstract getName(): string

  /**
   * 处理消息，可能触发情绪转换
   */
  abstract handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void

  /**
   * 根据当前情绪调整回复语气
   */
  abstract adjustResponse(response: string): string

  /**
   * 情绪随时间自然衰减
   */
  abstract decay(): void
}
