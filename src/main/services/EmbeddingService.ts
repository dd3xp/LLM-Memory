/**
 * Embedding Service - 语义向量生成服务
 * 使用 @xenova/transformers 将文本转换为向量，用于语义搜索
 */

import { pipeline, Pipeline } from '@xenova/transformers'

export class EmbeddingService {
  private embedder: Pipeline | null = null
  private initPromise: Promise<void>
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2' // 轻量级embedding模型

  constructor() {
    this.initPromise = this.initModel()
  }

  /**
   * 初始化embedding模型
   */
  private async initModel(): Promise<void> {
    try {
      console.log('[EmbeddingService] 正在加载embedding模型:', this.modelName)
      
      // 使用feature-extraction pipeline
      this.embedder = await pipeline('feature-extraction', this.modelName, {
        quantized: true // 使用量化模型以减少内存占用
      })
      
      console.log('[EmbeddingService] ✅ Embedding模型加载完成')
    } catch (error) {
      console.error('[EmbeddingService] 模型加载失败:', error)
      throw error
    }
  }

  /**
   * 生成文本的embedding向量
   * @param text 输入文本
   * @returns Float32Array格式的向量
   */
  async encode(text: string): Promise<Float32Array> {
    await this.initPromise

    if (!this.embedder) {
      throw new Error('[EmbeddingService] Embedding模型未初始化')
    }

    try {
      // 生成embedding
      const output = await this.embedder(text, {
        pooling: 'mean', // 使用mean pooling
        normalize: true  // L2归一化，便于计算余弦相似度
      })

      // 提取数据并转换为Float32Array
      const embedding = output.data as Float32Array

      return embedding
    } catch (error) {
      console.error('[EmbeddingService] Embedding生成失败:', error)
      throw error
    }
  }

  /**
   * 批量生成embedding（提高效率）
   * @param texts 文本数组
   * @returns 向量数组
   */
  async encodeBatch(texts: string[]): Promise<Float32Array[]> {
    await this.initPromise

    if (!this.embedder) {
      throw new Error('[EmbeddingService] Embedding模型未初始化')
    }

    try {
      const embeddings: Float32Array[] = []

      for (const text of texts) {
        const embedding = await this.encode(text)
        embeddings.push(embedding)
      }

      return embeddings
    } catch (error) {
      console.error('[EmbeddingService] 批量Embedding生成失败:', error)
      throw error
    }
  }

  /**
   * 计算两个向量的余弦相似度
   * @param vec1 向量1
   * @param vec2 向量2
   * @returns 相似度（0-1之间，1表示完全相同）
   */
  static cosineSimilarity(vec1: Float32Array, vec2: Float32Array): number {
    if (vec1.length !== vec2.length) {
      throw new Error('[EmbeddingService] 向量维度不匹配')
    }

    // 由于向量已经归一化，余弦相似度 = 点积
    let dotProduct = 0
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
    }

    // 返回相似度（0-1之间）
    return Math.max(0, Math.min(1, dotProduct))
  }

  /**
   * 将Float32Array转换为Buffer（用于存储到数据库）
   */
  static toBuffer(embedding: Float32Array): Buffer {
    return Buffer.from(embedding.buffer)
  }

  /**
   * 将Buffer转换回Float32Array（从数据库读取）
   */
  static fromBuffer(buffer: Buffer): Float32Array {
    return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT)
  }
}
