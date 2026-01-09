/**
 * 记忆策略接口
 * 定义记忆管理的通用接口
 */

export interface MemoryItem {
  id: string
  content: string
  timestamp: number
}

export interface MemoryStrategy {
  /**
   * 添加记忆
   */
  add(item: MemoryItem): void

  /**
   * 获取记忆
   */
  get(limit?: number): MemoryItem[]

  /**
   * 清除记忆
   */
  clear(): void

  /**
   * 获取策略名称
   */
  getName(): string
}
