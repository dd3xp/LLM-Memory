/**
 * 焦虑状态
 * 回复可能啰嗦、重复、不确定
 */

import { EmotionState } from './EmotionState'

export class AnxiousState extends EmotionState {
  private intensity: number = 0.6

  getName(): string {
    return 'anxious'
  }

  handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    if (sentiment === 'positive') {
      // 安慰可能缓解焦虑
      this.intensity -= 0.2
      if (this.intensity <= 0.2) {
        const { CalmState } = require('./CalmState')
        this.context.setState(new CalmState(this.context))
      }
    } else if (sentiment === 'negative') {
      // 负面话题加重焦虑
      this.intensity = Math.min(1, this.intensity + 0.15)
    }
  }

  adjustResponse(response: string): string {
    // 焦虑时回复可能啰嗦、不确定
    return `${response}...我是说...嗯...`
  }

  decay(): void {
    this.intensity -= 0.08
    if (this.intensity <= 0.2) {
      const { CalmState } = require('./CalmState')
      this.context.setState(new CalmState(this.context))
    }
  }
}
