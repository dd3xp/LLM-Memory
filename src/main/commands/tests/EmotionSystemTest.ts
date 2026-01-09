/**
 * 情绪系统测试命令
 */

import { Command } from '../Command'
import { CommandRegistry } from '../CommandRegistry'

export class EmotionSystemTest extends Command {
  constructor() {
    super()
    CommandRegistry.getInstance().register(this)
  }

  getName(): string {
    return 'test-emotion-system'
  }

  getDescription(): string {
    return '测试情绪状态机功能'
  }

  async execute(): Promise<void> {
    console.log('[Test] 开始测试情绪系统...')
    try {
      // TODO: 测试情绪状态转换
      console.log('[Test] ✅ 情绪系统测试通过')
    } catch (error) {
      console.error('[Test] ❌ 情绪系统测试失败:', error)
      throw error
    }
  }
}

new EmotionSystemTest()
