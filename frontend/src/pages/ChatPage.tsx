/**
 * F3.2.2 + F3.2.3: 聊天页面
 * 实现聊天界面和5条消息限制
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'
import { useUserStore } from '@/stores/userStore'
import apiClient, { ChatMessageResponse } from '@/services/api'
import Button from '@/components/common/Button'

const MAX_USER_MESSAGES = 5

export default function ChatPage() {
  const { futureProfileId } = useParams<{ futureProfileId: string }>()
  const navigate = useNavigate()
  const { userId } = useUserStore((state) => ({
    userId: state.userId,
  }))

  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [inputContent, setInputContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 计算用户消息数量
  const userMessageCount = messages.filter((msg) => msg.sender === 'USER').length
  const isChatCompleted = userMessageCount >= MAX_USER_MESSAGES
  
  // 手动触发报告生成
  const handleGenerateReport = async () => {
    if (!userId) {
      setError('未找到用户信息')
      return
    }
    try {
      setIsGeneratingReport(true)
      await apiClient.generateReport(userId)
      navigate('/report/processing')
    } catch (err: any) {
      console.error('Failed to generate report', err)
      setError('触发报告生成失败，请稍后重试。')
      setIsGeneratingReport(false)
    }
  }

  // 加载聊天历史
  useEffect(() => {
    if (!futureProfileId || !userId) {
      setError('未找到未来人设ID或用户信息')
      setIsLoading(false)
      return
    }

    const fetchChatHistory = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const history = await apiClient.getChatHistory(futureProfileId, userId)
        setMessages(history)
      } catch (err: any) {
        console.error('Failed to fetch chat history', err)
        setError('加载聊天历史失败，请稍后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    fetchChatHistory()
  }, [futureProfileId, userId])

  // 滚动到底部
  /* useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages]) */

  // 发送消息
  const handleSendMessage = async () => {
    if (!futureProfileId || !userId) {
      setError('未找到未来人设ID或用户信息')
      return
    }

    if (!inputContent.trim()) {
      return
    }

    if (isChatCompleted) {
      setError('已达到5条消息的限制，无法继续发送。')
      return
    }

    setError(null)
    setIsSending(true)

    const content = inputContent.trim()
    const tempMessageId = `temp-user-${Date.now()}`
    
    try {
      // 先添加用户消息到界面
      const userMessage: ChatMessageResponse = {
        message_id: tempMessageId,
        sender: 'USER',
        content: content,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputContent('')

      // 发送消息到服务器
      await apiClient.sendChatMessage(futureProfileId, {
        user_id: userId,
        content: content,
      })

      // 重新加载聊天历史以获取完整消息（包括用户消息和AI回复）
      const history = await apiClient.getChatHistory(futureProfileId, userId)
      setMessages(history)
    } catch (err: any) {
      console.error('Failed to send message', err)
      
      // 移除临时用户消息
      setMessages((prev) => prev.filter((msg) => msg.message_id !== tempMessageId))
      
      // 如果是消息限制错误
      if (err.message === 'MESSAGE_LIMIT_EXCEEDED' || err.response?.status === 403) {
        setError('您已达到5条消息的限制，无法继续发送。')
        // 重新加载聊天历史以获取最新状态
        try {
          const history = await apiClient.getChatHistory(futureProfileId, userId)
          setMessages(history)
        } catch (reloadErr) {
          console.error('Failed to reload chat history', reloadErr)
        }
      } else {
        setError('发送消息失败，请稍后重试。')
      }
    } finally {
      setIsSending(false)
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-sky-200/80">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="mt-4 text-slate-200">正在加载聊天记录...</p>
          </div>
        </div>
      </StarFieldLayout>
    )
  }

  return (
    <StarFieldLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-4 pb-6">
        {/* 头部 */}
        <header className="mb-4 flex items-start justify-between py-2">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.45rem] text-sky-200/80">
              Step F3.2
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl">
              与未来对话
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              最多可发送 {MAX_USER_MESSAGES} 条消息 · 已发送 {userMessageCount} / {MAX_USER_MESSAGES}
            </p>
          </div>
          <Button onClick={() => navigate('/inbox')} variant="outline" className="text-sm flex-shrink-0 ml-4">
            返回收信箱
          </Button>
        </header>

        {/* 消息列表 - 自然扩展，使用页面滚动 */}
        <div className="px-2 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px] py-8">
              <div className="text-center">
                <p className="text-lg text-slate-300 mb-2">开始与未来的自己对话</p>
                <p className="text-sm text-slate-400">发送第一条消息，开始你们的跨时空对话。</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.message_id}
                  className={`flex ${message.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] md:max-w-[65%] rounded-3xl px-6 py-4 shadow-lg ${
                      message.sender === 'USER'
                        ? 'bg-gradient-to-r from-sky-500/80 via-indigo-500/80 to-purple-500/75 text-white'
                        : 'bg-white/10 text-white/90 border border-white/10'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                    <p className="mt-2 text-xs opacity-70">
                      {message.sender === 'USER' ? '现在 · 你' : '未来自我 · 回信'} · {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区域 */}
        <div className="pt-4 pb-2">
          {error && (
            <div className="mb-3 rounded-xl border border-red-400/60 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}

            {isChatCompleted ? (
              <div className="rounded-xl border border-emerald-400/60 bg-emerald-500/10 p-4 text-center">
                <p className="text-sm text-emerald-100 font-semibold">💬 聊天已结束</p>
                <p className="mt-1 text-xs text-emerald-200/80">
                  你已发送 {MAX_USER_MESSAGES} 条消息。
                </p>
                <Button
                  onClick={handleGenerateReport}
                  loading={isGeneratingReport}
                  disabled={isGeneratingReport}
                  className="mt-4 min-w-[200px]"
                >
                  查看报告
                </Button>
              </div>
            ) : (
            <div className="flex gap-3">
              <textarea
                value={inputContent}
                onChange={(e) => {
                  setInputContent(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="输入你的消息..."
                rows={3}
                maxLength={1000}
                disabled={isSending || isChatCompleted}
                className="flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30 disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              />
              <Button
                onClick={handleSendMessage}
                loading={isSending}
                disabled={!inputContent.trim() || isSending || isChatCompleted}
                className="self-end"
              >
                发送
              </Button>
            </div>
          )}

          {/* 提示信息 */}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <p>
              {inputContent.length > 0 && `${inputContent.length} / 1000`}
            </p>
            <p>
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </div>
    </StarFieldLayout>
  )
}
