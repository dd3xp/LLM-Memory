/**
 * 高兴状态
 * 回复热情、详细
 */

import { EmotionState } from './EmotionState'

export class HappyState extends EmotionState {
  private intensity: number = 0.8 // 情绪强度 0-1

  getName(): string {
    return 'happy'
  }

  handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    if (sentiment === 'negative') {
      // 被冒犯或遇到负面话题
      const { AngryState } = require('./AngryState')
      this.context.setState(new AngryState(this.context))
    } else if (sentiment === 'positive') {
      // 继续保持高兴
      this.intensity = Math.min(1, this.intensity + 0.1)
    }
  }

  adjustResponse(response: string): string {
    // 高兴时回复更热情，可能加感叹号、表情等
    return `${response} 😊`
  }

  decay(): void {
    // 情绪随时间衰减
    this.intensity -= 0.1
    if (this.intensity <= 0.3) {
      // 衰减到平静状态
      const { CalmState } = require('./CalmState')
      this.context.setState(new CalmState(this.context))
    }
  }
}
