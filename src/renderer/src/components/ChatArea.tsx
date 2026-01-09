/**
 * 聊天区域 - 优雅的消息设计
 */

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatAreaProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  isLoading?: boolean
}

function ChatArea({ messages, onSendMessage, isLoading = false }: ChatAreaProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // 滚动到底部
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 当消息变化或加载状态变化时，自动滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input)
      setInput('')
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-bg)'
      }}
    >
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 24px 0 24px'
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0 24px'
            }}
          >
            {/* Empty State */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-xl)',
                backgroundColor: 'var(--color-bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-tertiary)"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h.01M12 10h.01M16 10h.01" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--color-text)',
                marginBottom: '8px',
                letterSpacing: '-0.01em'
              }}
            >
              开始新的对话
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                maxWidth: '400px'
              }}
            >
              输入消息开始与AI助手聊天，体验智能对话的魅力
            </p>
          </div>
        ) : (
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              paddingBottom: '24px'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className="animate-fade-in"
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '24px'
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor:
                      message.role === 'user' ? 'var(--color-primary)' : 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    {message.role === 'user' ? (
                      <>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </>
                    ) : (
                      <>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.4 4.4l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.4-4.4l4.2-4.2" />
                      </>
                    )}
                  </svg>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--color-text)'
                      }}
                    >
                      {message.role === 'user' ? '你' : 'AI 助手'}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-tertiary)'
                      }}
                    >
                      {message.timestamp}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: 'var(--color-text)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          
          {/* 加载指示器 */}
          {isLoading && (
            <div
              className="flex gap-4"
              style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.4 4.4l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.4-4.4l4.2-4.2" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--color-text)'
                    }}
                  >
                    AI 助手
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  正在思考...
                </div>
              </div>
            </div>
          )}
          
          {/* 滚动锚点 */}
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
      )}
    </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '16px 24px',
          backgroundColor: 'var(--color-bg)'
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: '720px',
            margin: '0 auto'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-text)'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(10, 10, 10, 0.1)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入消息..."
              style={{
                flex: 1,
                fontSize: '14px',
                color: 'var(--color-text)',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="transition-all"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: (input.trim() && !isLoading) ? 'var(--color-text)' : 'var(--color-bg-tertiary)',
                color: (input.trim() && !isLoading) ? 'white' : 'var(--color-text-quaternary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (input.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                flexShrink: 0,
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatArea
