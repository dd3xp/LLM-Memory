/**
 * 指标收集器
 * 用于收集和记录性能、记忆、质量等指标
 */

import wandb from '@wandb/sdk'
import { config } from '../../config'

// 性能指标
export interface PerformanceMetric {
  timestamp: number
  operation: 'chat' | 'extraction' | 'retrieval' | 'summary' | 'embedding'
  duration: number  // 毫秒
  tokensUsed?: number
  success: boolean
  error?: string
}

// 记忆指标
export interface MemoryMetric {
  timestamp: number
  totalInsights: number
  insightsByType: {
    strategy: number
    code: number
    decision: number
    concept: number
    method: number
  }
  insightsByAge: {
    'recent': number      // 0-7天
    'medium': number      // 7-30天
    'old': number         // 30-90天
    'ancient': number     // 90天+
  }
  avgImportance: number
  avgReuseCount: number
  deprecatedCount: number
}

// 对话质量指标
export interface QualityMetric {
  timestamp: number
  queryId: string
  userQuery: string
  responseLength: number
  insightsUsed: number
  insightsRelevance: number[]  // 每个insight的相关性分数
  contextSize: number  // 上下文token数
  summaryUsed: boolean
}

// 检索指标
export interface RetrievalMetric {
  timestamp: number
  query: string
  insightsRetrieved: number
  avgSimilarity: number
  retrievalTime: number
  insightsUsedIds: string[]
}

export class MetricsCollector {
  private performance: PerformanceMetric[] = []
  private memory: MemoryMetric[] = []
  private quality: QualityMetric[] = []
  private retrieval: RetrievalMetric[] = []
  
  private wandbRun: any = null
  private enabled: boolean = false

  /**
   * 初始化wandb
   */
  async init(initConfig: {
    project: string
    name?: string
    config?: Record<string, any>
    enabled?: boolean
  }) {
    this.enabled = initConfig.enabled ?? config.wandb.enabled
    
    if (!this.enabled) {
      console.log('[Metrics] Wandb disabled, metrics will be collected locally only')
      return
    }

    try {
      // 设置 API Key 到环境变量（官方推荐方式）
      process.env.WANDB_API_KEY = config.wandb.apiKey
      
      this.wandbRun = await wandb.init({
        project: initConfig.project,
        name: initConfig.name,
        config: initConfig.config
      })
      console.log('[Metrics] Wandb initialized successfully')
    } catch (error) {
      console.error('[Metrics] Failed to initialize wandb:', error)
      this.enabled = false
    }
  }

  /**
   * 记录性能指标
   */
  recordPerformance(metric: PerformanceMetric) {
    this.performance.push(metric)
    
    if (this.enabled && this.wandbRun) {
      wandb.log({
        [`${metric.operation}_duration`]: metric.duration,
        [`${metric.operation}_success`]: metric.success ? 1 : 0,
        [`${metric.operation}_tokens`]: metric.tokensUsed || 0,
        timestamp: metric.timestamp
      })
    }
  }

  /**
   * 记录记忆指标
   */
  recordMemory(metric: MemoryMetric) {
    this.memory.push(metric)
    
    if (this.enabled && this.wandbRun) {
      wandb.log({
        'memory/total_insights': metric.totalInsights,
        'memory/strategy_count': metric.insightsByType.strategy,
        'memory/code_count': metric.insightsByType.code,
        'memory/decision_count': metric.insightsByType.decision,
        'memory/concept_count': metric.insightsByType.concept,
        'memory/method_count': metric.insightsByType.method,
        'memory/recent_count': metric.insightsByAge.recent,
        'memory/medium_count': metric.insightsByAge.medium,
        'memory/old_count': metric.insightsByAge.old,
        'memory/ancient_count': metric.insightsByAge.ancient,
        'memory/avg_importance': metric.avgImportance,
        'memory/avg_reuse': metric.avgReuseCount,
        'memory/deprecated_count': metric.deprecatedCount,
        timestamp: metric.timestamp
      })
    }
  }

  /**
   * 记录质量指标
   */
  recordQuality(metric: QualityMetric) {
    this.quality.push(metric)
    
    if (this.enabled && this.wandbRun) {
      const avgRelevance = metric.insightsRelevance.length > 0
        ? metric.insightsRelevance.reduce((a, b) => a + b, 0) / metric.insightsRelevance.length
        : 0

      wandb.log({
        'quality/response_length': metric.responseLength,
        'quality/insights_used': metric.insightsUsed,
        'quality/avg_relevance': avgRelevance,
        'quality/context_size': metric.contextSize,
        'quality/summary_used': metric.summaryUsed ? 1 : 0,
        timestamp: metric.timestamp
      })
    }
  }

  /**
   * 记录检索指标
   */
  recordRetrieval(metric: RetrievalMetric) {
    this.retrieval.push(metric)
    
    if (this.enabled && this.wandbRun) {
      wandb.log({
        'retrieval/count': metric.insightsRetrieved,
        'retrieval/avg_similarity': metric.avgSimilarity,
        'retrieval/time': metric.retrievalTime,
        timestamp: metric.timestamp
      })
    }
  }

  /**
   * 获取统计摘要
   */
  getSummary() {
    const perfSummary = {
      totalOperations: this.performance.length,
      avgDuration: this.performance.reduce((sum, m) => sum + m.duration, 0) / this.performance.length,
      successRate: this.performance.filter(m => m.success).length / this.performance.length,
      byOperation: {} as Record<string, any>
    }

    // 按操作类型统计
    const operations = ['chat', 'extraction', 'retrieval', 'summary', 'embedding'] as const
    operations.forEach(op => {
      const metrics = this.performance.filter(m => m.operation === op)
      if (metrics.length > 0) {
        perfSummary.byOperation[op] = {
          count: metrics.length,
          avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
          successRate: metrics.filter(m => m.success).length / metrics.length
        }
      }
    })

    const memorySummary = this.memory.length > 0 ? {
      totalSnapshots: this.memory.length,
      latestInsights: this.memory[this.memory.length - 1]?.totalInsights || 0,
      latestByType: this.memory[this.memory.length - 1]?.insightsByType || {},
      latestByAge: this.memory[this.memory.length - 1]?.insightsByAge || {},
      avgImportance: this.memory.reduce((sum, m) => sum + m.avgImportance, 0) / this.memory.length,
      avgReuseCount: this.memory[this.memory.length - 1]?.avgReuseCount || 0
    } : null

    const qualitySummary = {
      totalQueries: this.quality.length,
      avgResponseLength: this.quality.reduce((sum, m) => sum + m.responseLength, 0) / this.quality.length,
      avgInsightsUsed: this.quality.reduce((sum, m) => sum + m.insightsUsed, 0) / this.quality.length,
      avgContextSize: this.quality.reduce((sum, m) => sum + m.contextSize, 0) / this.quality.length
    }

    const retrievalSummary = {
      totalRetrievals: this.retrieval.length,
      avgSimilarity: this.retrieval.reduce((sum, m) => sum + m.avgSimilarity, 0) / this.retrieval.length,
      avgCount: this.retrieval.reduce((sum, m) => sum + m.insightsRetrieved, 0) / this.retrieval.length,
      avgTime: this.retrieval.reduce((sum, m) => sum + m.retrievalTime, 0) / this.retrieval.length
    }

    return {
      performance: perfSummary,
      memory: memorySummary,
      quality: qualitySummary,
      retrieval: retrievalSummary
    }
  }

  /**
   * 导出为JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      performance: this.performance,
      memory: this.memory,
      quality: this.quality,
      retrieval: this.retrieval,
      summary: this.getSummary()
    }, null, 2)
  }

  /**
   * 生成 Markdown 格式的报告
   */
  generateReport(title: string = '测试报告'): string {
    const summary = this.getSummary()
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    
    let report = ''
    report += `# ${title}\n\n`
    report += `**生成时间**：${now}\n\n`
    report += '---\n\n'
    
    // 性能指标
    report += '## 性能指标\n\n'
    report += `- **总操作数**：${summary.performance.totalOperations} 次\n`
    report += `- **平均响应时间**：${summary.performance.avgDuration.toFixed(2)} ms (${(summary.performance.avgDuration / 1000).toFixed(2)} 秒)\n`
    report += `- **成功率**：${(summary.performance.successRate * 100).toFixed(1)}%\n\n`
    
    if (Object.keys(summary.performance.byOperation).length > 0) {
      report += '### 按操作类型统计\n\n'
      report += '| 操作类型 | 次数 | 平均耗时 (ms) | 成功率 |\n'
      report += '|---------|------|--------------|--------|\n'
      for (const [op, stats] of Object.entries(summary.performance.byOperation)) {
        report += `| ${op} | ${stats.count} | ${stats.avgDuration.toFixed(2)} | ${(stats.successRate * 100).toFixed(1)}% |\n`
      }
      report += '\n'
    }
    
    // 记忆指标
    if (summary.memory) {
      report += '## 记忆指标\n\n'
      report += `- **活跃 Insights 数量**：${summary.memory.latestInsights} 条\n`
      report += `- **平均重要性**：${summary.memory.avgImportance.toFixed(2)}\n`
      report += `- **平均复用次数**：${summary.memory.avgReuseCount.toFixed(2)}\n\n`
      
      if (summary.memory.latestByType && Object.keys(summary.memory.latestByType).length > 0) {
        report += '### Insights 类型分布\n\n'
        report += '| 类型 | 数量 | 占比 |\n'
        report += '|------|------|------|\n'
        for (const [type, count] of Object.entries(summary.memory.latestByType)) {
          const countNum = typeof count === 'number' ? count : Number(count)
          const percentage = summary.memory.latestInsights > 0 
            ? ((countNum / summary.memory.latestInsights) * 100).toFixed(1) 
            : '0.0'
          report += `| ${type} | ${countNum} | ${percentage}% |\n`
        }
        report += '\n'
      }
      
      if (summary.memory.latestByAge && Object.keys(summary.memory.latestByAge).length > 0) {
        report += '### Insights 年龄分布\n\n'
        report += '| 年龄段 | 数量 |\n'
        report += '|--------|------|\n'
        for (const [age, count] of Object.entries(summary.memory.latestByAge)) {
          const countNum = typeof count === 'number' ? count : Number(count)
          const ageLabel = {
            recent: '最近 (0-7天)',
            medium: '中等 (7-30天)',
            old: '较旧 (30-90天)',
            ancient: '很旧 (90天+)'
          }[age] || age
          report += `| ${ageLabel} | ${countNum} |\n`
        }
        report += '\n'
      }
    }
    
    // 对话质量指标
    report += '## 对话质量指标\n\n'
    report += `- **总查询数**：${summary.quality.totalQueries} 次\n`
    report += `- **平均回复长度**：${summary.quality.avgResponseLength.toFixed(0)} 字符\n`
    report += `- **平均使用 Insights**：${summary.quality.avgInsightsUsed.toFixed(1)} 条\n`
    report += `- **平均上下文大小**：${summary.quality.avgContextSize.toFixed(0)} tokens\n\n`
    
    // 检索指标
    if (summary.retrieval.totalRetrievals > 0) {
      report += '## 检索指标\n\n'
      report += `- **总检索次数**：${summary.retrieval.totalRetrievals} 次\n`
      report += `- **平均相似度**：${summary.retrieval.avgSimilarity?.toFixed(3) || 'N/A'}\n`
      report += `- **平均检索数量**：${summary.retrieval.avgCount?.toFixed(1) || 'N/A'} 条\n`
      report += `- **平均检索时间**：${summary.retrieval.avgTime?.toFixed(2) || 'N/A'} ms\n\n`
    }
    
    report += '---\n'
    
    return report
  }
  
  /**
   * 保存到文件
   */
  async saveToFile(filepath: string) {
    const fs = await import('fs/promises')
    await fs.writeFile(filepath, this.exportToJSON(), 'utf-8')
    console.log(`[Metrics] Saved to ${filepath}`)
  }
  
  /**
   * 保存人类可读的报告到文件
   */
  async saveReport(filepath: string, title: string = '测试报告') {
    const fs = await import('fs/promises')
    const report = this.generateReport(title)
    await fs.writeFile(filepath, report, 'utf-8')
    console.log(`[Metrics] Report saved to ${filepath}`)
  }

  /**
   * 完成wandb运行，返回运行URL
   */
  async finish(): Promise<string | null> {
    if (this.enabled && this.wandbRun) {
      const summary = this.getSummary()
      
      // 记录最终摘要
      wandb.log({
        'final/total_operations': summary.performance.totalOperations,
        'final/avg_duration': summary.performance.avgDuration,
        'final/success_rate': summary.performance.successRate,
        'final/total_insights': summary.memory?.latestInsights || 0,
        'final/avg_response_length': summary.quality.avgResponseLength,
        'final/avg_insights_used': summary.quality.avgInsightsUsed
      })

      // 获取运行URL（可能是属性或函数）
      let runUrl: string | null = null
      try {
        if (typeof this.wandbRun.url === 'function') {
          runUrl = this.wandbRun.url()
        } else if (typeof this.wandbRun.url === 'string') {
          runUrl = this.wandbRun.url
        } else if (this.wandbRun.getUrl) {
          runUrl = this.wandbRun.getUrl()
        }
      } catch {
        // 忽略获取 URL 失败
      }
      
      await wandb.finish()
      console.log('[Metrics] Wandb run finished')
      
      return runUrl
    }
    return null
  }

  /**
   * 重置所有指标
   */
  reset() {
    this.performance = []
    this.memory = []
    this.quality = []
    this.retrieval = []
  }
}

// 全局单例
export const metrics = new MetricsCollector()
