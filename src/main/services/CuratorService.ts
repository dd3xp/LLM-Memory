/**
 * Curator Service - 知识策展服务
 * 实现 Dynamic Cheatsheet 论文的 Curator Module
 * 负责从对话中提取可复用的知识（策略、代码、决策等）
 */

import { LLMService } from './LLMService'
import { DatabaseService, Insight } from './DatabaseService'
import { EmbeddingService } from './EmbeddingService'
import { v4 as uuidv4 } from 'uuid'

// 动态导入测试配置（仅在测试环境）
let getTestConfig: (() => any) | null = null
try {
  const testConfigModule = require('../../test/TestConfig')
  getTestConfig = testConfigModule.getTestConfig
} catch {
  // 测试模块不存在时忽略
}

// 简化的消息接口（不需要id和conversation_id）
interface SimpleMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

interface ExtractedInsight {
  type: 'strategy' | 'code' | 'decision' | 'concept' | 'method'
  content: string
  context: string
  importance: number
}

export class CuratorService {
  private llmService: LLMService
  private db: DatabaseService
  private embedder: EmbeddingService

  constructor(db?: DatabaseService) {
    this.llmService = new LLMService()
    this.db = db || new DatabaseService()
    this.embedder = new EmbeddingService()
    console.log('[CuratorService] 知识策展服务已初始化（语义搜索已启用）')
  }

  /**
   * 从消息中提取Insights（核心方法）
   */
  async extractInsights(
    messages: SimpleMessage[],
    conversationId: string
  ): Promise<Insight[]> {
    console.log(`[Curator] 开始提取Insights，消息数: ${messages.length}`)

    // 构建提取prompt
    const extractPrompt = this.buildExtractionPrompt(messages)

    try {
      // 调用LLM提取知识（使用Curator模型）
      const response = await this.llmService.generateCurator(
        [{ role: 'user', content: extractPrompt }],
        '你是一个专业的知识提取助手，擅长识别可复用的策略、方法和关键决策。'
      )

      // 解析LLM返回的JSON
      const extractedInsights = this.parseInsightsFromResponse(response)

      // 如果LLM返回空数组，说明没有可提取的知识
      if (extractedInsights.length === 0) {
        console.log('[Curator] 对话中没有可提取的知识，跳过')
        return []
      }

      // 检查提取质量：如果所有insights的重要性都很低，说明对话质量不高
      const avgImportance = extractedInsights.reduce((sum, i) => sum + i.importance, 0) / extractedInsights.length
      if (avgImportance < 0.6) {
        console.log(`[Curator] 提取的知识质量较低（平均重要性: ${avgImportance.toFixed(2)}），跳过`)
        return []
      }

      // 获取已存在的insights用于去重和冲突检测
      const existingInsights = this.db.getInsights(conversationId)

      // 转换为Insight对象，并进行去重和冲突检测
      const insights: Insight[] = []
      const now = Date.now()

      // ========== 统一策略：Embedding Top-K + 批量 LLM ==========
      const totalExistingInsights = existingInsights.length
      const newInsightsToProcess = extractedInsights.filter(e => e.importance > 0.5)
      
      // 先对同一批次的新知识进行去重（防止 LLM 提取出相似的多条）
      const dedupedNewInsights = await this.deduplicateNewInsights(newInsightsToProcess)
      
      console.log(`[Curator] 已有 ${totalExistingInsights} 条 Insights，处理 ${dedupedNewInsights.length} 条新知识（去重前 ${newInsightsToProcess.length} 条）`)
      
      interface PendingInsight {
        extracted: ExtractedInsight
        topSimilar?: Array<{ insight: Insight; similarity: number }>
        needsLLMCheck: boolean
      }
      
      const pendingInsights: PendingInsight[] = []
      
      for (const extracted of dedupedNewInsights) {
        // 快速检查相似度（不调用 LLM）
        const quickCheck = await this.quickSimilarityCheck(extracted, existingInsights)
        
        if (quickCheck.action === 'skip') {
          console.log(`[Curator] 快速跳过重复: ${extracted.content.substring(0, 30)}...`)
          continue
        }
        
        if (quickCheck.action === 'add') {
          // 可以直接添加
          const embeddingVec = await this.embedder.encode(extracted.content)
          const embedding = EmbeddingService.toBuffer(embeddingVec)
          
          const insight: Insight = {
            id: uuidv4(),
            conversation_id: conversationId,
            type: extracted.type,
            content: extracted.content,
            context: extracted.context,
            importance: extracted.importance,
            reuse_count: 0,
            is_deprecated: 0,
            embedding,
            created_at: now,
            last_used: now
          }
          
          this.db.addInsight(insight)
          insights.push(insight)
          continue
        }
        
        if (quickCheck.action === 'deprecate') {
          // 可以直接替换
          if (quickCheck.conflictWith) {
            this.db.deprecateInsight(quickCheck.conflictWith.id)
          }
          
          const embeddingVec = await this.embedder.encode(extracted.content)
          const embedding = EmbeddingService.toBuffer(embeddingVec)
          
          const insight: Insight = {
            id: uuidv4(),
            conversation_id: conversationId,
            type: extracted.type,
            content: extracted.content,
            context: extracted.context,
            importance: extracted.importance,
            reuse_count: 0,
            is_deprecated: 0,
            embedding,
            created_at: now,
            last_used: now
          }
          
          this.db.addInsight(insight)
          insights.push(insight)
          continue
        }
        
        // action === 'check_conflict'：需要 LLM 检测
        pendingInsights.push({
          extracted,
          topSimilar: quickCheck.topSimilar,
          needsLLMCheck: true
        })
      }
      
      // 批量 LLM 检测（仅针对需要检测的）
      if (pendingInsights.length > 0) {
        const totalCandidates = pendingInsights.reduce((sum, p) => sum + (p.topSimilar?.length || 0), 0)
        console.log(`[Curator] 一次性批量检测 ${pendingInsights.length} 条新 Insights (共 ${totalCandidates} 个候选配对)`)
        const batchResults = await this.batchConflictCheck(pendingInsights)
        
        for (let i = 0; i < pendingInsights.length; i++) {
          const pending = pendingInsights[i]
          const result = batchResults[i]
          
          if (result.action === 'skip') {
            console.log(`[Curator] 跳过: ${pending.extracted.content.substring(0, 30)}...`)
            continue
          }
          
          if (result.action === 'deprecate' && result.conflictWith) {
            console.log(`[Curator] 废弃旧的: ${result.conflictWith.content.substring(0, 30)}...`)
            this.db.deprecateInsight(result.conflictWith.id)
          }
          
          // 添加新 insight
          const embeddingVec = await this.embedder.encode(pending.extracted.content)
          const embedding = EmbeddingService.toBuffer(embeddingVec)
          
          const insight: Insight = {
            id: uuidv4(),
            conversation_id: conversationId,
            type: pending.extracted.type,
            content: pending.extracted.content,
            context: pending.extracted.context,
            importance: pending.extracted.importance,
            reuse_count: 0,
            is_deprecated: 0,
            embedding,
            created_at: now,
            last_used: now
          }
          
          this.db.addInsight(insight)
          insights.push(insight)
        }
      }

      if (insights.length === 0) {
        console.log('[Curator] 提取的知识都已存在或质量不足，未添加新insights')
      } else {
        console.log(`[Curator] 提取了 ${insights.length} 条高质量Insights（去重后）`)
      }
      
      return insights
    } catch (error) {
      console.error('[Curator] 提取Insights失败:', error)
      return []
    }
  }

  /**
   * 构建知识提取Prompt
   */
  private buildExtractionPrompt(messages: SimpleMessage[]): string {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n\n')

    return `请从以下对话中提取**可复用的知识**，包括：

1. **策略(strategy)**: 问题解决方法、思路、框架
2. **代码(code)**: 可复用的代码片段、函数、算法
3. **决策(decision)**: 重要的技术选型、架构决策及原因
4. **概念(concept)**: 关键的概念定义、理论解释
5. **方法(method)**: 具体的操作步骤、最佳实践

对话内容：
${conversation}

---

要求：
1. 只提取**可以在未来对话中复用**的知识
2. 每条知识要**具体、明确、可操作**
3. 评估重要性（0-1，越重要越接近1）：
   - 0.9-1.0: 核心技术决策、关键算法
   - 0.7-0.8: 重要的方法、策略
   - 0.5-0.6: 有用的技巧、概念
   - <0.5: 不需要提取
4. **去重要求**：提取的知识之间不能有重复或高度相似的内容！
   - 如果两条知识表达的是同一个意思，只保留更重要/更完整的那条
   - 不要输出多个代码示例来说明同一个概念
   - 合并相似的知识点，而不是分开列出
5. **重要**：如果对话内容是：
   - 简单的寒暄、问候（"你好"、"谢谢"等）
   - 纯粹的闲聊、无技术内容
   - 只是询问而没有得到有用答案
   - 没有任何可复用的知识
   → 请直接返回空数组 []，不要强行提取！

请以JSON格式输出，示例：
\`\`\`json
[
  {
    "type": "strategy",
    "content": "基于Token数量的滑动窗口比基于消息条数更精确",
    "context": "讨论了LLM上下文管理方案",
    "importance": 0.9
  },
  {
    "type": "code",
    "content": "使用AutoTokenizer.from_pretrained('Qwen/Qwen2.5-7B-Instruct')进行精确Token计算",
    "context": "实现Token计数功能",
    "importance": 0.8
  },
  {
    "type": "decision",
    "content": "采用Cursor策略：80%阈值触发摘要，摘要前50%消息并清空",
    "context": "Cheatsheet摘要策略选择",
    "importance": 0.95
  }
]
\`\`\`

只输出JSON数组，不要任何其他文字。`
  }

  /**
   * 解析LLM返回的Insights
   */
  private parseInsightsFromResponse(response: string): ExtractedInsight[] {
    try {
      // 提取JSON部分（可能被包裹在```json```中）
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\[([\s\S]*)\]/)
      
      if (!jsonMatch) {
        console.warn('[Curator] 无法提取JSON，尝试直接解析')
        return JSON.parse(response)
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const insights = JSON.parse(jsonStr.startsWith('[') ? jsonStr : '[' + jsonStr + ']')

      return insights.filter((i: any) => 
        i.type && i.content && i.context && typeof i.importance === 'number'
      )
    } catch (error) {
      console.error('[Curator] 解析Insights失败:', error)
      return []
    }
  }

  /**
   * 获取相关的Insights（根据当前问题）
   * 使用语义搜索 + 综合排序
   * 同时受数量和token限制
   */
  async getRelevantInsights(
    query: string,
    conversationId: string,
    maxTokens: number = 2000,
    tokenCounter?: (text: string) => Promise<number>
  ): Promise<Insight[]> {
    // 获取所有insights
    const allInsights = this.db.getInsights(conversationId)

    if (allInsights.length === 0) {
      return []
    }

    // 生成查询向量
    const queryEmbedding = await this.embedder.encode(query)

    // 计算每条insight的综合得分
    interface ScoredInsight {
      insight: Insight
      score: number
      similarity: number
    }

    const scoredInsights: ScoredInsight[] = []
    const MIN_SIMILARITY_THRESHOLD = 0.6  // 最低相似度阈值（只选相关及以上的）

    for (const insight of allInsights) {
      // 如果insight没有embedding（旧数据），跳过或使用降级方案
      if (!insight.embedding) {
        console.warn(`[Curator] Insight ${insight.id} 缺少embedding，跳过`)
        continue
      }

      // 计算语义相似度
      const insightEmbedding = EmbeddingService.fromBuffer(insight.embedding)
      const similarity = EmbeddingService.cosineSimilarity(queryEmbedding, insightEmbedding)

      // 过滤掉相似度过低的（避免引入不相关信息）
      if (similarity < MIN_SIMILARITY_THRESHOLD) {
        continue
      }

      // 综合得分 = 语义相似度(60%) + 重要性(40%)
      // 移除时效性：技术知识不因时间久远而失效
      const score = similarity * 0.6 + insight.importance * 0.4

      scoredInsights.push({ insight, score, similarity })
    }

    // 按综合得分排序
    const sorted = scoredInsights.sort((a, b) => b.score - a.score)

    // 逐条添加，直到达到数量或token限制
    const MAX_INSIGHTS_COUNT = 10  // 最多返回10条
    const relevant: Insight[] = []
    let totalTokens = 0

    for (const item of sorted) {
      const insight = item.insight

      // 数量限制：最多10条
      if (relevant.length >= MAX_INSIGHTS_COUNT) {
        console.log(`[Curator] 达到数量上限 (${MAX_INSIGHTS_COUNT})，停止添加更多insights`)
        break
      }

      // 如果提供了tokenCounter，检查token限制
      if (tokenCounter) {
        const typeLabel = {
          strategy: '策略',
          code: '代码',
          decision: '决策',
          concept: '概念',
          method: '方法'
        }[insight.type]
        
        const insightText = `[${typeLabel}] ${insight.content}\n背景: ${insight.context}`
        const insightTokens = await tokenCounter(insightText)

        // 如果加上这条会超过token限制，停止添加
        if (totalTokens + insightTokens > maxTokens) {
          console.log(`[Curator] 达到token上限 (${maxTokens})，停止添加更多insights`)
          break
        }

        totalTokens += insightTokens
      }

      relevant.push(insight)
    }

    // 更新使用次数
    relevant.forEach(insight => {
      this.db.updateInsightUsage(insight.id)
    })

    if (relevant.length > 0) {
      const avgSimilarity = relevant.reduce((sum, ins) => {
        const item = scoredInsights.find(s => s.insight.id === ins.id)
        return sum + (item?.similarity || 0)
      }, 0) / relevant.length

      console.log(`[Curator] 找到 ${relevant.length} 条相关Insights (平均相似度: ${(avgSimilarity * 100).toFixed(1)}%)${tokenCounter ? `, 共 ${totalTokens} tokens` : ''}`)
    }

    return relevant
  }

  /**
   * 格式化Insights为文本（用于注入上下文）
   */
  formatInsights(insights: Insight[]): string {
    if (insights.length === 0) {
      return ''
    }

    const formatted = insights.map(insight => {
      const typeLabel = {
        strategy: '策略',
        code: '代码',
        decision: '决策',
        concept: '概念',
        method: '方法'
      }[insight.type]

      // 计算知识的年龄
      const ageText = this.formatAge(insight.created_at)

      return `[${typeLabel}] [${ageText}] ${insight.content}\n背景: ${insight.context}`
    }).join('\n\n')

    return `# 可复用知识库（注意：信息可能已过时，请结合时间戳判断）\n\n${formatted}\n\n---\n`
  }

  /**
   * 格式化时间为可读的年龄描述
   */
  private formatAge(createdAt: number): string {
    const now = Date.now()
    const diffMs = now - createdAt
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / 3600000)
      if (diffHours === 0) {
        return '刚刚'
      }
      return `${diffHours}小时前`
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}个月前`
    } else {
      return `${Math.floor(diffDays / 365)}年前`
    }
  }

  /**
   * 对同一批次提取的新知识进行去重
   * 防止 LLM 提取出内容相似的多条知识
   */
  private async deduplicateNewInsights(insights: ExtractedInsight[]): Promise<ExtractedInsight[]> {
    if (insights.length <= 1) {
      return insights
    }

    const result: ExtractedInsight[] = []
    const embeddings: Float32Array[] = []

    for (const insight of insights) {
      const embedding = await this.embedder.encode(insight.content)
      
      // 检查与已保留的知识的相似度
      let isDuplicate = false
      for (let i = 0; i < embeddings.length; i++) {
        const similarity = EmbeddingService.cosineSimilarity(embedding, embeddings[i])
        if (similarity >= 0.85) {
          // 相似度 >= 85%，认为是重复的
          // 保留重要性更高的那个
          if (insight.importance > result[i].importance) {
            result[i] = insight
            embeddings[i] = embedding
            console.log(`[Curator] 批次内去重: 替换为更高重要性的知识`)
          } else {
            console.log(`[Curator] 批次内去重: 跳过相似知识 (相似度 ${(similarity * 100).toFixed(1)}%)`)
          }
          isDuplicate = true
          break
        }
      }
      
      if (!isDuplicate) {
        result.push(insight)
        embeddings.push(embedding)
      }
    }

    return result
  }

  /**
   * 计算动态 Top-K 值
   * k = f(n) = 3 + floor(log₁₀(n + 1))
   * 增长极慢的对数函数，确保初期有足够覆盖，后期不会过度膨胀
   * 无上限，随 Insights 数量对数增长
   */
  private calculateTopK(totalInsights: number): number {
    if (totalInsights === 0) return 3
    
    const k = 3 + Math.floor(Math.log10(totalInsights + 1))
    
    return Math.max(k, 3)  // 最小值保证
  }

  /**
   * 快速相似度检查（纯 Embedding，无 LLM）
   * 返回：skip/add/deprecate/check_conflict
   * 支持 Top-K 检测
   */
  private async quickSimilarityCheck(
    newInsight: ExtractedInsight,
    existingInsights: Insight[]
  ): Promise<{ 
    action: 'skip' | 'add' | 'deprecate' | 'check_conflict'
    conflictWith?: Insight
    topSimilar?: Array<{ insight: Insight; similarity: number }>
  }> {
    const testConfig = getTestConfig ? getTestConfig() : null
    
    // 消融实验：如果禁用相似度检测，直接添加
    if (testConfig && !testConfig.enableSimilarityCheck) {
      console.log(`[Curator] 相似度检测已禁用（消融实验），直接添加`)
      return { action: 'add' }
    }
    
    // 只检查相同类型的insights
    const sameTypeInsights = existingInsights.filter(i => i.type === newInsight.type)

    if (sameTypeInsights.length === 0) {
      return { action: 'add' }
    }

    // 计算动态 Top-K
    const topK = this.calculateTopK(sameTypeInsights.length)

    // 生成新 insight 的 embedding
    const newEmbedding = await this.embedder.encode(newInsight.content)
    
    // 计算所有相似度并排序，找出 Top-K
    const allSimilarities: Array<{ insight: Insight; similarity: number }> = []
    
    for (const insight of sameTypeInsights) {
      if (!insight.embedding) continue
      
      const existingEmbedding = EmbeddingService.fromBuffer(insight.embedding)
      const similarity = EmbeddingService.cosineSimilarity(newEmbedding, existingEmbedding)
      
      allSimilarities.push({ insight, similarity })
    }
    
    // 按相似度降序排序
    allSimilarities.sort((a, b) => b.similarity - a.similarity)
    
    // 优化：只取 >= 0.80 的，且不超过 k 个
    const highSimilar = allSimilarities.filter(s => s.similarity >= 0.80)
    const topSimilar = highSimilar.slice(0, Math.min(highSimilar.length, topK))
    
    // 如果没有 >= 0.80 的，直接添加
    if (topSimilar.length === 0) {
      console.log(`[Curator] 无高相似度项 (<80%)，直接添加`)
      return { action: 'add' }
    }
    
    console.log(`[Curator] 找到 ${highSimilar.length} 个高相似项 (>=80%)，发送 Top-${topSimilar.length} 给 LLM`)
    
    // 相似度 ≥ 0.80 - 需要 LLM 判断是冲突还是重复
    return { action: 'check_conflict', topSimilar }
  }

  /**
   * 批量冲突检测（一次 LLM 调用检测多条）
   * 用于 Embedding 筛选后的候选项
   * 支持 Top-K 检测
   */
  private async batchConflictCheck(
    pendingInsights: Array<{
      extracted: ExtractedInsight
      topSimilar?: Array<{ insight: Insight; similarity: number }>
      needsLLMCheck: boolean
    }>
  ): Promise<Array<{ action: 'skip' | 'deprecate' | 'add'; conflictWith?: Insight }>> {
    if (pendingInsights.length === 0) {
      return []
    }
    
    const testConfig = getTestConfig ? getTestConfig() : null
    
    // 消融实验：如果禁用冲突检测，全部直接添加
    if (testConfig && !testConfig.enableConflictCheck) {
      console.log(`[Curator] 冲突检测已禁用（消融实验），${pendingInsights.length} 条全部添加`)
      return pendingInsights.map(() => ({ action: 'add' as const }))
    }

    // 构建批量检测 prompt（包含 Top-K 相似的）
    const batchPrompt = `
请分析以下 ${pendingInsights.length} 条新知识，判断它们与最相似的已有知识的关系。

${pendingInsights.map((p, idx) => {
  const topSimilar = p.topSimilar || []
  return `
【新知识 ${idx + 1}】
- 类型: ${p.extracted.type}
- 内容: ${p.extracted.content}
- 背景: ${p.extracted.context}
- 重要性: ${p.extracted.importance}

最相似的已有知识（Top-${topSimilar.length}）：
${topSimilar.map((sim, simIdx) => `
  ${simIdx + 1}. [相似度 ${(sim.similarity * 100).toFixed(1)}%]
     内容: ${sim.insight.content}
     背景: ${sim.insight.context}
     重要性: ${sim.insight.importance}
`).join('')}
`
}).join('\n---\n')}

---

对每条新知识，判断它与最相似的已有知识的关系：
1. **冲突**：结论相反或矛盾 → 用新知识替换旧知识
2. **重复**：表达同一个意思 → 跳过新知识
3. **补充**：相关但不同的信息 → 添加新知识

输出JSON数组：
\`\`\`json
[
  {
    "new_index": 1,
    "is_conflict": true/false,
    "is_duplicate": true/false,
    "conflict_with_index": null或数字(1-${(pendingInsights[0]?.topSimilar?.length || 0)}),
    "reason": "简短解释"
  },
  ...
]
\`\`\`

判断规则：
- is_conflict=true → 废弃旧的，用新的替换（因为新的更准确）
- is_duplicate=true → 跳过新的（已有相同知识）
- 两者都false → 添加新的（补充信息）

只输出JSON数组，不要其他文字。`

    try {
      console.log(`[Curator] 发起 1 次 LLM 调用，批量检测 ${pendingInsights.length} 条新知识...`)
      
      // 使用 Curator 模型批量检测（重点：这是一次调用！）
      const response = await this.llmService.generateCurator(
        [{ role: 'user', content: batchPrompt }],
        '你是一个专业的知识分析助手，擅长批量判断知识的冲突性、重复性和补充性。'
      )

      console.log(`[Curator] LLM 批量检测完成，解析结果...`)
      const results = this.parseBatchConflictResultTopK(response, pendingInsights)
      
      // 映射结果
      return pendingInsights.map((_, idx) => {
        const result = results[idx]
        
        if (!result) {
          // 解析失败，默认添加
          console.warn(`[Curator] 批量检测结果缺失 (新知识 ${idx + 1})，默认添加`)
          return { action: 'add' }
        }
        
        // 清晰的日志输出
        const actionText = {
          skip: '跳过（重复）',
          deprecate: '替换旧的（冲突）',
          add: '添加（补充）'
        }[result.action]
        
        console.log(`[Curator] 新${idx + 1}: ${actionText} - ${result.reason}`)
        
        return {
          action: result.action,
          conflictWith: result.conflictWith
        }
      })
    } catch (error) {
      console.error('[Curator] 批量检测失败:', error)
      // 失败时全部添加（保守策略）
      return pendingInsights.map(() => ({ action: 'add' }))
    }
  }

  /**
   * 解析批量冲突检测结果（Top-K 版本）
   */
  private parseBatchConflictResultTopK(
    response: string,
    pendingInsights: Array<{
      extracted: ExtractedInsight
      topSimilar?: Array<{ insight: Insight; similarity: number }>
      needsLLMCheck: boolean
    }>
  ): Array<{
    action: 'skip' | 'deprecate' | 'add'
    conflictWith?: Insight
    reason: string
  }> {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\[([\s\S]*)\]/)
      
      if (!jsonMatch) {
        console.warn('[Curator] 无法提取JSON')
        return []
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const rawResults = JSON.parse(jsonStr.startsWith('[') ? jsonStr : '[' + jsonStr + ']')

      return rawResults.map((r: any, idx: number) => {
        let action: 'skip' | 'deprecate' | 'add' = 'add'
        let conflictWith: Insight | undefined
        
        // 根据 is_conflict 和 is_duplicate 判断 action
        if (r.is_duplicate === true) {
          action = 'skip'
        } else if (r.is_conflict === true) {
          action = 'deprecate'
          
          // 找出要废弃的旧知识
          if (r.conflict_with_index !== null && r.conflict_with_index !== undefined) {
            const topSimilar = pendingInsights[idx]?.topSimilar || []
            const simIndex = r.conflict_with_index - 1  // 转换为 0-based
            
            if (simIndex >= 0 && simIndex < topSimilar.length) {
              conflictWith = topSimilar[simIndex].insight
            }
          }
        } else {
          action = 'add'
        }
        
        return {
          action,
          conflictWith,
          reason: r.reason || ''
        }
      })
    } catch (error) {
      console.error('[Curator] 解析批量检测结果失败:', error)
      return []
    }
  }


  /**
   * 定期清理低质量Insights
   */
  async pruneInsights(conversationId: string): Promise<void> {
    console.log('[Curator] 开始清理低质量insights...')
    
    // 清理低重要性且未使用的insights
    this.db.pruneInsights(conversationId, 0.5)
    
    // 清理已废弃超过30天的insights
    this.db.pruneDeprecatedInsights(conversationId, 30)
    
    console.log('[Curator] Insights清理完成')
  }
}
