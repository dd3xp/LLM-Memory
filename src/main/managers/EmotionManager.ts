/**
 * 情绪管理器
 * 使用状态模式管理角色情绪
 */

import { EmotionState, EmotionContext } from '../states/EmotionState'
import { CalmState } from '../states/CalmState'

export class EmotionManager implements EmotionContext {
  private currentState: EmotionState
  private lastDecayTime: number = Date.now()
  private decayInterval: number = 60000 // 1分钟衰减一次

  constructor() {
    // 初始状态为平静
    this.currentState = new CalmState(this)
  }

  setState(state: EmotionState): void {
    const oldEmotion = this.currentState.getName()
    this.currentState = state
    const newEmotion = state.getName()
    console.log(`[EmotionManager] 情绪转换: ${oldEmotion} -> ${newEmotion}`)
  }

  getCurrentEmotion(): string {
    return this.currentState.getName()
  }

  /**
   * 处理消息，可能触发情绪转换
   */
  handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    this.currentState.handleMessage(message, sentiment)
    this.checkDecay()
  }

  /**
   * 根据当前情绪调整回复
   */
  adjustResponse(response: string): string {
    return this.currentState.adjustResponse(response)
  }

  /**
   * 检查是否需要情绪衰减
   */
  private checkDecay(): void {
    const now = Date.now()
    if (now - this.lastDecayTime > this.decayInterval) {
      this.currentState.decay()
      this.lastDecayTime = now
    }
  }

  /**
   * 手动触发情绪衰减
   */
  triggerDecay(): void {
    this.currentState.decay()
    this.lastDecayTime = Date.now()
  }

  /**
   * 重置到平静状态
   */
  reset(): void {
    this.currentState = new CalmState(this)
    this.lastDecayTime = Date.now()
  }
}
