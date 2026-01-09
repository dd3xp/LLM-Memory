/**
 * 问答模式命令
 */

import { Command } from '../Command'
import { CommandRegistry } from '../CommandRegistry'

export class QAMode extends Command {
  constructor() {
    super()
    CommandRegistry.getInstance().register(this)
  }

  getName(): string {
    return 'mode-qa'
  }

  getDescription(): string {
    return '启动问答模式'
  }

  async execute(): Promise<void> {
    console.log('[Mode] 进入问答模式')
    // TODO: 初始化问答模式
  }
}

new QAMode()
