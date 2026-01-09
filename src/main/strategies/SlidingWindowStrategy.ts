/**
 * 滑动窗口记忆策略
 * 保留最近的 N 条记忆
 */

import { MemoryStrategy, MemoryItem } from './MemoryStrategy'

export class SlidingWindowStrategy implements MemoryStrategy {
  private memories: MemoryItem[] = []
  private windowSize: number

  constructor(windowSize: number = 10) {
    this.windowSize = windowSize
  }

  add(item: MemoryItem): void {
    this.memories.push(item)
    // 保持窗口大小
    if (this.memories.length > this.windowSize) {
      this.memories.shift() // 移除最旧的记忆
    }
  }

  get(limit?: number): MemoryItem[] {
    if (limit) {
      return this.memories.slice(-limit)
    }
    return [...this.memories]
  }

  clear(): void {
    this.memories = []
  }

  getName(): string {
    return 'SlidingWindow'
  }

  /**
   * 设置窗口大小
   */
  setWindowSize(size: number): void {
    this.windowSize = size
    // 如果当前记忆超过新窗口大小，裁剪
    if (this.memories.length > size) {
      this.memories = this.memories.slice(-size)
    }
  }
}
