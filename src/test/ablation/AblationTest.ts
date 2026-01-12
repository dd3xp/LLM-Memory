/**
 * 消融实验 - 验证各模块的作用
 */

import { DialogueManager } from '../../main/managers/DialogueManager'
import { metrics } from '../MetricsCollector'
import { v4 as uuidv4 } from 'uuid'
import { ABLATION_CONFIGS, setTestConfig, resetTestConfig, TestConfig, ABLATION_MAX_CONTEXT_TOKENS } from '../TestConfig'

interface TestCase {
  query: string
  expectedKeywords?: string[]
  description: string
  phase: 'establish' | 'fill' | 'test'
}

// 三阶段测试用例（50轮：5建立 + 40填充 + 5测试）
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

  // ========== 阶段2：填充对话，挤出早期信息 (40轮) ==========
  // --- 第1-10轮：编程技术问题 ---
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

  // --- 第11-20轮：日常闲聊（完全无关） ---
  {
    query: "今天天气怎么样？",
    description: "填充对话 - 天气",
    phase: 'fill'
  },
  {
    query: "给我讲个笑话吧",
    description: "填充对话 - 笑话",
    phase: 'fill'
  },
  {
    query: "推荐一部好看的电影",
    description: "填充对话 - 电影推荐",
    phase: 'fill'
  },
  {
    query: "最近有什么好听的歌吗？",
    description: "填充对话 - 音乐推荐",
    phase: 'fill'
  },
  {
    query: "帮我翻译一下：Hello, how are you?",
    description: "填充对话 - 翻译",
    phase: 'fill'
  },
  {
    query: "1+1等于几？",
    description: "填充对话 - 简单数学",
    phase: 'fill'
  },
  {
    query: "帮我写一首关于春天的诗",
    description: "填充对话 - 写诗",
    phase: 'fill'
  },
  {
    query: "世界上最高的山是什么？",
    description: "填充对话 - 地理知识",
    phase: 'fill'
  },
  {
    query: "水的沸点是多少度？",
    description: "填充对话 - 物理知识",
    phase: 'fill'
  },
  {
    query: "太阳系有几颗行星？",
    description: "填充对话 - 天文知识",
    phase: 'fill'
  },

  // --- 第21-30轮：杂项问题 ---
  {
    query: "什么是量子力学？",
    description: "填充对话 - 量子力学",
    phase: 'fill'
  },
  {
    query: "解释一下区块链是什么",
    description: "填充对话 - 区块链",
    phase: 'fill'
  },
  {
    query: "人工智能和机器学习有什么区别？",
    description: "填充对话 - AI概念",
    phase: 'fill'
  },
  {
    query: "什么是元宇宙？",
    description: "填充对话 - 元宇宙",
    phase: 'fill'
  },
  {
    query: "5G和4G有什么区别？",
    description: "填充对话 - 5G",
    phase: 'fill'
  },
  {
    query: "什么是云计算？",
    description: "填充对话 - 云计算",
    phase: 'fill'
  },
  {
    query: "大数据是什么意思？",
    description: "填充对话 - 大数据",
    phase: 'fill'
  },
  {
    query: "什么是物联网？",
    description: "填充对话 - 物联网",
    phase: 'fill'
  },
  {
    query: "VR和AR有什么区别？",
    description: "填充对话 - VR/AR",
    phase: 'fill'
  },
  {
    query: "什么是边缘计算？",
    description: "填充对话 - 边缘计算",
    phase: 'fill'
  },

  // --- 第31-40轮：生活娱乐问题 ---
  {
    query: "怎么做一杯咖啡？",
    description: "填充对话 - 咖啡制作",
    phase: 'fill'
  },
  {
    query: "推荐一些健康的早餐",
    description: "填充对话 - 早餐推荐",
    phase: 'fill'
  },
  {
    query: "怎么保持身体健康？",
    description: "填充对话 - 健康建议",
    phase: 'fill'
  },
  {
    query: "有什么好的读书习惯吗？",
    description: "填充对话 - 读书习惯",
    phase: 'fill'
  },
  {
    query: "怎么提高睡眠质量？",
    description: "填充对话 - 睡眠建议",
    phase: 'fill'
  },
  {
    query: "推荐一些室内运动",
    description: "填充对话 - 室内运动",
    phase: 'fill'
  },
  {
    query: "怎么学习一门新语言？",
    description: "填充对话 - 语言学习",
    phase: 'fill'
  },
  {
    query: "有什么好的时间管理方法？",
    description: "填充对话 - 时间管理",
    phase: 'fill'
  },
  {
    query: "怎么减少压力？",
    description: "填充对话 - 压力管理",
    phase: 'fill'
  },
  {
    query: "推荐一些适合周末的活动",
    description: "填充对话 - 周末活动",
    phase: 'fill'
  },

  // ========== 阶段3：记忆测试 (5轮) ==========
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
  private static logBuffer: string[] = []
  private static testDbPaths: string[] = []
  private static wandbUrls: string[] = []

  /**
   * 捕获日志
   */
  private static log(message: string) {
    console.log(message)
    this.logBuffer.push(message)
  }

  /**
   * 运行所有消融实验
   */
  static async run() {
    // 重置
    this.logBuffer = []
    this.testDbPaths = []
    this.wandbUrls = []

    this.log('='.repeat(80))
    this.log('[Ablation] 开始消融实验（3个配置 x 50轮测试）')
    this.log('='.repeat(80))
    this.log(`测试配置:`)
    this.log(`  - 测试用例数: ${TEST_CASES.length} 轮`)
    this.log(`  - 阶段1 (建立信息): ${TEST_CASES.filter(t => t.phase === 'establish').length} 轮`)
    this.log(`  - 阶段2 (填充对话): ${TEST_CASES.filter(t => t.phase === 'fill').length} 轮`)
    this.log(`  - 阶段3 (记忆测试): ${TEST_CASES.filter(t => t.phase === 'test').length} 轮`)
    this.log(`  - 实验配置: ${ABLATION_CONFIGS.map(c => c.name).join(', ')}`)
    this.log('='.repeat(80))

    // 创建输出目录
    const fs = await import('fs/promises')
    const path = await import('path')
    const outputDir = path.join(process.cwd(), 'test-results', 'ablation')
    await fs.mkdir(outputDir, { recursive: true })

    const results: Array<{ config: TestConfig; summary: any; keywordHits: KeywordHitRecord[] }> = []

    // 运行每个实验配置
    for (const config of ABLATION_CONFIGS) {
      this.log('\n' + '='.repeat(80))
      this.log(`[Experiment] ${config.name}`)
      this.log('='.repeat(80))
      this.log(`配置:`)
      this.log(`  - Insights提取: ${config.enableInsightExtraction ? '启用' : '禁用'}`)
      this.log(`  - Insights检索: ${config.enableInsightRetrieval ? '启用' : '禁用'}`)
      this.log(`  - 对话摘要: ${config.enableSummary ? '启用' : '禁用'}`)
      this.log(`  - 相似度检测: ${config.enableSimilarityCheck ? '启用' : '禁用'}`)
      this.log(`  - 冲突检测: ${config.enableConflictCheck ? '启用' : '禁用'}`)
      if (config.maxContextTokens) {
        this.log(`  - 上下文 Token上限: ${config.maxContextTokens}`)
      }

      // 设置测试配置
      setTestConfig(config)

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

      // 完成 wandb 并获取链接
      const wandbUrl = await metrics.finish()
      if (typeof wandbUrl === 'string' && wandbUrl) {
        this.wandbUrls.push(wandbUrl)
      }

      // 重置 metrics
      metrics.reset()

      // 延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // 生成综合对比报告
    await this.generateComparisonReport(results, outputDir)

    // 重置配置
    resetTestConfig()

    // 保存日志
    await fs.writeFile(path.join(outputDir, 'log.txt'), this.logBuffer.join('\n'), 'utf-8')
    this.log(`\n[Log] 日志已保存到: ${path.join(outputDir, 'log.txt')}`)

    // 保存 wandb 链接
    const wandbContent = this.wandbUrls.length > 0 
      ? this.wandbUrls.join('\n') 
      : 'https://wandb.ai (请手动填写实际链接)'
    await fs.writeFile(path.join(outputDir, 'wandb.txt'), wandbContent, 'utf-8')

    // 删除临时数据库
    for (const dbPath of this.testDbPaths) {
      try {
        await fs.unlink(dbPath)
        this.log(`[Cleanup] 已删除临时数据库: ${dbPath}`)
      } catch {
        // 忽略删除失败
      }
    }

    this.log('\n' + '='.repeat(80))
    this.log('[Ablation] 所有消融实验完成！')
    this.log(`[Report] 测试报告已保存到: ${outputDir}`)
    this.log('='.repeat(80))
  }

  /**
   * 使用指定配置运行测试
   */
  private static async testWithConfig(config: TestConfig): Promise<KeywordHitRecord[]> {
    const conversationId = uuidv4()
    const keywordHits: KeywordHitRecord[] = []

    // 使用测试数据库路径
    const path = await import('path')
    const testDbPath = path.join(process.cwd(), 'test-results', `ablation-${config.name}.db`)
    this.testDbPaths.push(testDbPath)

    // 先创建数据库和conversation记录
    const { DatabaseService } = await import('../../main/services/DatabaseService')
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
      const phaseLabel = { establish: '建立', fill: '填充', test: '测试' }[testCase.phase]
      this.log(`\n[${i + 1}/${TEST_CASES.length}] [${phaseLabel}] ${testCase.description}`)
      this.log(`[User] ${testCase.query}`)

      // 记录开始时间
      const startTime = Date.now()

      const response = await dialogue.handleMessage(testCase.query)

      // 计算耗时
      const duration = Date.now() - startTime

      this.log(`[AI] ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`)

      // 检查关键词
      if (testCase.expectedKeywords) {
        const found = testCase.expectedKeywords.filter(kw =>
          response.toLowerCase().includes(kw.toLowerCase())
        )
        const hitRate = found.length / testCase.expectedKeywords.length
        this.log(`[Hit] 命中关键词: ${found.length}/${testCase.expectedKeywords.length} (${(hitRate * 100).toFixed(1)}%) - ${found.join(', ')}`)
        
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
    this.log(`\n[Stats] 实验统计: ${finalInsights.length} 条活跃 Insights`)
    
    return keywordHits
  }

  /**
   * 生成综合对比报告
   */
  private static async generateComparisonReport(
    results: Array<{ config: TestConfig; summary: any; keywordHits: KeywordHitRecord[] }>,
    outputDir: string
  ) {
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

    let report = ''
    report += '# 消融实验综合对比报告\n\n'
    report += `**生成时间**：${now}\n\n`
    report += '---\n\n'

    report += '## 实验概况\n\n'
    report += `- **测试用例数**：${TEST_CASES.length} 轮\n`
    report += `  - 阶段1 (建立信息): ${TEST_CASES.filter(t => t.phase === 'establish').length} 轮\n`
    report += `  - 阶段2 (填充对话): ${TEST_CASES.filter(t => t.phase === 'fill').length} 轮\n`
    report += `  - 阶段3 (记忆测试): ${TEST_CASES.filter(t => t.phase === 'test').length} 轮\n`
    report += `- **实验配置数**：${results.length} 个\n`
    report += `- **maxContextTokens**：${ABLATION_MAX_CONTEXT_TOKENS} tokens（所有配置相同）\n`
    report += `- **评估维度**：记忆召回率、Insights数量、Summary触发\n\n`

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

    // 总命中率统计
    report += '## 记忆召回总命中率\n\n'
    report += '| 实验名称 | 总命中关键词 | 总期望关键词 | 总命中率 |\n'
    report += '|----------|--------------|--------------|----------|\n'
    
    for (const result of results) {
      const totalHit = result.keywordHits.reduce((sum, h) => sum + h.foundKeywords.length, 0)
      const totalExpected = result.keywordHits.reduce((sum, h) => sum + h.expectedKeywords.length, 0)
      const totalRate = totalExpected > 0 ? totalHit / totalExpected : 0
      report += `| ${result.config.name} | ${totalHit} | ${totalExpected} | **${(totalRate * 100).toFixed(1)}%** |\n`
    }
    report += '\n'
    
    // 计算与 Full-System 的差异
    const fullSystemResult = results.find(r => r.config.name === 'Full-System')
    if (fullSystemResult) {
      const fullSystemTotalHit = fullSystemResult.keywordHits.reduce((sum, h) => sum + h.foundKeywords.length, 0)
      const fullSystemTotalExpected = fullSystemResult.keywordHits.reduce((sum, h) => sum + h.expectedKeywords.length, 0)
      const fullSystemRate = fullSystemTotalExpected > 0 ? fullSystemTotalHit / fullSystemTotalExpected : 0
      
      report += '**与 Full-System 基准对比**：\n\n'
      for (const result of results) {
        if (result.config.name === 'Full-System') continue
        const totalHit = result.keywordHits.reduce((sum, h) => sum + h.foundKeywords.length, 0)
        const totalExpected = result.keywordHits.reduce((sum, h) => sum + h.expectedKeywords.length, 0)
        const totalRate = totalExpected > 0 ? totalHit / totalExpected : 0
        const diff = totalRate - fullSystemRate
        const diffStr = diff > 0 ? `+${(diff * 100).toFixed(1)}%` : `${(diff * 100).toFixed(1)}%`
        report += `- ${result.config.name}: ${diffStr}\n`
      }
      report += '\n'
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

      // No-Insights
      const noInsights = results.find(r => r.config.name === 'No-Insights')
      if (noInsights) {
        const insights = noInsights.summary.memory?.latestInsights || 0
        const hitRate = noInsights.keywordHits.length > 0 
          ? (noInsights.keywordHits.reduce((sum, h) => sum + h.hitRate, 0) / noInsights.keywordHits.length * 100).toFixed(1)
          : '0.0'
        report += `#### 禁用 Insights（只保留 Summary）\n\n`
        report += `- **Insights 数量**：${baselineInsights} → ${insights} 条\n`
        report += `- **记忆召回率**：${baselineHitRate}% → ${hitRate}%\n`
        report += `- **差异**：${(parseFloat(hitRate) - parseFloat(baselineHitRate)).toFixed(1)}%\n`
        report += `- **结论**：${parseFloat(hitRate) < parseFloat(baselineHitRate) - 10 ? 'Insights 对记忆有显著贡献' : 'Summary 也能保持一定记忆'}\n\n`
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
    const reportPath = path.join(outputDir, 'result.md')
    await fs.writeFile(reportPath, report, 'utf-8')
    this.log(`[Report] 综合对比报告已保存到: ${reportPath}`)
  }
}
