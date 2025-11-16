/**
 * F6.1: 首页导航
 * 简化的首页，仅展示两个核心入口
 */

import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { Mail, Inbox, ArrowRight, Sparkles } from 'lucide-react'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'

export default function HomePage() {
  const navigate = useNavigate()
  const { reset } = useUserStore()
  const isDevelopment = import.meta.env.VITE_APP_ENV === 'development'

  return (
    <StarFieldLayout className="px-8 py-16 md:px-14 lg:px-20 xl:px-28">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col">
        <header className="mb-24 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.5rem] text-sky-300/80">
              FutureSelf Career Studio
            </p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-white md:text-6xl">
              未来自我
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200 md:text-xl">
              穿越时间的回声，探索你的职业宇宙。让未来的你为今日指引，点亮前方航线。
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-sky-200 md:text-base">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-6 py-3 backdrop-blur">
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-full w-full animate-ping rounded-full bg-emerald-300/70" />
              </span>
              航线已就绪 · 即刻启程
            </span>
          </div>
        </header>

        <main className="grid flex-1 gap-20 lg:grid-cols-[440px_minmax(0,1fr)] lg:items-stretch">
          {/* 主操作区 */}
          <section className="space-y-12">
            <div className="rounded-[36px] border border-white/10 bg-white/8 p-12 shadow-[0_40px_120px_-35px_rgba(30,84,255,0.55)] backdrop-blur-xl">
              <h2 className="text-3xl font-semibold text-white">
                从这里启航
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-200">
                通过写信、对话与AI分析，收集来自未来的回声，逐层构建属于你的成长星图。
              </p>

              <div className="mt-14 space-y-8">
                <button
                  onClick={() => navigate('/letter/write')}
                  className="group flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-7 py-5 text-left text-white shadow-lg transition-all hover:shadow-[0_20px_60px_-25px_rgba(56,158,255,0.9)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                      <Mail className="h-5 w-5" />
                      <div className="absolute -inset-1 rounded-2xl border border-white/20" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold tracking-wide">
                        写信给未来
                      </p>
                      <p className="mt-1 text-sm text-white/85">
                        向未来的自己发送信号，记录此刻的梦想与抉择
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1.5" />
                </button>

                <button
                  onClick={() => navigate('/inbox')}
                  className="group flex w-full items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-7 py-5 text-left text-sky-100 transition-all hover:border-white/30 hover:bg-white/8 hover:text-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                      <Inbox className="h-5 w-5" />
                      <div className="absolute -inset-1 rounded-2xl border border-white/15" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold tracking-wide text-white">
                        查看收信箱
                      </p>
                      <p className="mt-1 text-sm text-slate-200">
                        解锁未来来信，对照现实，修正航向
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-6 w-6 text-sky-300 transition-transform group-hover:translate-x-1.5" />
                </button>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur">
                <p className="flex items-center gap-2 text-sm uppercase tracking-[0.35rem] text-sky-300/70">
                  <Sparkles className="h-4 w-4 text-sky-200" />
                  职场洞察
                </p>
                <p className="mt-3 text-4xl font-bold text-white">24+</p>
                <p className="mt-2 text-sm text-slate-300">
                  专属洞察与趋势研判，持续更新你的航向坐标。
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur">
                <p className="flex items-center gap-2 text-sm uppercase tracking-[0.35rem] text-sky-300/70">
                  <Sparkles className="h-4 w-4 text-sky-200" />
                  行动计划
                </p>
                <p className="mt-3 text-4xl font-bold text-white">12</p>
                <p className="mt-2 text-sm text-slate-300">
                  周期性成长任务，将未来蓝图分解为可执行的跃迁步骤。
                </p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-slate-100 transition-all hover:border-white/35 hover:bg-white/10"
                title="清空本地数据并刷新页面"
              >
                重置（清空本地数据）
              </button>
            </div>
          </section>

          {/* 星际视觉区 */}
          <section className="relative hidden min-h-[680px] w-full overflow-hidden rounded-[56px] border border-white/10 bg-white/6 p-16 shadow-[0_50px_140px_-40px_rgba(60,120,255,0.6)] backdrop-blur-2xl lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_52%)]" />
              <div className="absolute inset-[-20%] bg-[url('https://assets.futuretools-pro.com/starfield-light.svg')] bg-cover opacity-60 mix-blend-screen" />
              <div className="absolute right-[-12%] top-[-18%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.75)_0%,transparent_65%)] blur-2xl" />
            </div>

            <div className="relative">
              <p className="text-sm uppercase tracking-[0.45rem] text-sky-200/70">
                AI Career Companion
              </p>
              <h2 className="mt-5 text-4xl font-semibold text-white">
                星际穿越式洞察
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-100/85">
                连接当下与未来的时空折叠，AI 将整合你的兴趣、能力与价值观，生成多维职业轨迹预测，提前预演可能的生命周期。
              </p>
            </div>

            <div className="relative grid gap-6 text-white/90 lg:grid-cols-2">
              <div className="rounded-3xl bg-white/[0.12] p-6 text-left backdrop-blur">
                <p className="text-sm uppercase tracking-[0.3rem] text-sky-200">
                  能力映射
                </p>
                <p className="mt-4 text-2xl font-semibold">
                  360° 核心能力体检
                </p>
                <p className="mt-3 text-sm text-slate-100/80">
                  基于真实对话与信件，生成多维能力雷达图，突出潜能与盲区。
                </p>
              </div>
              <div className="rounded-3xl bg-white/[0.12] p-6 text-left backdrop-blur">
                <p className="text-sm uppercase tracking-[0.3rem] text-sky-200">
                  行动跃迁
                </p>
                <p className="mt-4 text-2xl font-semibold">
                  分阶段跃迁计划
                </p>
                <p className="mt-3 text-sm text-slate-100/80">
                  结合行业趋势制定短、中、长期行动路线，多重时间线并行推进。
                </p>
              </div>
              <div className="lg:col-span-2">
                <div className="rounded-3xl bg-gradient-to-r from-sky-400/25 via-blue-400/20 to-indigo-500/25 p-6 shadow-inner backdrop-blur">
                  <p className="text-sm uppercase tracking-[0.35rem] text-sky-100/90">
                    心态驱动
                  </p>
                  <p className="mt-4 text-lg font-medium text-white/95">
                    穿越时间的不确定性，用未来视角校准当下行动，让每一步都对齐内在坐标。
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </StarFieldLayout>
  )
}

