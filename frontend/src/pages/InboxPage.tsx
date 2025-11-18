/**
 * F6.5: 收信箱页面
 * 显示来自未来自我的回信列表
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'
import { useUserStore } from '@/stores/userStore'
import apiClient, { InboxResponse } from '@/services/api'
import Button from '@/components/common/Button'

export default function InboxPage() {
  const navigate = useNavigate()
  const { userId } = useUserStore((state) => ({
    userId: state.userId,
  }))

  const [inboxData, setInboxData] = useState<InboxResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setError('未找到用户坐标')
      setIsLoading(false)
      return
    }

    const fetchInbox = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await apiClient.getInbox(userId)
        setInboxData(data)
      } catch (err: any) {
        console.error('Failed to fetch inbox', err)
        setError('加载收信箱失败，请稍后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInbox()
  }, [userId])

  const getChatStatusText = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return '链接待开启'
      case 'COMPLETED':
        return '链接已归档'
      default:
        return '状态未知'
    }
  }

  const getChatStatusColor = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return 'bg-blue-500/20 text-blue-200 border-blue-400/40'
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
      default:
        return 'bg-slate-500/20 text-slate-200 border-slate-400/40'
    }
  }

  const handleCardClick = (replyId: string) => {
    navigate(`/letter/reply/${replyId}`)
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
            <p className="mt-4 text-slate-200">正在从未来时间线拉取信号...</p>
          </div>
        </div>
      </StarFieldLayout>
    )
  }

  if (error) {
    return (
      <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center min-h-[60vh]">
          <div className="rounded-xl border border-red-400/60 bg-red-500/10 p-6 text-center max-w-md">
            <p className="text-sm text-red-100 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              重新加载
            </Button>
          </div>
        </div>
      </StarFieldLayout>
    )
  }

  if (!inboxData || !inboxData.replies || inboxData.replies.length === 0) {
    return (
      <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col">
          <header className="mb-12">
            <p className="text-xs uppercase tracking-[0.45rem] text-sky-200/80">
              时空信号接收站
            </p>
            <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
              未来回响
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">
              在这里查看来自未来自我的回信。
            </p>
          </header>

          <section className="rounded-[32px] border border-white/10 bg-white/8 p-10 shadow-[0_45px_140px_-45px_rgba(78,138,255,0.6)] backdrop-blur-xl">
            <div className="text-center py-12">
              <p className="text-lg text-slate-200">信号接收站为空</p>
              <p className="mt-2 text-sm text-slate-300">
                发送你的第一份时空胶囊后，来自未来的回响将会在这里被捕获。
              </p>
            </div>
          </section>
        </div>
      </StarFieldLayout>
    )
  }

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.45rem] text-sky-200/80">
            时空信号接收站
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
            未来回响
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">
            你发送的时空胶囊已收到来自未来的回响。点击信号卡片，解码完整信息，并开始与你的未来化身进行深度链接。
          </p>
        </header>

        <section className="rounded-[32px] border border-white/10 bg-white/8 p-10 shadow-[0_45px_140px_-45px_rgba(78,138,255,0.6)] backdrop-blur-xl">
          {/* 信件预览 */}
          {inboxData.letter_content_snippet && (
            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3rem] text-sky-200/70 mb-3">
                你发送的原始信号
              </p>
              <p className="text-sm text-slate-200 leading-relaxed">
                {inboxData.letter_content_snippet}
              </p>
            </div>
          )}

          {/* 回信卡片列表 */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {inboxData.replies.map((reply) => (
              <div
                key={reply.reply_id}
                onClick={() => handleCardClick(reply.reply_id)}
                className="group relative cursor-pointer rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 transition-all hover:border-sky-300/40 hover:bg-white/10 hover:shadow-[0_20px_60px_-30px_rgba(64,147,255,0.5)]"
              >
                {/* 信封样式装饰 */}
                <div className="absolute top-4 right-4">
                  <div className="w-12 h-12 rounded-lg border-2 border-white/20 bg-white/5 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-sky-300/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>

                {/* 人设名称 */}
                <div className="mb-4 pr-16">
                  <p className="text-xs uppercase tracking-[0.3rem] text-sky-200/70 mb-2">
                    信号来源
                  </p>
                  <h3 className="text-xl font-bold text-white group-hover:text-sky-200 transition-colors">
                    {reply.from_profile_name}
                  </h3>
                </div>

                {/* 聊天状态 */}
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getChatStatusColor(
                      reply.chat_status
                    )}`}
                  >
                    {getChatStatusText(reply.chat_status)}
                  </span>
                </div>

                {/* 点击提示 */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-slate-300/70 group-hover:text-sky-200/70 transition-colors">
                    解码信号 →
                  </p>
                </div>

                {/* 悬停光效 */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/0 via-sky-500/5 to-sky-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </StarFieldLayout>
  )
}
