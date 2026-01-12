/**
 * 测试配置
 * 用于控制测试时各个模块的开关和参数
 */

export interface TestConfig {
  // 实验名称
  name: string
  
  // 功能开关
  enableInsightExtraction: boolean   // 是否提取 Insights
  enableInsightRetrieval: boolean    // 是否检索 Insights
  enableSummary: boolean             // 是否生成对话摘要
  enableSimilarityCheck: boolean     // 是否检查相似度
  enableConflictCheck: boolean       // 是否检查冲突
  
  // 参数配置
  maxContextTokens?: number          // 上下文 token 上限
}

// 测试上下文窗口大小配置
export const COMPARISON_MAX_CONTEXT_TOKENS = 2000  // 对比实验：2000 tokens
export const ABLATION_MAX_CONTEXT_TOKENS = 4000    // 消融实验：4000 tokens

// 消融实验预设配置
export const ABLATION_CONFIGS: TestConfig[] = [
  {
    name: 'Full-System',
    enableInsightExtraction: true,
    enableInsightRetrieval: true,
    enableSummary: true,
    enableSimilarityCheck: true,
    enableConflictCheck: true,
    maxContextTokens: ABLATION_MAX_CONTEXT_TOKENS
  },
  {
    name: 'No-Insights',
    enableInsightExtraction: false,
    enableInsightRetrieval: false,
    enableSummary: true,
    enableSimilarityCheck: true,
    enableConflictCheck: true,
    maxContextTokens: ABLATION_MAX_CONTEXT_TOKENS
  },
  {
    name: 'No-Summary',
    enableInsightExtraction: true,
    enableInsightRetrieval: true,
    enableSummary: false,
    enableSimilarityCheck: true,
    enableConflictCheck: true,
    maxContextTokens: ABLATION_MAX_CONTEXT_TOKENS
  }
]

// 当前测试配置（可被测试动态覆盖）
let currentTestConfig: TestConfig = ABLATION_CONFIGS[0]

export function setTestConfig(config: TestConfig) {
  currentTestConfig = config
  console.log(`[Test] 切换到配置: ${config.name}`)
}

export function getTestConfig(): TestConfig {
  return currentTestConfig
}

export function resetTestConfig() {
  currentTestConfig = ABLATION_CONFIGS[0]
}

