/**
 * 全局配置文件
 */

export const config = {
  // LLM 配置
  llm: {
    // 对话模型
    chat: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9
    },
    // 摘要模型
    summary: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.3,
      maxTokens: 3000,
      topP: 0.8
    },
    // Curator 模型（知识策展）
    curator: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.3,
      maxTokens: 3000,
      topP: 0.8
    }
  },

  // 记忆配置
  memory: {
    maxContextTokens: 80000,        // 最大上下文 token 数
    maxInsightsTokens: 3000,        // Insights 检索的 token 预算
    enableRAG: false                // 暂时不启用 RAG
  },

  // wandb 配置
  wandb: {
    apiKey: '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',
    enabled: true
  }
}
