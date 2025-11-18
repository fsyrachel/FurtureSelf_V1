/**
 * F3.1.3: 查看单封回信页面
 * 沉浸式展示回信内容，支持开始聊天
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'
import apiClient, { LetterReplyResponse } from '@/services/api'
import Button from '@/components/common/Button'

export default function LetterReplyPage() {
  const { replyId } = useParams<{ replyId: string }>()
  const navigate = useNavigate()

  const [reply, setReply] = useState<LetterReplyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!replyId) {
      setError('未找到回信ID')
      setIsLoading(false)
      return
    }

    const fetchReply = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await apiClient.getLetterReply(replyId)
        setReply(data)
      } catch (err: any) {
        console.error('Failed to fetch reply', err)
        setError('加载回信失败，请稍后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReply()
  }, [replyId])

  const handleStartChat = () => {
    if (reply && reply.chat_status === 'NOT_STARTED') {
      navigate(`/chat/${reply.future_profile_id}`)
    }
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
            <p className="mt-4 text-slate-200">正在解码未来信号...</p>
          </div>
        </div>
      </StarFieldLayout>
    )
  }

  if (error || !reply) {
    return (
      <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center min-h-[60vh]">
          <div className="rounded-xl border border-red-400/60 bg-red-500/10 p-6 text-center max-w-md">
            <p className="text-sm text-red-100 mb-4">{error || '回信不存在'}</p>
            <Button onClick={() => navigate('/inbox')} variant="outline">
              返回信号接收站
            </Button>
          </div>
        </div>
      </StarFieldLayout>
    )
  }

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        {/* 头部信息 */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.45rem] text-sky-200/80">
                未来回响解码
              </p>
              <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
                信号解码完成
              </h1>
            </div>
            <Button
              onClick={() => navigate('/inbox')}
              variant="outline"
              className="text-sm"
            >
              返回信号接收站
            </Button>
          </div>
        </header>

        {/* 沉浸式回信展示区域 */}
        <section className="rounded-[32px] border border-white/10 bg-white/8 p-10 shadow-[0_45px_140px_-45px_rgba(104,142,255,0.6)] backdrop-blur-xl">
          {/* 信封头部 */}
          <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3rem] text-sky-200/70 mb-2">
                信号源
              </p>
              <h2 className="text-2xl font-bold text-white">{reply.from_profile_name}</h2>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                  reply.chat_status === 'NOT_STARTED'
                    ? 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                }`}
              >
                {reply.chat_status === 'NOT_STARTED' ? '链接待开启' : '链接已归档'}
              </span>
            </div>
          </div>

          {/* 回信内容 - 信件样式 */}
          <div className="relative">
            {/* 信件纸张效果 */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-10 md:p-12 shadow-inner">
              {/* 信纸纹理 */}
              <div className="absolute inset-0 rounded-2xl opacity-5" style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255, 255, 255, 0.1) 2px,
                  rgba(255, 255, 255, 0.1) 4px
                )`,
              }}></div>

              {/* 回信内容 */}
              <div className="relative z-10">
                <div className="text-white leading-relaxed text-base md:text-lg whitespace-pre-line">
                  {reply.content}
                </div>
              </div>
            </div>

            {/* 装饰元素 */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-sky-400/20 to-purple-500/20 blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-400/15 to-pink-500/15 blur-3xl"></div>
          </div>

          {/* 操作按钮区域 */}
          <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-300">
              <p>准备好与你的未来化身进行深度链接了吗？</p>
            </div>
            <div className="flex gap-3">
              {reply.chat_status === 'NOT_STARTED' ? (
                <Button onClick={handleStartChat} className="min-w-[160px]">
                  建立深度链接
                </Button>
              ) : (
                <Button disabled className="min-w-[160px] opacity-50 cursor-not-allowed">
                  链接已归档
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </StarFieldLayout>
  )
}
