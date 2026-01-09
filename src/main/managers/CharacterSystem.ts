/**
 * 角色系统
 * 负责管理角色的人格参数、知识边界、情绪状态
 */

import { EmotionManager } from './EmotionManager'

export interface CharacterConfig {
  name: string
  personality: {
    extroversion: number // 外向性 1-10
    emotionalStability: number // 情绪稳定性 1-10
    friendliness: number // 友善度 1-10
    patience: number // 耐心程度 1-10
  }
  memory: {
    strength: number // 记忆力 1-10
    learningSpeed: 'fast' | 'medium' | 'slow'
  }
  knowledgeDomains: string[] // 知识领域
}

export class CharacterSystem {
  private config: CharacterConfig | null = null
  private emotionManager: EmotionManager

  constructor() {
    this.emotionManager = new EmotionManager()
  }

  /**
   * 加载角色配置
   */
  loadCharacter(config: CharacterConfig): void {
    this.config = config
    this.emotionManager.reset() // 重置情绪状态
  }

  /**
   * 获取当前角色配置
   */
  getCharacter(): CharacterConfig | null {
    return this.config
  }

  /**
   * 检查知识边界
   */
  isWithinKnowledgeBoundary(topic: string): boolean {
    if (!this.config) return false

    // 简单的关键词匹配检查
    const lowerTopic = topic.toLowerCase()
    return this.config.knowledgeDomains.some((domain) =>
      lowerTopic.includes(domain.toLowerCase())
    )
  }

  /**
   * 获取当前情绪状态
   */
  getCurrentEmotion(): string {
    return this.emotionManager.getCurrentEmotion()
  }

  /**
   * 处理消息（可能触发情绪变化）
   */
  handleMessage(message: string, sentiment: 'positive' | 'negative' | 'neutral'): void {
    this.emotionManager.handleMessage(message, sentiment)
  }

  /**
   * 根据当前情绪调整回复
   */
  adjustResponse(response: string): string {
    return this.emotionManager.adjustResponse(response)
  }

  /**
   * 获取情绪管理器
   */
  getEmotionManager(): EmotionManager {
    return this.emotionManager
  }
}
