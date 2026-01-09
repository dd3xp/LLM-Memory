/**
 * 命令注册器
 * 自动注册和管理所有命令
 */

import { Command } from './Command'

export class CommandRegistry {
  private static instance: CommandRegistry
  private commands: Map<string, Command> = new Map()

  private constructor() {}

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry()
    }
    return CommandRegistry.instance
  }

  /**
   * 注册命令
   */
  register(command: Command): void {
    this.commands.set(command.getName(), command)
    console.log(`[CommandRegistry] Registered: ${command.getName()}`)
  }

  /**
   * 获取所有命令
   */
  getAll(): Command[] {
    return Array.from(this.commands.values())
  }

  /**
   * 根据名称获取命令
   */
  get(name: string): Command | undefined {
    return this.commands.get(name)
  }

  /**
   * 执行命令
   */
  async execute(name: string): Promise<void> {
    const command = this.commands.get(name)
    if (!command) {
      throw new Error(`Command not found: ${name}`)
    }
    await command.execute()
  }

  /**
   * 列出所有命令
   */
  list(): Array<{ name: string; description: string }> {
    return Array.from(this.commands.values()).map((cmd) => ({
      name: cmd.getName(),
      description: cmd.getDescription()
    }))
  }
}
