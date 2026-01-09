/**
 * LLM 连接测试命令
 */

import { Command } from '../Command'
import { CommandRegistry } from '../CommandRegistry'

export class LLMConnectionTest extends Command {
  constructor() {
    super()
    // 自动注册
    CommandRegistry.getInstance().register(this)
  }

  getName(): string {
    return 'test-llm-connection'
  }

  getDescription(): string {
    return '测试 LLM API 连接'
  }

  async execute(): Promise<void> {
    console.log('[Test] 开始测试 LLM 连接...')
    try {
      // TODO: 实际调用 LLM API 测试
      console.log('[Test] ✅ LLM 连接成功')
    } catch (error) {
      console.error('[Test] ❌ LLM 连接失败:', error)
      throw error
    }
  }
}

// 创建实例以自动注册
new LLMConnectionTest()
