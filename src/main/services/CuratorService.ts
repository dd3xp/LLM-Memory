/**
 * Curator Service - 知识策展服务
 * 实现 Dynamic Cheatsheet 论文的 Curator Module
 * 负责从对话中提取可复用的知识（策略、代码、决策等）
 */

import { LLMService } from './LLMService'
import { DatabaseService, Insight } from './DatabaseService'
import { EmbeddingService } from './EmbeddingService'
import { v4 as uuidv4 } from 'uuid'

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

  constructor() {
    this.llmService = new LLMService()
    this.db = new DatabaseService()
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
        console.log('[Curator] ℹ️ 对话中没有可提取的知识，跳过')
        return []
      }

      // 检查提取质量：如果所有insights的重要性都很低，说明对话质量不高
      const avgImportance = extractedInsights.reduce((sum, i) => sum + i.importance, 0) / extractedInsights.length
      if (avgImportance < 0.6) {
        console.log(`[Curator] ℹ️ 提取的知识质量较低（平均重要性: ${avgImportance.toFixed(2)}），跳过`)
        return []
      }

      // 获取已存在的insights用于去重和冲突检测
      const existingInsights = this.db.getInsights(conversationId)

      // 转换为Insight对象，并进行去重和冲突检测
      const insights: Insight[] = []
      const now = Date.now()

      for (const extracted of extractedInsights) {
        // 只处理重要性 > 0.5 的insights
        if (extracted.importance <= 0.5) {
          continue
        }

        // 检查相似度和冲突
        const checkResult = await this.checkSimilarityAndConflict(
          extracted,
          existingInsights
        )

        if (checkResult.action === 'skip') {
          console.log(`[Curator] ⏭️ 跳过重复insight: ${extracted.content.substring(0, 30)}...`)
          continue
        }

        if (checkResult.action === 'deprecate') {
          // 标记旧的为已废弃
          console.log(`[Curator] 🔄 发现冲突，废弃旧insight: ${checkResult.conflictWith?.content.substring(0, 30)}...`)
          if (checkResult.conflictWith) {
            this.db.deprecateInsight(checkResult.conflictWith.id)
          }
        }

        // 生成embedding向量
        const embeddingVec = await this.embedder.encode(extracted.content)
        const embedding = EmbeddingService.toBuffer(embeddingVec)

        // 添加新insight
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
      }

      if (insights.length === 0) {
        console.log('[Curator] ℹ️ 提取的知识都已存在或质量不足，未添加新insights')
      } else {
        console.log(`[Curator] ✅ 提取了 ${insights.length} 条高质量Insights（去重后）`)
      }
      
      return insights
    } catch (error) {
      console.error('[Curator] ❌ 提取Insights失败:', error)
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
4. **重要**：如果对话内容是：
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
    maxCount: number = 5,
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

    const now = Date.now()
    const scoredInsights: ScoredInsight[] = []

    for (const insight of allInsights) {
      // 如果insight没有embedding（旧数据），跳过或使用降级方案
      if (!insight.embedding) {
        console.warn(`[Curator] Insight ${insight.id} 缺少embedding，跳过`)
        continue
      }

      // 计算语义相似度
      const insightEmbedding = EmbeddingService.fromBuffer(insight.embedding)
      const similarity = EmbeddingService.cosineSimilarity(queryEmbedding, insightEmbedding)

      // 计算时效性分数
      const timeScore = this.calculateTimeScore(insight.last_used, now)

      // 综合得分 = 语义相似度(50%) + 重要性(30%) + 时效性(20%)
      const score = similarity * 0.5 + insight.importance * 0.3 + timeScore * 0.2

      scoredInsights.push({ insight, score, similarity })
    }

    // 按综合得分排序
    const sorted = scoredInsights.sort((a, b) => b.score - a.score)

    // 逐条添加，直到达到数量或token限制
    const relevant: Insight[] = []
    let totalTokens = 0

    for (const item of sorted) {
      const insight = item.insight

      // 达到数量上限
      if (relevant.length >= maxCount) {
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

      console.log(`[Curator] 🔍 找到 ${relevant.length} 条相关Insights (平均相似度: ${(avgSimilarity * 100).toFixed(1)}%)${tokenCounter ? `, 共 ${totalTokens} tokens` : ''}`)
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

      return `[${typeLabel}] ${insight.content}\n背景: ${insight.context}`
    }).join('\n\n')

    return `# 可复用知识库\n以下是之前积累的可复用知识：\n\n${formatted}\n\n---\n`
  }

  /**
   * 计算时效性分数（0-1）
   * 最近使用的得分高，超过30天线性衰减
   */
  private calculateTimeScore(lastUsed: number, now: number): number {
    const daysSinceLastUse = (now - lastUsed) / 86400000 // 转换为天数
    
    if (daysSinceLastUse <= 7) {
      // 7天内：满分
      return 1.0
    } else if (daysSinceLastUse <= 30) {
      // 7-30天：线性衰减 1.0 -> 0.5
      return 1.0 - ((daysSinceLastUse - 7) / 23) * 0.5
    } else if (daysSinceLastUse <= 90) {
      // 30-90天：继续衰减 0.5 -> 0.2
      return 0.5 - ((daysSinceLastUse - 30) / 60) * 0.3
    } else {
      // 90天以上：最低分
      return 0.2
    }
  }

  /**
   * 检查相似度和冲突
   * 返回：skip（跳过重复）、deprecate（废弃旧的）、add（直接添加）
   */
  private async checkSimilarityAndConflict(
    newInsight: ExtractedInsight,
    existingInsights: Insight[]
  ): Promise<{ action: 'skip' | 'deprecate' | 'add'; conflictWith?: Insight }> {
    // 只检查相同类型的insights
    const sameTypeInsights = existingInsights.filter(i => i.type === newInsight.type)

    if (sameTypeInsights.length === 0) {
      return { action: 'add' }
    }

    // 构建批量检测prompt
    const checkPrompt = `
请分析以下新知识与已有知识的关系：

【新知识】
类型: ${newInsight.type}
内容: ${newInsight.content}
背景: ${newInsight.context}

【已有知识】
${sameTypeInsights.map((insight, idx) => `
${idx + 1}. 内容: ${insight.content}
   背景: ${insight.context}
   重要性: ${insight.importance}
`).join('\n')}

---

请判断：
1. 新知识是否与某条已有知识**高度相似**（表达同一个意思）？
2. 新知识是否与某条已有知识**冲突矛盾**（结论相反）？

输出JSON格式：
\`\`\`json
{
  "is_similar": true/false,
  "similar_to_index": 数字或null,
  "is_conflict": true/false,
  "conflict_with_index": 数字或null,
  "reason": "简短解释"
}
\`\`\`

只输出JSON，不要其他文字。`

    try {
      // 使用Curator模型进行相似度和冲突检测
      const response = await this.llmService.generateCurator(
        [{ role: 'user', content: checkPrompt }],
        '你是一个专业的知识分析助手，擅长判断知识的相似性和冲突性。'
      )

      const result = this.parseCheckResult(response)

      if (result.is_similar && result.similar_to_index !== null) {
        const similarInsight = sameTypeInsights[result.similar_to_index - 1]
        console.log(`[Curator] 📋 发现相似insight: ${result.reason}`)
        
        // 如果新的重要性更高，废弃旧的；否则跳过
        if (newInsight.importance > similarInsight.importance) {
          return { action: 'deprecate', conflictWith: similarInsight }
        } else {
          return { action: 'skip' }
        }
      }

      if (result.is_conflict && result.conflict_with_index !== null) {
        const conflictInsight = sameTypeInsights[result.conflict_with_index - 1]
        console.log(`[Curator] ⚠️ 发现冲突insight: ${result.reason}`)
        
        // 新知识优先（假设新的更准确），废弃旧的
        return { action: 'deprecate', conflictWith: conflictInsight }
      }

      return { action: 'add' }
    } catch (error) {
      console.error('[Curator] 检测相似度/冲突失败:', error)
      // 失败时默认添加
      return { action: 'add' }
    }
  }

  /**
   * 解析相似度/冲突检测结果
   */
  private parseCheckResult(response: string): {
    is_similar: boolean
    similar_to_index: number | null
    is_conflict: boolean
    conflict_with_index: number | null
    reason: string
  } {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/)
      
      if (!jsonMatch) {
        return {
          is_similar: false,
          similar_to_index: null,
          is_conflict: false,
          conflict_with_index: null,
          reason: 'Parse failed'
        }
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0]
      return JSON.parse(jsonStr)
    } catch (error) {
      console.error('[Curator] 解析检测结果失败:', error)
      return {
        is_similar: false,
        similar_to_index: null,
        is_conflict: false,
        conflict_with_index: null,
        reason: 'Parse error'
      }
    }
  }

  /**
   * 定期清理低质量Insights
   */
  async pruneInsights(conversationId: string): Promise<void> {
    console.log('[Curator] 🧹 开始清理低质量insights...')
    
    // 清理低重要性且未使用的insights
    this.db.pruneInsights(conversationId, 0.5)
    
    // 清理已废弃超过30天的insights
    this.db.pruneDeprecatedInsights(conversationId, 30)
    
    console.log('[Curator] ✅ Insights清理完成')
  }
}
