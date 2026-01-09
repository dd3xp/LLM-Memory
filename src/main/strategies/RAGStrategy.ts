/**
 * RAG (检索增强生成) 记忆策略
 * 使用向量搜索检索相关记忆
 */

import { MemoryStrategy, MemoryItem } from './MemoryStrategy'

export class RAGStrategy implements MemoryStrategy {
  private memories: Map<string, MemoryItem> = new Map()

  add(item: MemoryItem): void {
    this.memories.set(item.id, item)
    // TODO: 生成 embedding 并存储到向量数据库
  }

  get(limit: number = 5): MemoryItem[] {
    // TODO: 实现基于向量搜索的检索
    // 目前返回最近的记忆
    const items = Array.from(this.memories.values())
    return items.slice(-limit)
  }

  clear(): void {
    this.memories.clear()
    // TODO: 清除向量数据库
  }

  getName(): string {
    return 'RAG'
  }

  /**
   * 根据查询检索相关记忆
   */
  async retrieve(query: string, limit: number = 5): Promise<MemoryItem[]> {
    // TODO: 实现语义搜索
    return this.get(limit)
  }
}
