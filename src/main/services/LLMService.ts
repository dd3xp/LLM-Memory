/**
 * LLM 服务
 * 使用 OpenAI SDK 连接到 SiliconFlow 的 Qwen 模型
 */

import OpenAI from 'openai'
import config from '../../../config'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class LLMService {
  private client: OpenAI

  constructor() {
    // 初始化 OpenAI 客户端
    this.client = new OpenAI({
      apiKey: config.llm.apiKey,
      baseURL: config.llm.baseURL
    })
  }

  /**
   * 生成回复
   */
  async generateResponse(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    try {
      // 构建完整消息列表
      const fullMessages: Message[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

      const response = await this.client.chat.completions.create({
        model: config.llm.model,
        messages: fullMessages,
        temperature: config.llm.temperature,
        max_tokens: config.llm.maxTokens,
        top_p: config.llm.topP,
        stream: false
      })

      return response.choices[0]?.message?.content || '抱歉，我无法生成回复。'
    } catch (error) {
      console.error('[LLM] 生成回复失败:', error)
      throw error
    }
  }

  /**
   * 流式生成回复
   */
  async *streamResponse(
    messages: Message[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    try {
      const fullMessages: Message[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

      const stream = await this.client.chat.completions.create({
        model: config.llm.model,
        messages: fullMessages,
        temperature: config.llm.temperature,
        max_tokens: config.llm.maxTokens,
        top_p: config.llm.topP,
        stream: true
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield content
        }
      }
    } catch (error) {
      console.error('[LLM] 流式生成失败:', error)
      throw error
    }
  }
}
