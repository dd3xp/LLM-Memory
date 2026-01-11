/**
 * 消融实验配置
 * 用于控制各个模块的开关
 */

export interface AblationConfig {
  // 实验名称
  name: string
  
  // 功能开关
  enableInsightExtraction: boolean   // 是否提取 Insights
  enableInsightRetrieval: boolean    // 是否检索 Insights
  enableSummary: boolean             // 是否生成对话摘要
  enableSimilarityCheck: boolean     // 是否检查相似度
  enableConflictCheck: boolean       // 是否检查冲突
  
  // 参数配置
  maxInsightsTokens?: number         // Insights token 预算
  maxContextTokens?: number          // 上下文 token 上限（用于触发摘要测试）
}

// 预定义的实验配置（简化版）
export const ABLATION_CONFIGS: AblationConfig[] = [
  {
    name: 'Full-System',
    enableInsightExtraction: true,
    enableInsightRetrieval: true,
    enableSummary: true,
    enableSimilarityCheck: true,
    enableConflictCheck: true,
    maxInsightsTokens: 3000
  },
  {
    name: 'No-Cheatsheet',
    enableInsightExtraction: false,  // ❌ 禁用 Insights 提取
    enableInsightRetrieval: false,   // ❌ 禁用 Insights 检索
    enableSummary: true,
    enableSimilarityCheck: true,
    enableConflictCheck: true,
    maxInsightsTokens: 3000
  },
  {
    name: 'No-Summary',
    enableInsightExtraction: true,
    enableInsightRetrieval: true,
    enableSummary: false,            // ❌ 禁用摘要
    enableSimilarityCheck: true,
    enableConflictCheck: true,
    maxInsightsTokens: 3000,
    maxContextTokens: 4000           // 🔧 降低上下文限制，让8轮对话触发摘要测试
  }
]

// 全局消融配置实例（可被测试覆盖）
let currentAblationConfig: AblationConfig = ABLATION_CONFIGS[0]

export function setAblationConfig(config: AblationConfig) {
  currentAblationConfig = config
  console.log(`[Ablation] 切换到实验配置: ${config.name}`)
}

export function getAblationConfig(): AblationConfig {
  return currentAblationConfig
}

export function resetAblationConfig() {
  currentAblationConfig = ABLATION_CONFIGS[0]
}
