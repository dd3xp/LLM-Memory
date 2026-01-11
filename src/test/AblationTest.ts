/**
 * 消融实验 - 验证各模块的作用
 */

import { DialogueManager } from '../main/managers/DialogueManager'
import { metrics } from './MetricsCollector'
import { v4 as uuidv4 } from 'uuid'
import { ABLATION_CONFIGS, setAblationConfig, resetAblationConfig, AblationConfig } from './AblationConfig'

interface TestCase {
  query: string
  expectedKeywords?: string[]
  description: string
}

// 使用相同的测试用例
const TEST_CASES: TestCase[] = [
  {
    query: "你好，我是一个程序员，主要做Python开发",
    description: "自我介绍 - 建立基本信息"
  },
  {
    query: "我最近在学习TypeScript，遇到了类型推导的问题",
    description: "技术问题 - 第一次提到TS"
  },
  {
    query: "我特别喜欢用async/await处理异步操作",
    description: "偏好信息 - 编程习惯"
  },
  {
    query: "你还记得我是做什么的吗？",
    expectedKeywords: ["程序员", "Python"],
    description: "记忆测试 - 回忆基本信息"
  },
  {
    query: "我之前提到的TypeScript问题，你能详细说说类型推导吗？",
    expectedKeywords: ["TypeScript", "类型推导"],
    description: "记忆测试 - 回忆技术话题"
  },
  {
    query: "除了Python，我现在还在用Node.js做后端开发",
    description: "信息更新 - 新增技能"
  },
  {
    query: "我刚才说我用什么来处理异步操作的？",
    expectedKeywords: ["async", "await"],
    description: "记忆测试 - 回忆编程习惯"
  },
  {
    query: "总结一下你对我的了解",
    expectedKeywords: ["程序员", "Python", "TypeScript", "async/await", "Node.js"],
    description: "综合记忆测试 - 全面回忆"
  }
]

// 关键词命中记录
interface KeywordHitRecord {
  testCase: string
  query: string
  expectedKeywords: string[]
  foundKeywords: string[]
  hitRate: number
  response: string
}

export class AblationTest {
  /**
   * 运行所有消融实验
   */
  static async run() {
    console.log('='.repeat(80))
    console.log('[Ablation] 开始消融实验（简化版：3个关键实验）')
    console.log('='.repeat(80))

    // 创建输出目录
    const fs = await import('fs/promises')
    const path = await import('path')
    const outputDir = path.join(process.cwd(), 'test-results', 'ablation')
    await fs.mkdir(outputDir, { recursive: true })

    const results: Array<{ config: AblationConfig; summary: any; keywordHits: KeywordHitRecord[] }> = []

    // 运行每个实验配置
    for (const config of ABLATION_CONFIGS) {
      console.log('\n' + '='.repeat(80))
      console.log(`[Experiment] ${config.name}`)
      console.log('='.repeat(80))
      console.log(`配置:`)
      console.log(`  - Insights提取: ${config.enableInsightExtraction ? '启用' : '禁用'}`)
      console.log(`  - Insights检索: ${config.enableInsightRetrieval ? '启用' : '禁用'}`)
      console.log(`  - 对话摘要: ${config.enableSummary ? '启用' : '禁用'}`)
      console.log(`  - 相似度检测: ${config.enableSimilarityCheck ? '启用' : '禁用'}`)
      console.log(`  - 冲突检测: ${config.enableConflictCheck ? '启用' : '禁用'}`)
      if (config.maxInsightsTokens) {
        console.log(`  - Insights Token上限: ${config.maxInsightsTokens}`)
      }
      if (config.maxContextTokens) {
        console.log(`  - 上下文 Token上限: ${config.maxContextTokens}`)
      }

      // 设置消融配置
      setAblationConfig(config)

      // 初始化 metrics
      await metrics.init({
        project: 'llm-memory-ablation',
        name: config.name,
        config: {
          ...config,
          test_cases: TEST_CASES.length
        },
        enabled: true
      })

      // 运行测试
      const keywordHits = await this.testWithConfig(config)

      // 获取结果
      const summary = metrics.getSummary()
      results.push({ config, summary, keywordHits })

      // 完成 wandb
      await metrics.finish()

      // 重置 metrics
      metrics.reset()

      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // 生成综合对比报告
    await this.generateComparisonReport(results, outputDir)

    // 重置配置
    resetAblationConfig()

    console.log('\n' + '='.repeat(80))
    console.log('[Ablation] 所有消融实验完成！')
    console.log(`[Report] 测试报告已保存到: ${outputDir}`)
    console.log('='.repeat(80))
  }

  /**
   * 使用指定配置运行测试
   */
  private static async testWithConfig(config: AblationConfig): Promise<KeywordHitRecord[]> {
    const conversationId = uuidv4()
    const keywordHits: KeywordHitRecord[] = []

    // 使用测试数据库路径
    const path = await import('path')
    const testDbPath = path.join(process.cwd(), 'test-results', `ablation-${config.name}.db`)

    // 先创建数据库和conversation记录
    const { DatabaseService } = await import('../main/services/DatabaseService')
    const db = new DatabaseService(testDbPath)
    db.createConversation({
      id: conversationId,
      title: `Ablation Test: ${config.name}`,
      type: 'qa'
    })

    const dialogue = new DialogueManager(conversationId, testDbPath)

    // 加载空的消息历史
    await dialogue.loadMessages([])

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i]
      console.log(`\n[${i + 1}/${TEST_CASES.length}] ${testCase.description}`)
      console.log(`[User] ${testCase.query}`)

      // 记录开始时间
      const startTime = Date.now()

      const response = await dialogue.handleMessage(testCase.query)

      // 计算耗时
      const duration = Date.now() - startTime

      console.log(`[AI] ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`)

      // 检查关键词
      if (testCase.expectedKeywords) {
        const found = testCase.expectedKeywords.filter(kw =>
          response.toLowerCase().includes(kw.toLowerCase())
        )
        const hitRate = found.length / testCase.expectedKeywords.length
        console.log(`[Hit] 命中关键词: ${found.length}/${testCase.expectedKeywords.length} (${(hitRate * 100).toFixed(1)}%) - ${found.join(', ')}`)
        
        // 记录命中情况
        keywordHits.push({
          testCase: testCase.description,
          query: testCase.query,
          expectedKeywords: testCase.expectedKeywords,
          foundKeywords: found,
          hitRate,
          response
        })
      }

      // 从数据库读取当前状态
      const allMessages = db.getMessages(conversationId)
      const allInsights = db.getInsights(conversationId)
      const summary = db.getSummary(conversationId)

      // 估算 token 数量
      const estimateTokens = (text: string) => {
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
        const otherChars = text.length - chineseChars
        return Math.ceil(chineseChars / 1.5 + otherChars / 4)
      }

      const contextTokens = allMessages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0) +
        (summary?.tokens || 0)

      // 记录性能指标
      metrics.recordPerformance({
        timestamp: Date.now(),
        operation: 'chat',
        duration,
        tokensUsed: estimateTokens(testCase.query) + estimateTokens(response),
        success: true
      })

      // 统计 insights 类型分布
      const insightsByType = {
        strategy: allInsights.filter(i => i.type === 'strategy' && i.is_deprecated === 0).length,
        code: allInsights.filter(i => i.type === 'code' && i.is_deprecated === 0).length,
        decision: allInsights.filter(i => i.type === 'decision' && i.is_deprecated === 0).length,
        concept: allInsights.filter(i => i.type === 'concept' && i.is_deprecated === 0).length,
        method: allInsights.filter(i => i.type === 'method' && i.is_deprecated === 0).length
      }

      // 统计 insights 年龄分布
      const now = Date.now()
      const activeInsights = allInsights.filter(i => i.is_deprecated === 0)
      const insightsByAge = {
        recent: activeInsights.filter(i => now - i.created_at < 7 * 24 * 60 * 60 * 1000).length,
        medium: activeInsights.filter(i => {
          const age = now - i.created_at
          return age >= 7 * 24 * 60 * 60 * 1000 && age < 30 * 24 * 60 * 60 * 1000
        }).length,
        old: activeInsights.filter(i => {
          const age = now - i.created_at
          return age >= 30 * 24 * 60 * 60 * 1000 && age < 90 * 24 * 60 * 60 * 1000
        }).length,
        ancient: activeInsights.filter(i => now - i.created_at >= 90 * 24 * 60 * 60 * 1000).length
      }

      // 记录记忆指标
      metrics.recordMemory({
        timestamp: Date.now(),
        totalInsights: activeInsights.length,
        insightsByType,
        insightsByAge,
        avgImportance: activeInsights.length > 0
          ? activeInsights.reduce((sum, i) => sum + i.importance, 0) / activeInsights.length
          : 0,
        avgReuseCount: activeInsights.length > 0
          ? activeInsights.reduce((sum, i) => sum + i.reuse_count, 0) / activeInsights.length
          : 0,
        deprecatedCount: allInsights.filter(i => i.is_deprecated === 1).length
      })

      // 记录质量指标
      metrics.recordQuality({
        timestamp: Date.now(),
        queryId: `q${i + 1}`,
        userQuery: testCase.query,
        responseLength: response.length,
        insightsUsed: dialogue.lastInsightsUsedCount,
        insightsRelevance: [],
        contextSize: contextTokens,
        summaryUsed: !!summary
      })

      // 延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // 获取最终的 Insights 数量
    const finalInsights = db.getInsights(conversationId).filter(i => i.is_deprecated === 0)
    console.log(`\n[Stats] 实验统计: ${finalInsights.length} 条活跃 Insights`)
    
    return keywordHits
  }

  /**
   * 生成综合对比报告
   */
  private static async generateComparisonReport(
    results: Array<{ config: AblationConfig; summary: any; keywordHits: KeywordHitRecord[] }>,
    outputDir: string
  ) {
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

    let report = ''
    report += '# 消融实验综合对比报告\n\n'
    report += `**生成时间**：${now}\n\n`
    report += '---\n\n'

    report += '## 实验概况\n\n'
    report += `- **测试用例数**：${TEST_CASES.length} 个\n`
    report += `- **实验配置数**：${results.length} 个\n`
    report += `- **评估维度**：性能、记忆能力、对话质量\n\n`

    // 性能对比表
    report += '## 性能对比\n\n'
    report += '| 实验名称 | 平均响应时间 (s) | 成功率 |\n'
    report += '|---------|-----------------|--------|\n'
    for (const { config, summary } of results) {
      const avgDuration = (summary.performance.avgDuration / 1000).toFixed(2)
      const successRate = (summary.performance.successRate * 100).toFixed(1)
      report += `| ${config.name} | ${avgDuration} | ${successRate}% |\n`
    }
    report += '\n'

    // 记忆能力对比表
    report += '## 记忆能力对比\n\n'
    report += '| 实验名称 | Insights 数量 | 平均重要性 | 平均复用次数 |\n'
    report += '|---------|--------------|-----------|-------------|\n'
    for (const { config, summary } of results) {
      const insights = summary.memory?.latestInsights || 0
      const avgImp = summary.memory?.avgImportance?.toFixed(2) || '0.00'
      const avgReuse = summary.memory?.avgReuseCount?.toFixed(2) || '0.00'
      report += `| ${config.name} | ${insights} | ${avgImp} | ${avgReuse} |\n`
    }
    report += '\n'

    // 对话质量对比表
    report += '## 对话质量对比\n\n'
    report += '| 实验名称 | 平均回复长度 | 平均使用 Insights | 平均上下文大小 (tokens) |\n'
    report += '|---------|-------------|------------------|------------------------|\n'
    for (const { config, summary } of results) {
      const avgLength = summary.quality.avgResponseLength.toFixed(0)
      const avgInsights = summary.quality.avgInsightsUsed.toFixed(1)
      const avgContext = summary.quality.avgContextSize.toFixed(0)
      report += `| ${config.name} | ${avgLength} | ${avgInsights} | ${avgContext} |\n`
    }
    report += '\n'

    // 记忆召回测试（关键词命中率）
    report += '## 记忆召回测试\n\n'
    report += '| 实验名称 | 总命中率 | 测试详情 |\n'
    report += '|---------|---------|----------|\n'
    for (const { config, keywordHits } of results) {
      const totalHits = keywordHits.reduce((sum, h) => sum + h.hitRate, 0)
      const avgHitRate = keywordHits.length > 0 ? (totalHits / keywordHits.length * 100).toFixed(1) : '0.0'
      const hitDetails = keywordHits.map(h => 
        `${h.foundKeywords.length}/${h.expectedKeywords.length}`
      ).join(', ')
      report += `| ${config.name} | ${avgHitRate}% | ${hitDetails || 'N/A'} |\n`
    }
    report += '\n'
    
    // 详细命中情况
    const memoryTestCases = TEST_CASES.filter(tc => tc.expectedKeywords)
    if (memoryTestCases.length > 0) {
      report += '### 详细命中情况\n\n'
      
      for (let i = 0; i < memoryTestCases.length; i++) {
        const tc = memoryTestCases[i]
        report += `#### 测试 ${i + 1}：${tc.description}\n\n`
        report += `**用户查询**：${tc.query}\n\n`
        report += `**期望关键词**：${tc.expectedKeywords?.join(', ')}\n\n`
        report += '| 实验名称 | 命中关键词 | 命中率 |\n'
        report += '|---------|------------|--------|\n'
        
        for (const result of results) {
          const hit = result.keywordHits.find(h => h.testCase === tc.description)
          if (hit) {
            const hitRate = (hit.hitRate * 100).toFixed(0)
            const hitStr = hit.foundKeywords.length > 0 
              ? hit.foundKeywords.join(', ')
              : '无'
            report += `| ${result.config.name} | ${hitStr} | ${hitRate}% |\n`
          } else {
            report += `| ${result.config.name} | N/A | N/A |\n`
          }
        }
        report += '\n'
        
        // 添加各实验的回复摘要
        report += '**各实验回复摘要**：\n\n'
        for (const result of results) {
          const hit = result.keywordHits.find(h => h.testCase === tc.description)
          if (hit) {
            report += `- **${result.config.name}**：${hit.response.substring(0, 200)}${hit.response.length > 200 ? '...' : ''}\n\n`
          }
        }
      }
    }

    // 关键发现
    report += '## 关键发现\n\n'

    // 找到基准（Full-System）
    const baseline = results.find(r => r.config.name === 'Full-System')
    if (baseline) {
      const baselineInsights = baseline.summary.memory?.latestInsights || 0
      const baselineContext = baseline.summary.quality.avgContextSize.toFixed(0)
      const baselineHitRate = baseline.keywordHits.length > 0 
        ? (baseline.keywordHits.reduce((sum, h) => sum + h.hitRate, 0) / baseline.keywordHits.length * 100).toFixed(1)
        : '0.0'

      report += '### 各模块的影响\n\n'

      // No-Cheatsheet
      const noCheatsheet = results.find(r => r.config.name === 'No-Cheatsheet')
      if (noCheatsheet) {
        const insights = noCheatsheet.summary.memory?.latestInsights || 0
        const hitRate = noCheatsheet.keywordHits.length > 0 
          ? (noCheatsheet.keywordHits.reduce((sum, h) => sum + h.hitRate, 0) / noCheatsheet.keywordHits.length * 100).toFixed(1)
          : '0.0'
        report += `#### 禁用 Dynamic Cheatsheet (Insights)\n\n`
        report += `- **Insights 数量**：${baselineInsights} → ${insights} 条 （完全没有知识积累）\n`
        report += `- **记忆召回率**：${baselineHitRate}% → ${hitRate}% （${(parseFloat(hitRate) - parseFloat(baselineHitRate)).toFixed(1)}%）\n`
        report += `- **平均使用 Insights**：${baseline.summary.quality.avgInsightsUsed.toFixed(1)} → ${noCheatsheet.summary.quality.avgInsightsUsed.toFixed(1)} 条\n`
        report += `- **结论**：${parseFloat(hitRate) < 50 ? '❌ 记忆能力严重退化' : '⚠️ 仍有部分记忆（来自滑动窗口）'}\n\n`
      }

      // No-Summary
      const noSummary = results.find(r => r.config.name === 'No-Summary')
      if (noSummary) {
        const avgContext = noSummary.summary.quality.avgContextSize.toFixed(0)
        const contextIncrease = ((parseFloat(avgContext) - parseFloat(baselineContext)) / parseFloat(baselineContext) * 100).toFixed(1)
        const noSummaryHitRate = noSummary.keywordHits.length > 0 
          ? (noSummary.keywordHits.reduce((sum, h) => sum + h.hitRate, 0) / noSummary.keywordHits.length * 100).toFixed(1)
          : '0.0'
        
        report += `#### 禁用对话摘要 (Conversation Summary)\n\n`
        report += `- **平均上下文大小**：${baselineContext} → ${avgContext} tokens （+${contextIncrease}%）\n`
        report += `- **Insights 数量**：${baselineInsights} → ${noSummary.summary.memory?.latestInsights || 0} 条\n`
        report += `- **记忆召回率**：${baselineHitRate}% → ${noSummaryHitRate}% （${(parseFloat(noSummaryHitRate) - parseFloat(baselineHitRate)).toFixed(1)}%）\n`
        
        if (parseFloat(avgContext) > parseFloat(baselineContext) * 1.5) {
          report += `- **结论**：上下文显著膨胀（+${contextIncrease}%），长对话会耗尽上下文限制\n\n`
        } else {
          report += `- **结论**：影响较小（测试轮次不够触发摘要生成）\n\n`
        }
      }
    }

    report += '\n---\n'

    const fs = await import('fs/promises')
    const path = await import('path')
    const reportPath = path.join(outputDir, 'ablation.md')
    await fs.writeFile(reportPath, report, 'utf-8')
    console.log(`[Report] 综合对比报告已保存到: ${reportPath}`)
  }
}
