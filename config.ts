/**
 * 全局配置文件
 * 存放API密钥等配置信息
 */

export const config = {
  // LLM 配置
  llm: {
    // 对话模型配置
    chat: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9
    },
    
    // 摘要模型配置
    summary: {
      apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
      baseURL: 'https://api.siliconflow.cn/v1',
      model: 'Qwen/Qwen3-8B',
      temperature: 0.3,
      maxTokens: 3000,
      topP: 0.8
    },
    
    // Curator模型配置（提取和管理Insights）
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
    maxContextTokens: 80000, // 调整：更安全的上限，预留足够缓冲空间
    maxInsightsPerQuery: 8, // 调整：减少数量，提高单条质量
    maxInsightsTokens: 3000, // 调整：增加token预算，平均每条375 tokens
    enableRAG: false // 暂时不启用RAG
    // Cheatsheet策略：当消息总量超过80%上限时，自动摘要前50%并清空
  }
}

export default config
