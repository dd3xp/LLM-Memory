/**
 * 角色工厂
 * 提供统一的角色创建接口
 */

import { CharacterConfig } from '../managers/CharacterSystem'
import { CharacterBuilder, ChatRecord } from '../builders/CharacterBuilder'
import * as fs from 'fs'
import * as path from 'path'

export class CharacterFactory {
  /**
   * 从保存的配置文件加载角色
   */
  static async loadFromFile(filePath: string): Promise<CharacterConfig> {
    console.log(`[Factory] 从文件加载角色: ${filePath}`)
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const config = JSON.parse(content) as CharacterConfig
      return config
    } catch (error) {
      throw new Error(`Failed to load character from file: ${error}`)
    }
  }

  /**
   * 从上传的聊天记录创建角色
   */
  static async createFromChatHistory(
    records: ChatRecord[],
    name: string
  ): Promise<CharacterConfig> {
    console.log(`[Factory] 从聊天记录创建角色: ${name}`)

    const builder = new CharacterBuilder()

    // 使用建造者模式分步创建
    await builder
      .setName(name)
      .analyzeChatHistory(records)
      .then(() => builder.extractPersonality(records))
      .then(() => builder.extractKnowledgeDomains(records))
      .then(() => builder.extractLanguageStyle(records))
      .then(() => builder.extractEmotionPattern(records))

    // 设置默认记忆参数
    builder.setMemory(7, 'medium')

    return builder.build()
  }

  /**
   * 手动创建角色
   */
  static createManually(config: CharacterConfig): CharacterConfig {
    console.log(`[Factory] 手动创建角色: ${config.name}`)
    // 验证配置完整性
    this.validateConfig(config)
    return config
  }

  /**
   * 克隆已有角色
   */
  static clone(original: CharacterConfig, newName: string): CharacterConfig {
    console.log(`[Factory] 克隆角色: ${original.name} -> ${newName}`)
    return {
      ...original,
      name: newName
    }
  }

  /**
   * 创建默认角色
   */
  static createDefault(name: string = 'Default'): CharacterConfig {
    console.log(`[Factory] 创建默认角色: ${name}`)
    return {
      name,
      personality: {
        extroversion: 5,
        emotionalStability: 5,
        friendliness: 7,
        patience: 6
      },
      memory: {
        strength: 6,
        learningSpeed: 'medium'
      },
      knowledgeDomains: ['通用知识']
    }
  }

  /**
   * 保存角色到文件
   */
  static async saveToFile(config: CharacterConfig, dirPath: string): Promise<string> {
    const fileName = `${config.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    const filePath = path.join(dirPath, fileName)

    console.log(`[Factory] 保存角色到文件: ${filePath}`)

    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2))
    return filePath
  }

  /**
   * 验证配置完整性
   */
  private static validateConfig(config: CharacterConfig): void {
    if (!config.name) throw new Error('Character name is required')
    if (!config.personality) throw new Error('Personality is required')
    if (!config.memory) throw new Error('Memory config is required')
    if (!config.knowledgeDomains || config.knowledgeDomains.length === 0) {
      throw new Error('Knowledge domains are required')
    }
  }
}
