/**
 * 对比测试 - 比较不同记忆方案的性能
 */

import { BaselineTest } from './BaselineTest'
import { DialogueManager } from '../main/managers/DialogueManager'
import { metrics } from './MetricsCollector'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../../config'

interface TestCase {
  query: string
  expectedKeywords?: string[]  // 期望的关键词
  description: string
}

// 测试用例集
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

// 关键词命中记录接口
interface KeywordHitRecord {
  testCase: string
  query: string
  expectedKeywords: string[]
  foundKeywords: string[]
  hitRate: number
  response: string
}

export class ComparisonTest {
  private static baselineHits: KeywordHitRecord[] = []
  private static fullMemoryHits: KeywordHitRecord[] = []

  /**
   * 运行对比测试
   */
  static async run() {
    console.log('='.repeat(60))
    console.log('开始对比测试：Baseline vs Full Memory')
    console.log('='.repeat(60))

    // 初始化metrics（从config读取wandb配置）
    await metrics.init({
      project: 'llm-memory-comparison',
      name: `comparison-${new Date().toISOString()}`,
      config: {
        testCases: TEST_CASES.length,
        baselineMaxMessages: 20,
        fullMemoryMaxContext: 80000
      },
      enabled: config.wandb.enabled  // 从配置文件读取
    })

    // 重置命中记录
    this.baselineHits = []
    this.fullMemoryHits = []

    // 测试Baseline
    console.log('\n' + '='.repeat(60))
    console.log('[Baseline] 测试 Baseline（无记忆）')
    console.log('='.repeat(60))
    await this.testBaseline()

    // 重置metrics，准备测试完整版
    const baselineSummary = metrics.getSummary()
    console.log('\n[Baseline] 结果摘要')
    console.log(JSON.stringify(baselineSummary, null, 2))

    // 创建输出目录
    const fs = await import('fs/promises')
    const path = await import('path')
    const outputDir = path.join(process.cwd(), 'test-results', 'comparison')
    await fs.mkdir(outputDir, { recursive: true })

    metrics.reset()

    // 测试完整记忆系统
    console.log('\n' + '='.repeat(60))
    console.log('[Full Memory] 测试 Full Memory（完整记忆系统）')
    console.log('='.repeat(60))
    await this.testFullMemory()

    // 完整版结果
    const fullMemorySummary = metrics.getSummary()
    console.log('\n[Full Memory] 结果摘要')
    console.log(JSON.stringify(fullMemorySummary, null, 2))

    // 生成对比报告（包含命中情况）
    await this.saveComparisonReport(baselineSummary, fullMemorySummary, outputDir)

    // 完成wandb
    await metrics.finish()

    // 对比分析（控制台输出）
    console.log('\n' + '='.repeat(60))
    console.log('[Analysis] 对比分析')
    console.log('='.repeat(60))
    this.printComparison(baselineSummary, fullMemorySummary)
    
    console.log(`\n[Report] 测试报告已保存到: ${outputDir}`)
  }

  /**
   * 测试Baseline
   */
  private static async testBaseline() {
    const baseline = new BaselineTest()
    await baseline.init()

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i]
      console.log(`\n[${i + 1}/${TEST_CASES.length}] ${testCase.description}`)
      console.log(`[User] ${testCase.query}`)

      const response = await baseline.handleMessage(testCase.query)
      console.log(`[AI] ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`)

      // 检查关键词
      if (testCase.expectedKeywords) {
        const found = testCase.expectedKeywords.filter(kw => 
          response.toLowerCase().includes(kw.toLowerCase())
        )
        const hitRate = found.length / testCase.expectedKeywords.length
        console.log(`[Hit] 命中关键词: ${found.length}/${testCase.expectedKeywords.length} (${(hitRate * 100).toFixed(1)}%) - ${found.join(', ')}`)
        
        // 记录命中情况
        this.baselineHits.push({
          testCase: testCase.description,
          query: testCase.query,
          expectedKeywords: testCase.expectedKeywords,
          foundKeywords: found,
          hitRate,
          response
        })
      }

      // 延迟，避免请求过快
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  /**
   * 测试完整记忆系统
   */
  private static async testFullMemory() {
    const conversationId = uuidv4()
    
    // 使用测试数据库路径
    const path = await import('path')
    const testDbPath = path.join(process.cwd(), 'test-results', 'test-memory.db')
    
    // 先创建数据库和conversation记录
    const { DatabaseService } = await import('../main/services/DatabaseService')
    const db = new DatabaseService(testDbPath)
    db.createConversation({
      id: conversationId,
      title: 'Test Conversation',
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
      
      console.log(`[AI] ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`)

      // 检查关键词
      let keywordHits = 0
      if (testCase.expectedKeywords) {
        const found = testCase.expectedKeywords.filter(kw => 
          response.toLowerCase().includes(kw.toLowerCase())
        )
        keywordHits = found.length / testCase.expectedKeywords.length
        console.log(`[Hit] 命中关键词: ${found.length}/${testCase.expectedKeywords.length} (${(keywordHits * 100).toFixed(1)}%) - ${found.join(', ')}`)
        
        // 记录命中情况
        this.fullMemoryHits.push({
          testCase: testCase.description,
          query: testCase.query,
          expectedKeywords: testCase.expectedKeywords,
          foundKeywords: found,
          hitRate: keywordHits,
          response
        })
      }

      // 从数据库读取当前状态
      const allMessages = db.getMessages(conversationId)
      const allInsights = db.getInsights(conversationId)
      const summary = db.getSummary(conversationId)
      
      // 估算 token 数量（粗略估算：中文约1.5字符/token，英文约4字符/token）
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
        recent: activeInsights.filter(i => (now - i.created_at) <= 7 * 86400000).length,
        medium: activeInsights.filter(i => (now - i.created_at) > 7 * 86400000 && (now - i.created_at) <= 30 * 86400000).length,
        old: activeInsights.filter(i => (now - i.created_at) > 30 * 86400000 && (now - i.created_at) <= 90 * 86400000).length,
        ancient: activeInsights.filter(i => (now - i.created_at) > 90 * 86400000).length
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
        queryId: `test-${i + 1}`,
        userQuery: testCase.query,
        responseLength: response.length,
        insightsUsed: dialogue.lastInsightsUsedCount,
        insightsRelevance: [], // 暂时为空，因为没有详细的相关性分数
        contextSize: contextTokens,
        summaryUsed: summary?.summary ? true : false
      })

      // 延迟，避免请求过快（优化后可以缩短到2秒）
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // 最后统计总的 insights 数量
    const finalInsights = db.getInsights(conversationId)
    console.log(`\n[Stats] 最终统计: ${finalInsights.filter(i => i.is_deprecated === 0).length} 条活跃 Insights`)
  }

  /**
   * 保存对比报告（Markdown 格式）
   */
  private static async saveComparisonReport(baseline: any, fullMemory: any, outputDir: string) {
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    
    let report = ''
    report += '# 对比测试报告：Baseline vs Full Memory\n\n'
    report += `**生成时间**：${now}\n\n`
    report += '---\n\n'
    
    // 测试概况
    report += '## 测试概况\n\n'
    report += `- **测试用例数**：${TEST_CASES.length} 个\n`
    report += `- **Baseline**：无记忆系统（仅简单滑动窗口）\n`
    report += `- **Full Memory**：完整记忆系统（滑动窗口 + 对话摘要 + Insights）\n\n`
    
    // 性能对比
    report += '## 性能对比\n\n'
    const baselineDuration = baseline.performance.avgDuration
    const fullMemoryDuration = fullMemory.performance.avgDuration
    const durationDiff = ((baselineDuration - fullMemoryDuration) / baselineDuration * 100)
    
    report += '| 指标 | Baseline | Full Memory | 提升 |\n'
    report += '|------|----------|-------------|------|\n'
    report += `| 平均响应时间 | ${baselineDuration.toFixed(2)} ms (${(baselineDuration / 1000).toFixed(2)}s) | ${fullMemoryDuration.toFixed(2)} ms (${(fullMemoryDuration / 1000).toFixed(2)}s) | `
    
    if (durationDiff > 0) {
      report += `快了 ${durationDiff.toFixed(1)}% |\n\n`
    } else {
      report += `慢了 ${Math.abs(durationDiff).toFixed(1)}% |\n\n`
    }
    
    // 对话质量对比
    report += '## 对话质量对比\n\n'
    const baselineLength = baseline.quality.avgResponseLength
    const fullMemoryLength = fullMemory.quality.avgResponseLength
    const lengthDiff = ((baselineLength - fullMemoryLength) / baselineLength * 100)
    
    const baselineContext = baseline.quality.avgContextSize
    const fullMemoryContext = fullMemory.quality.avgContextSize
    const contextDiff = ((baselineContext - fullMemoryContext) / baselineContext * 100)
    
    report += '| 指标 | Baseline | Full Memory | 对比 |\n'
    report += '|------|----------|-------------|------|\n'
    report += `| 平均回复长度 | ${baselineLength.toFixed(0)} 字符 | ${fullMemoryLength.toFixed(0)} 字符 | `
    if (lengthDiff > 0) {
      report += `更简洁 (-${lengthDiff.toFixed(1)}%) |\n`
    } else {
      report += `更详细 (+${Math.abs(lengthDiff).toFixed(1)}%) |\n`
    }
    
    report += `| 平均 Insights 使用 | 0 条 | ${fullMemory.quality.avgInsightsUsed.toFixed(1)} 条 | - |\n`
    report += `| 平均上下文大小 | ${baselineContext.toFixed(0)} tokens | ${fullMemoryContext.toFixed(0)} tokens | `
    
    if (contextDiff > 0) {
      report += `节省 ${contextDiff.toFixed(1)}% |\n\n`
    } else {
      report += `增加 ${Math.abs(contextDiff).toFixed(1)}% |\n\n`
    }
    
    // 记忆能力对比
    report += '## 记忆能力对比\n\n'
    report += `- **Baseline**：0 条 Insights（无长期记忆）\n`
    report += `- **Full Memory**：${fullMemory.memory?.latestInsights || 0} 条活跃 Insights\n\n`
    
    if (fullMemory.memory?.latestByType && Object.keys(fullMemory.memory.latestByType).length > 0) {
      report += '### Insights 类型分布\n\n'
      report += '| 类型 | 数量 |\n'
      report += '|------|------|\n'
      for (const [type, count] of Object.entries(fullMemory.memory.latestByType)) {
        report += `| ${type} | ${count} |\n`
      }
      report += '\n'
    }
    
    // 关键词命中情况
    report += '## 记忆召回测试\n\n'
    report += `**记忆测试用例**：${this.baselineHits.length} 个\n\n`
    report += `测试 Baseline 和 Full Memory 能否准确回忆之前对话中的关键信息\n\n`
    
    // 综合命中率
    const baselineAvgHit = this.baselineHits.length > 0 
      ? this.baselineHits.reduce((sum, h) => sum + h.hitRate, 0) / this.baselineHits.length 
      : 0
    const fullMemoryAvgHit = this.fullMemoryHits.length > 0 
      ? this.fullMemoryHits.reduce((sum, h) => sum + h.hitRate, 0) / this.fullMemoryHits.length 
      : 0
      
    report += '### 综合命中率对比\n\n'
    report += '| 系统 | 平均命中率 |\n'
    report += '|------|------------|\n'
    report += `| Baseline | ${(baselineAvgHit * 100).toFixed(1)}% |\n`
    report += `| Full Memory | ${(fullMemoryAvgHit * 100).toFixed(1)}% |\n\n`
    
    // 详细命中情况
    report += '### 详细命中情况\n\n'
    for (let i = 0; i < this.baselineHits.length; i++) {
      const baselineHit = this.baselineHits[i]
      const fullMemoryHit = this.fullMemoryHits[i]
      
      report += `#### 测试 ${i + 1}：${baselineHit.testCase}\n\n`
      report += `**用户查询**：${baselineHit.query}\n\n`
      report += `**期望关键词**：${baselineHit.expectedKeywords.join(', ')}\n\n`
      
      report += '| 系统 | 命中关键词 | 命中率 |\n'
      report += '|------|------------|--------|\n'
      report += `| Baseline | ${baselineHit.foundKeywords.join(', ') || '无'} | ${(baselineHit.hitRate * 100).toFixed(1)}% |\n`
      report += `| Full Memory | ${fullMemoryHit.foundKeywords.join(', ') || '无'} | ${(fullMemoryHit.hitRate * 100).toFixed(1)}% |\n\n`
      
      report += '**Baseline 回复摘要**：\n\n'
      report += `${baselineHit.response.substring(0, 300)}${baselineHit.response.length > 300 ? '...' : ''}\n\n`
      
      report += '**Full Memory 回复摘要**：\n\n'
      report += `${fullMemoryHit.response.substring(0, 300)}${fullMemoryHit.response.length > 300 ? '...' : ''}\n\n`
    }
    
    // 总结
    report += '## 总结\n\n'
    
    const improvements: string[] = []
    if (durationDiff > 0) improvements.push(`响应速度提升 ${durationDiff.toFixed(1)}%`)
    if (fullMemory.memory?.latestInsights > 0) improvements.push(`建立了 ${fullMemory.memory.latestInsights} 条长期记忆`)
    if (fullMemory.quality.avgInsightsUsed > 0) improvements.push(`平均每次使用 ${fullMemory.quality.avgInsightsUsed.toFixed(1)} 条知识`)
    if (contextDiff > 0) improvements.push(`上下文使用更高效（节省 ${contextDiff.toFixed(1)}%）`)
    if (fullMemoryAvgHit > baselineAvgHit) improvements.push(`记忆召回率提升 ${((fullMemoryAvgHit - baselineAvgHit) * 100).toFixed(1)}%`)
    
    if (improvements.length > 0) {
      report += '### Full Memory 系统优势\n\n'
      improvements.forEach(imp => {
        report += `- ${imp}\n`
      })
      report += '\n'
    }
    
    report += '---\n'
    
    const fs = await import('fs/promises')
    const path = await import('path')
    await fs.writeFile(path.join(outputDir, 'comparison.md'), report, 'utf-8')
    console.log(`[Report] 对比报告已保存到: ${path.join(outputDir, 'comparison.md')}`)
  }
  
  /**
   * 打印对比结果（控制台输出）
   */
  private static printComparison(baseline: any, fullMemory: any) {
    console.log('\n性能对比:')
    console.log(`  Baseline平均响应时间: ${baseline.performance.avgDuration.toFixed(2)}ms`)
    console.log(`  Full Memory平均响应时间: ${fullMemory.performance.avgDuration.toFixed(2)}ms`)
    
    console.log('\n对话质量对比:')
    console.log(`  Baseline平均回复长度: ${baseline.quality.avgResponseLength.toFixed(0)}字符`)
    console.log(`  Full Memory平均回复长度: ${fullMemory.quality.avgResponseLength.toFixed(0)}字符`)
    console.log(`  Full Memory平均使用Insights: ${fullMemory.quality.avgInsightsUsed.toFixed(1)}条`)
    console.log(`  Full Memory平均上下文大小: ${fullMemory.quality.avgContextSize.toFixed(0)} tokens`)
    
    console.log('\n记忆能力对比:')
    console.log(`  Baseline: 无记忆系统，仅简单滑动窗口`)
    console.log(`  Full Memory: ${fullMemory.memory?.latestInsights || 0}条Insights`)
  }
}
