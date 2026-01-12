/**
 * 全局配置文件
 */

// 模型总上下文窗口大小
const MODEL_CONTEXT_WINDOW = 128000  // 128k tokens

// Token 分配比例（基于 MODEL_CONTEXT_WINDOW）
const TOKEN_RATIOS = {
  // 输入上下文分配
  maxContext: 0.625,        // 62.5% 用于对话历史
  insights: 0.025,          // 2.5% 用于 Insights 检索
  
  // 输出 token 限制
  chatResponse: 0.015,      // 1.5% 对话回复上限
  summaryResponse: 0.025,   // 2.5% 摘要生成上限
  curatorResponse: 0.025,   // 2.5% 知识策展上限
  
  // 触发阈值
  summarizationTrigger: 0.8,  // 80% 容量时触发摘要
  evictionRatio: 0.5          // 删除最旧的 50% 消息
}

export const config = {
  // 模型上下文大小
  modelContextWindow: MODEL_CONTEXT_WINDOW,
  
  // LLM 配置
  llm: {
    // 对话模型
    chat: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.7,
      maxTokens: Math.floor(MODEL_CONTEXT_WINDOW * TOKEN_RATIOS.chatResponse),
      topP: 0.9
    },
    // 摘要模型
    summary: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.3,
      maxTokens: Math.floor(MODEL_CONTEXT_WINDOW * TOKEN_RATIOS.summaryResponse),
      topP: 0.8
    },
    // Curator 模型（知识策展）
    curator: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.3,
      maxTokens: Math.floor(MODEL_CONTEXT_WINDOW * TOKEN_RATIOS.curatorResponse),
      topP: 0.8
    }
  },

  // 记忆配置
  memory: {
    maxContextTokens: Math.floor(MODEL_CONTEXT_WINDOW * TOKEN_RATIOS.maxContext),
    maxInsightsTokens: Math.floor(MODEL_CONTEXT_WINDOW * TOKEN_RATIOS.insights),
    summarizationTrigger: TOKEN_RATIOS.summarizationTrigger,
    evictionRatio: TOKEN_RATIOS.evictionRatio,
    enableRAG: false
  },

  // wandb 配置
  wandb: {
    apiKey: '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',
    enabled: true
  }
}

// 导出比例配置供论文参考
export const tokenRatios = TOKEN_RATIOS
