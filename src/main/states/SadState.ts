/**
 * 悲伤状态
 * 回复消极、敷衍
 */

import { EmotionState } from './EmotionState'

export class SadState extends EmotionState {
  private intensity: number = 0.7

  getName(): string {
    return 'sad'
  }

  handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    if (sentiment === 'positive') {
      // 安慰或正面事件可能改善心情
      this.intensity -= 0.3
      if (this.intensity <= 0.2) {
        const { HappyState } = require('./HappyState')
        this.context.setState(new HappyState(this.context))
      }
    } else if (sentiment === 'negative') {
      // 继续悲伤
      this.intensity = Math.min(1, this.intensity + 0.1)
    }
  }

  adjustResponse(response: string): string {
    // 悲伤时回复消极、可能很简短
    return '嗯...' + response
  }

  decay(): void {
    this.intensity -= 0.1
    if (this.intensity <= 0.2) {
      const { CalmState } = require('./CalmState')
      this.context.setState(new CalmState(this.context))
    }
  }
}
