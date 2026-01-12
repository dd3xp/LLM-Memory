/**
 * 对比测试 - 比较不同记忆方案的性能
 */

import { BaselineTest } from './BaselineTest'
import { DialogueManager } from '../../main/managers/DialogueManager'
import { metrics } from '../MetricsCollector'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../../../config'
import { setTestConfig, resetTestConfig, COMPARISON_MAX_CONTEXT_TOKENS } from '../TestConfig'

interface TestCase {
  query: string
  expectedKeywords?: string[]  // 期望的关键词
  description: string
  phase: 'establish' | 'fill' | 'test'  // 测试阶段
}

// 测试配置：使用 TestConfig 中的共享常量
const TEST_CONFIG = {
  maxContextTokens: COMPARISON_MAX_CONTEXT_TOKENS,  // 从 TestConfig 导入
}

// 三阶段测试用例设计
// 阶段1 (establish): 建立用户核心信息
// 阶段2 (fill): 填充对话，把早期信息挤出滑动窗口
// 阶段3 (test): 记忆测试，验证能否回忆早期信息
const TEST_CASES: TestCase[] = [
  // ========== 阶段1：建立核心信息 (5轮) ==========
  {
    query: "你好，我叫张三，是一名Python后端开发工程师，在北京工作",
    description: "建立身份信息",
    phase: 'establish'
  },
  {
    query: "我最近在做一个电商项目，使用的是FastAPI框架",
    description: "建立项目信息",
    phase: 'establish'
  },
  {
    query: "我特别喜欢用async/await处理异步，觉得比回调清晰多了",
    description: "建立技术偏好",
    phase: 'establish'
  },
  {
    query: "我们团队用的是PostgreSQL数据库，配合SQLAlchemy ORM",
    description: "建立技术栈",
    phase: 'establish'
  },
  {
    query: "我个人比较喜欢函数式编程风格，尽量避免类继承",
    description: "建立编程风格",
    phase: 'establish'
  },

  // ========== 阶段2：填充对话，挤出早期信息 (10轮) ==========
  {
    query: "帮我写一个快速排序算法",
    description: "填充对话 - 快速排序",
    phase: 'fill'
  },
  {
    query: "解释一下什么是闭包",
    description: "填充对话 - 闭包概念",
    phase: 'fill'
  },
  {
    query: "Python的GIL是什么？有什么影响？",
    description: "填充对话 - GIL",
    phase: 'fill'
  },
  {
    query: "帮我写一个单例模式的实现",
    description: "填充对话 - 单例模式",
    phase: 'fill'
  },
  {
    query: "什么是依赖注入？有什么好处？",
    description: "填充对话 - 依赖注入",
    phase: 'fill'
  },
  {
    query: "解释一下REST和GraphQL的区别",
    description: "填充对话 - API风格",
    phase: 'fill'
  },
  {
    query: "Docker和虚拟机有什么区别？",
    description: "填充对话 - 容器技术",
    phase: 'fill'
  },
  {
    query: "帮我写一个二分查找算法",
    description: "填充对话 - 二分查找",
    phase: 'fill'
  },
  {
    query: "什么是CAP定理？",
    description: "填充对话 - 分布式理论",
    phase: 'fill'
  },
  {
    query: "解释一下SOLID原则",
    description: "填充对话 - 设计原则",
    phase: 'fill'
  },

  // ========== 阶段3：记忆测试 (5轮) ==========
  // 此时阶段1的信息应该已被 Baseline 挤出窗口！
  {
    query: "你还记得我叫什么名字吗？我在哪个城市工作？",
    expectedKeywords: ["张三", "北京"],
    description: "记忆测试 - 身份信息",
    phase: 'test'
  },
  {
    query: "我之前说我在做什么项目？用的什么框架？",
    expectedKeywords: ["电商", "FastAPI"],
    description: "记忆测试 - 项目信息",
    phase: 'test'
  },
  {
    query: "我说过我喜欢用什么方式处理异步操作？",
    expectedKeywords: ["async", "await"],
    description: "记忆测试 - 技术偏好",
    phase: 'test'
  },
  {
    query: "我们团队用的是什么数据库和ORM？",
    expectedKeywords: ["PostgreSQL", "SQLAlchemy"],
    description: "记忆测试 - 技术栈",
    phase: 'test'
  },
  {
    query: "总结一下你对我的了解，包括我的名字、工作地点、项目、技术栈和编程偏好",
    expectedKeywords: ["张三", "北京", "Python", "电商", "FastAPI", "PostgreSQL", "async"],
    description: "综合记忆测试",
    phase: 'test'
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
  private static logBuffer: string[] = []
  private static testDbPath: string = ''

  /**
   * 捕获日志
   */
  private static log(message: string) {
    console.log(message)
    this.logBuffer.push(message)
  }

  /**
   * 运行对比测试
   */
  static async run() {
    // 重置日志缓冲
    this.logBuffer = []
    
    this.log('='.repeat(60))
    this.log('开始对比测试：Baseline vs Full Memory')
    this.log('='.repeat(60))
    this.log(`测试配置:`)
    this.log(`  - 测试用例数: ${TEST_CASES.length} 轮`)
    this.log(`  - 阶段1 (建立信息): ${TEST_CASES.filter(t => t.phase === 'establish').length} 轮`)
    this.log(`  - 阶段2 (填充对话): ${TEST_CASES.filter(t => t.phase === 'fill').length} 轮`)
    this.log(`  - 阶段3 (记忆测试): ${TEST_CASES.filter(t => t.phase === 'test').length} 轮`)
    this.log(`  - maxContextTokens: ${TEST_CONFIG.maxContextTokens} (两边相同)`)
    this.log('='.repeat(60))

    // 重置命中记录
    this.baselineHits = []
    this.fullMemoryHits = []

    // 创建输出目录
    const fs = await import('fs/promises')
    const path = await import('path')
    const outputDir = path.join(process.cwd(), 'test-results', 'comparison')
    await fs.mkdir(outputDir, { recursive: true })

    // 保存 wandb 链接
    const wandbUrls: string[] = []

    // ========== Baseline 测试 ==========
    // 初始化 Baseline 的 wandb run
    await metrics.init({
      project: 'llm-memory-comparison',
      name: `Baseline-${new Date().toISOString()}`,
      config: {
        testCases: TEST_CASES.length,
        maxContextTokens: TEST_CONFIG.maxContextTokens,
        system: 'Baseline'
      },
      enabled: config.wandb.enabled
    })

    this.log('\n' + '='.repeat(60))
    this.log('[Baseline] 测试 Baseline（无记忆）')
    this.log('='.repeat(60))
    await this.testBaseline()

    // 获取 Baseline 结果并结束 wandb run
    const baselineSummary = metrics.getSummary()
    this.log('\n[Baseline] 结果摘要')
    this.log(JSON.stringify(baselineSummary, null, 2))

    const baselineWandbUrl = await metrics.finish()
    if (typeof baselineWandbUrl === 'string' && baselineWandbUrl) {
      wandbUrls.push(baselineWandbUrl)
    }
    metrics.reset()

    // ========== Full Memory 测试 ==========
    // 初始化 Full Memory 的 wandb run
    await metrics.init({
      project: 'llm-memory-comparison',
      name: `FullMemory-${new Date().toISOString()}`,
      config: {
        testCases: TEST_CASES.length,
        maxContextTokens: TEST_CONFIG.maxContextTokens,
        system: 'FullMemory'
      },
      enabled: config.wandb.enabled
    })

    this.log('\n' + '='.repeat(60))
    this.log('[Full Memory] 测试 Full Memory（完整记忆系统）')
    this.log('='.repeat(60))
    await this.testFullMemory()

    // 完整版结果
    const fullMemorySummary = metrics.getSummary()
    this.log('\n[Full Memory] 结果摘要')
    this.log(JSON.stringify(fullMemorySummary, null, 2))

    // 完成 Full Memory 的 wandb run
    const fullMemoryWandbUrl = await metrics.finish()
    if (typeof fullMemoryWandbUrl === 'string' && fullMemoryWandbUrl) {
      wandbUrls.push(fullMemoryWandbUrl)
    }
    metrics.reset()

    // 生成对比报告
    await this.saveComparisonReport(baselineSummary, fullMemorySummary, outputDir)

    // 对比分析
    this.log('\n' + '='.repeat(60))
    this.log('[Analysis] 对比分析')
    this.log('='.repeat(60))
    this.printComparison(baselineSummary, fullMemorySummary)

    // 保存日志
    await fs.writeFile(path.join(outputDir, 'log.txt'), this.logBuffer.join('\n'), 'utf-8')
    this.log(`\n[Log] 日志已保存到: ${path.join(outputDir, 'log.txt')}`)

    // 保存 wandb 链接（两个独立的 runs）
    const wandbContent = wandbUrls.length > 0 
      ? wandbUrls.join('\n') 
      : 'https://wandb.ai (请手动填写实际链接)'
    await fs.writeFile(path.join(outputDir, 'wandb.txt'), wandbContent, 'utf-8')

    // 删除临时数据库
    if (this.testDbPath) {
      try {
        await fs.unlink(this.testDbPath)
        this.log(`[Cleanup] 已删除临时数据库: ${this.testDbPath}`)
      } catch {
        // 忽略删除失败
      }
    }
    
    this.log(`\n[Report] 测试报告已保存到: ${outputDir}`)
  }

  /**
   * 测试Baseline（使用相同的 token 限制，但没有 Summary 和 Insights）
   */
  private static async testBaseline() {
    const baseline = new BaselineTest(TEST_CONFIG.maxContextTokens)
    await baseline.init()

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i]
      const phaseLabel = { establish: '建立', fill: '填充', test: '测试' }[testCase.phase]
      this.log(`\n[${i + 1}/${TEST_CASES.length}] [${phaseLabel}] ${testCase.description}`)
      this.log(`[User] ${testCase.query}`)

      const response = await baseline.handleMessage(testCase.query)
      this.log(`[AI] ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`)

      // 检查关键词
      if (testCase.expectedKeywords) {
        const found = testCase.expectedKeywords.filter(kw => 
          response.toLowerCase().includes(kw.toLowerCase())
        )
        const hitRate = found.length / testCase.expectedKeywords.length
        this.log(`[Hit] 命中关键词: ${found.length}/${testCase.expectedKeywords.length} (${(hitRate * 100).toFixed(1)}%) - ${found.join(', ')}`)
        
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
   * 测试完整记忆系统（使用相同的 token 限制，但有 Summary 和 Insights）
   */
  private static async testFullMemory() {
    const conversationId = uuidv4()
    
    // 设置测试配置，使用与 Baseline 相同的 token 限制
    setTestConfig({
      name: 'ComparisonTest-FullMemory',
      enableInsightExtraction: true,
      enableInsightRetrieval: true,
      enableSummary: true,
      enableSimilarityCheck: true,
      enableConflictCheck: true,
      maxContextTokens: TEST_CONFIG.maxContextTokens  // 与 Baseline 相同
    })
    
    // 使用测试数据库路径
    const path = await import('path')
    this.testDbPath = path.join(process.cwd(), 'test-results', 'comparison-test.db')
    
    // 先创建数据库和conversation记录
    const { DatabaseService } = await import('../../main/services/DatabaseService')
    const db = new DatabaseService(this.testDbPath)
    db.createConversation({
      id: conversationId,
      title: 'Test Conversation',
      type: 'qa'
    })
    
    const dialogue = new DialogueManager(conversationId, this.testDbPath)
    
    // 加载空的消息历史
    await dialogue.loadMessages([])

    for (let i = 0; i < TEST_CASES.length; i++) {
      const testCase = TEST_CASES[i]
      const phaseLabel = { establish: '建立', fill: '填充', test: '测试' }[testCase.phase]
      this.log(`\n[${i + 1}/${TEST_CASES.length}] [${phaseLabel}] ${testCase.description}`)
      this.log(`[User] ${testCase.query}`)

      // 记录开始时间
      const startTime = Date.now()
      
      const response = await dialogue.handleMessage(testCase.query)
      
      // 计算耗时
      const duration = Date.now() - startTime
      
      this.log(`[AI] ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`)

      // 检查关键词
      let keywordHits = 0
      if (testCase.expectedKeywords) {
        const found = testCase.expectedKeywords.filter(kw => 
          response.toLowerCase().includes(kw.toLowerCase())
        )
        keywordHits = found.length / testCase.expectedKeywords.length
        this.log(`[Hit] 命中关键词: ${found.length}/${testCase.expectedKeywords.length} (${(keywordHits * 100).toFixed(1)}%) - ${found.join(', ')}`)
        
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
      const allInsights = db.getInsights(conversationId)
      const summary = db.getSummary(conversationId)
      
      // 估算 token 数量（用于计算 tokensUsed）
      const estimateTokens = (text: string) => {
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
        const otherChars = text.length - chineseChars
        return Math.ceil(chineseChars / 1.5 + otherChars / 4)
      }
      
      // 使用 DialogueManager 记录的实际发送给 LLM 的 context token 数
      const contextTokens = dialogue.lastContextTokens

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
    const summaryData = db.getSummary(conversationId)
    this.log(`\n[Stats] 最终统计:`)
    this.log(`  - 活跃 Insights: ${finalInsights.filter(i => i.is_deprecated === 0).length} 条`)
    this.log(`  - Summary: ${summaryData.tokens > 0 ? `${summaryData.tokens} tokens` : '未生成'}`)
    
    // 重置测试配置
    resetTestConfig()
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
    report += `- **测试用例数**：${TEST_CASES.length} 轮\n`
    report += `  - 阶段1 (建立信息): ${TEST_CASES.filter(t => t.phase === 'establish').length} 轮\n`
    report += `  - 阶段2 (填充对话): ${TEST_CASES.filter(t => t.phase === 'fill').length} 轮\n`
    report += `  - 阶段3 (记忆测试): ${TEST_CASES.filter(t => t.phase === 'test').length} 轮\n`
    report += `- **maxContextTokens**：${TEST_CONFIG.maxContextTokens} tokens（两边相同）\n`
    report += `- **Baseline**：Token滑动窗口（无 Summary、无 Insights）\n`
    report += `- **Full Memory**：Token滑动窗口 + Summary + Insights\n\n`
    
    report += '### 测试设计说明\n\n'
    report += '本测试采用三阶段设计：\n'
    report += '1. **建立阶段**：建立用户核心信息（姓名、工作、技术栈等）\n'
    report += '2. **填充阶段**：大量普通对话，将早期信息挤出滑动窗口\n'
    report += '3. **测试阶段**：询问早期信息，验证长期记忆能力\n\n'
    report += '预期结果：Baseline 在阶段3 会忘记阶段1的信息（被挤出窗口），而 Full Memory 通过 Insights 和 Summary 仍能记住。\n\n'
    
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
    
    // 总命中率统计
    report += '## 记忆召回总命中率\n\n'
    report += '| 系统 | 总命中关键词 | 总期望关键词 | 总命中率 |\n'
    report += '|------|--------------|--------------|----------|\n'
    
    const baselineTotalHit = this.baselineHits.reduce((sum, h) => sum + h.foundKeywords.length, 0)
    const baselineTotalExpected = this.baselineHits.reduce((sum, h) => sum + h.expectedKeywords.length, 0)
    const baselineTotalRate = baselineTotalExpected > 0 ? baselineTotalHit / baselineTotalExpected : 0
    
    const fullMemoryTotalHit = this.fullMemoryHits.reduce((sum, h) => sum + h.foundKeywords.length, 0)
    const fullMemoryTotalExpected = this.fullMemoryHits.reduce((sum, h) => sum + h.expectedKeywords.length, 0)
    const fullMemoryTotalRate = fullMemoryTotalExpected > 0 ? fullMemoryTotalHit / fullMemoryTotalExpected : 0
    
    report += `| Baseline | ${baselineTotalHit} | ${baselineTotalExpected} | **${(baselineTotalRate * 100).toFixed(1)}%** |\n`
    report += `| Full Memory | ${fullMemoryTotalHit} | ${fullMemoryTotalExpected} | **${(fullMemoryTotalRate * 100).toFixed(1)}%** |\n\n`
    
    const hitImprovement = fullMemoryTotalRate - baselineTotalRate
    if (hitImprovement > 0) {
      report += `> Full Memory 相比 Baseline 命中率提升了 **${(hitImprovement * 100).toFixed(1)}%**\n\n`
    } else if (hitImprovement < 0) {
      report += `> Full Memory 相比 Baseline 命中率下降了 **${(Math.abs(hitImprovement) * 100).toFixed(1)}%**\n\n`
    } else {
      report += `> 两者命中率相同\n\n`
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
    await fs.writeFile(path.join(outputDir, 'result.md'), report, 'utf-8')
    this.log(`[Report] 对比报告已保存到: ${path.join(outputDir, 'result.md')}`)
  }
  
  /**
   * 打印对比结果（控制台输出）
   */
  private static printComparison(baseline: any, fullMemory: any) {
    this.log('\n性能对比:')
    this.log(`  Baseline平均响应时间: ${baseline.performance.avgDuration.toFixed(2)}ms`)
    this.log(`  Full Memory平均响应时间: ${fullMemory.performance.avgDuration.toFixed(2)}ms`)
    
    this.log('\n对话质量对比:')
    this.log(`  Baseline平均回复长度: ${baseline.quality.avgResponseLength.toFixed(0)}字符`)
    this.log(`  Full Memory平均回复长度: ${fullMemory.quality.avgResponseLength.toFixed(0)}字符`)
    this.log(`  Full Memory平均使用Insights: ${fullMemory.quality.avgInsightsUsed.toFixed(1)}条`)
    this.log(`  Full Memory平均上下文大小: ${fullMemory.quality.avgContextSize.toFixed(0)} tokens`)
    
    this.log('\n记忆能力对比:')
    this.log(`  Baseline: 无记忆系统，仅简单滑动窗口`)
    this.log(`  Full Memory: ${fullMemory.memory?.latestInsights || 0}条Insights`)
  }
}
