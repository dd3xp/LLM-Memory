/**
 * 生气状态
 * 回复简短、不耐烦
 */

import { EmotionState } from './EmotionState'

export class AngryState extends EmotionState {
  private intensity: number = 0.8

  getName(): string {
    return 'angry'
  }

  handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    if (sentiment === 'positive') {
      // 正面话题可能让情绪缓和
      this.intensity -= 0.2
      if (this.intensity <= 0.3) {
        const { CalmState } = require('./CalmState')
        this.context.setState(new CalmState(this.context))
      }
    } else if (sentiment === 'negative') {
      // 持续负面，可能转为悲伤
      this.intensity = Math.min(1, this.intensity + 0.1)
      if (this.intensity >= 0.9) {
        const { SadState } = require('./SadState')
        this.context.setState(new SadState(this.context))
      }
    }
  }

  adjustResponse(response: string): string {
    // 生气时回复简短、可能带不满语气
    const shortened = response.split('.')[0] // 只取第一句
    return `${shortened}。`
  }

  decay(): void {
    this.intensity -= 0.15
    if (this.intensity <= 0.2) {
      const { CalmState } = require('./CalmState')
      this.context.setState(new CalmState(this.context))
    }
  }
}
