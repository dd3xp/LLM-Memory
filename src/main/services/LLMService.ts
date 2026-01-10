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
  private chatClient: OpenAI
  private summaryClient: OpenAI
  private curatorClient: OpenAI

  constructor() {
    // 初始化对话模型客户端
    this.chatClient = new OpenAI({
      apiKey: config.llm.chat.apiKey,
      baseURL: config.llm.chat.baseURL
    })
    
    // 初始化摘要模型客户端
    this.summaryClient = new OpenAI({
      apiKey: config.llm.summary.apiKey,
      baseURL: config.llm.summary.baseURL
    })
    
    // 初始化Curator模型客户端（提取和管理Insights）
    this.curatorClient = new OpenAI({
      apiKey: config.llm.curator.apiKey,
      baseURL: config.llm.curator.baseURL
    })
    
    console.log('[LLMService] 对话模型:', config.llm.chat.model, 'at', config.llm.chat.baseURL)
    console.log('[LLMService] 摘要模型:', config.llm.summary.model, 'at', config.llm.summary.baseURL)
    console.log('[LLMService] Curator模型:', config.llm.curator.model, 'at', config.llm.curator.baseURL)
  }

  /**
   * 生成回复（对话模型）
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

      const response = await this.chatClient.chat.completions.create({
        model: config.llm.chat.model,
        messages: fullMessages,
        temperature: config.llm.chat.temperature,
        max_tokens: config.llm.chat.maxTokens,
        top_p: config.llm.chat.topP,
        stream: false
      })

      return response.choices[0]?.message?.content || '抱歉，我无法生成回复。'
    } catch (error) {
      console.error('[LLM] 生成回复失败:', error)
      throw error
    }
  }

  /**
   * 生成摘要（摘要模型）
   */
  async generateSummary(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    try {
      // 构建完整消息列表
      const fullMessages: Message[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

      console.log(`[LLM] 使用摘要模型: ${config.llm.summary.model}`)

      const response = await this.summaryClient.chat.completions.create({
        model: config.llm.summary.model,
        messages: fullMessages,
        temperature: config.llm.summary.temperature,
        max_tokens: config.llm.summary.maxTokens,
        top_p: config.llm.summary.topP,
        stream: false
      })

      return response.choices[0]?.message?.content || '抱歉，无法生成摘要。'
    } catch (error) {
      console.error('[LLM] 生成摘要失败:', error)
      throw error
    }
  }

  /**
   * Curator操作（提取Insights、检测相似度等）
   */
  async generateCurator(
    messages: Message[],
    systemPrompt?: string
  ): Promise<string> {
    try {
      // 构建完整消息列表
      const fullMessages: Message[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

      console.log(`[LLM] 使用Curator模型: ${config.llm.curator.model}`)

      const response = await this.curatorClient.chat.completions.create({
        model: config.llm.curator.model,
        messages: fullMessages,
        temperature: config.llm.curator.temperature,
        max_tokens: config.llm.curator.maxTokens,
        top_p: config.llm.curator.topP,
        stream: false
      })

      return response.choices[0]?.message?.content || '抱歉，Curator操作失败。'
    } catch (error) {
      console.error('[LLM] Curator操作失败:', error)
      throw error
    }
  }

  /**
   * 流式生成回复（对话模型）
   */
  async *streamResponse(
    messages: Message[],
    systemPrompt?: string
  ): AsyncGenerator<string> {
    try {
      const fullMessages: Message[] = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages]
        : messages

      const stream = await this.chatClient.chat.completions.create({
        model: config.llm.chat.model,
        messages: fullMessages,
        temperature: config.llm.chat.temperature,
        max_tokens: config.llm.chat.maxTokens,
        top_p: config.llm.chat.topP,
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
