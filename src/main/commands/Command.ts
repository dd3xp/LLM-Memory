/**
 * 命令模式基类
 * 用于测试和运行模式的自动注册
 */

export abstract class Command {
  /**
   * 获取命令名称
   */
  abstract getName(): string

  /**
   * 获取命令描述
   */
  abstract getDescription(): string

  /**
   * 执行命令
   */
  abstract execute(): Promise<void>
}
