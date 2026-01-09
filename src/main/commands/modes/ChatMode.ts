/**
 * 聊天模式命令
 */

import { Command } from '../Command'
import { CommandRegistry } from '../CommandRegistry'

export class ChatMode extends Command {
  constructor() {
    super()
    CommandRegistry.getInstance().register(this)
  }

  getName(): string {
    return 'mode-chat'
  }

  getDescription(): string {
    return '启动聊天模式'
  }

  async execute(): Promise<void> {
    console.log('[Mode] 进入聊天模式')
    // TODO: 初始化聊天模式
  }
}

new ChatMode()
