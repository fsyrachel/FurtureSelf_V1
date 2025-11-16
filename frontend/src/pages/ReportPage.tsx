/**
 * F5.2: 查看报告页面
 * 展示 WOOP 框架的职业洞见报告
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'
import { useUserStore } from '@/stores/userStore'
import apiClient, { ReportResponse } from '@/services/api'
import Button from '@/components/common/Button'

const woopSections = [
  {
    code: 'W',
    key: 'wish',
    title: 'Wish · 愿望',
    desc: '明确最想达成的职业愿景，定义时间跨度与成功信号。',
  },
  {
    code: 'O',
    key: 'outcome',
    title: 'Outcome · 结果',
    desc: '展望愿景实现后的内外部收益，描绘成功的质感。',
  },
  {
    code: 'O',
    key: 'obstacle',
    title: 'Obstacle · 障碍',
    desc: '识别关键阻碍：情绪、资源或认知层面的瓶颈。',
  },
  {
    code: 'P',
    key: 'plan',
    title: 'Plan · 计划',
    desc: '针对每个障碍制定 If / Then 行动方案，实现可执行跃迁。',
  },
]

export default function ReportPage() {
  const navigate = useNavigate()
  const { userId } = useUserStore((state) => ({
    userId: state.userId,
  }))

  const [report, setReport] = useState<ReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setError('未找到用户信息')
      setIsLoading(false)
      return
    }

    const fetchReport = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await apiClient.getLatestReport(userId)
        setReport(data)
      } catch (err: any) {
        console.error('Failed to fetch report', err)
        setError('加载报告失败，请稍后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReport()
  }, [userId])

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
            <p className="mt-4 text-slate-200">正在加载报告...</p>
          </div>
        </div>
      </StarFieldLayout>
    )
  }

  if (error || !report) {
    return (
      <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-lg text-red-200 mb-4">{error || '报告不存在'}</p>
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </div>
        </div>
      </StarFieldLayout>
    )
  }

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col">
        <header className="mb-12 flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.45rem] text-sky-200/80">
              Step F5.2
            </p>
            <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
              你的职业洞见报告
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">
              基于 WOOP 框架与未来自我对话内容生成，帮助你聚焦愿景、识别障碍并制定跨越策略。
            </p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline" className="ml-4 flex-shrink-0">
            返回首页
          </Button>
        </header>

        <section className="rounded-[32px] border border-white/10 bg-white/8 p-10 shadow-[0_45px_140px_-45px_rgba(120,140,255,0.6)] backdrop-blur-xl">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.4rem] text-sky-100/80 inline-block">
            WOOP Framework
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {woopSections.map((item, index) => {
              const content = report.content[item.key as keyof typeof report.content] || ''
              return (
                <div
                  key={`${item.title}-${index}`}
                  className="flex gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 text-white transition-all hover:border-sky-300/40 hover:bg-white/8"
                >
                  <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/80 via-indigo-500/70 to-purple-500/70 text-xl font-semibold shadow-[0_10px_30px_-15px_rgba(64,147,255,0.85)]">
                    {item.code}
                  </span>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                    <p className="text-sm text-slate-200/85 mb-3">{item.desc}</p>
                    {content && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                          {content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-200/85">
            <p>
              📊 报告生成时间：{new Date(report.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </section>
      </div>
    </StarFieldLayout>
  )
}

