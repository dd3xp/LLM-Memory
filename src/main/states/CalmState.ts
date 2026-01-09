/**
 * 平静状态
 * 正常、中性的回复
 */

import { EmotionState } from './EmotionState'

export class CalmState extends EmotionState {
  getName(): string {
    return 'calm'
  }

  handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    if (sentiment === 'positive') {
      // 正面话题可能让心情变好
      const { HappyState } = require('./HappyState')
      this.context.setState(new HappyState(this.context))
    } else if (sentiment === 'negative') {
      // 被冒犯或负面话题可能让心情变差
      const { AngryState } = require('./AngryState')
      this.context.setState(new AngryState(this.context))
    }
    // neutral 保持平静
  }

  adjustResponse(response: string): string {
    // 平静状态不调整回复
    return response
  }

  decay(): void {
    // 平静状态不需要衰减
  }
}
