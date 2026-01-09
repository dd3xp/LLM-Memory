/**
 * 全局配置文件
 * 存放API密钥等配置信息
 */

export const config = {
  // LLM 配置
  llm: {
    // API 配置
    apiKey: 'sk-ylkvvzhxnzpxkywlgwtextfpjrlrkispjprqnmhctqrclvez',
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    
    // 模型参数
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9
  },

  // 记忆配置
  memory: {
    slidingWindowSize: 20,
    enableRAG: false // 暂时不启用
  }
}

export default config
