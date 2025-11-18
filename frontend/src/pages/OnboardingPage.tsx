/**
 * 入职引导页面
 * 引导用户开始创建档案
 */

import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'

const steps = [
  {
    id: '01',
    // 更新：文案
    title: '信标 01: 校准当前坐标',
    description: '通过 3 步问卷分享你的基本信息、价值观与人格画像。',
  },
  {
    id: '02',
    // 更新：文案
    title: '信标 02: 设定未来航线',
    description: '想象 5 年后的你，构建 1-3 条潜力航线，探索未来节点。',
  },
  {
    id: '03',
    // 更新：文案
    title: '信标 03: 发送跨时空信号',
    description: '向未来发出时间信号，获得 AI 回信，展开跨时空对话。',
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col justify-center">
        <header className="mb-16 max-w-5xl">
          {/* 更新：文案 */}
          <p className="text-sm uppercase tracking-[0.45rem] text-sky-200/80">
            时空连接协议
          </p>
          {/* 更新：文案 */}
          <h1 className="mt-4 text-5xl font-extrabold leading-tight text-white md:text-6xl">
            开启你的时空之旅
          </h1>
          {/* 更新：文案 */}
          <p className="mt-4 text-lg leading-relaxed text-slate-200 md:text-xl">
            校准你的时空坐标，连接未来的你，开始探索职业宇宙的无限航线。
          </p>
        </header>

        <main className="relative flex justify-center">
          <section className="relative w-full max-w-[1020px]">
            <div className="relative rounded-[38px] border border-white/10 bg-white/8 p-14 shadow-[0_45px_140px_-45px_rgba(37,110,255,0.65)] backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.4rem] text-sky-200/80">
                <Sparkles className="h-4 w-4 text-sky-100" />
                连接信标
              </div>
              <h2 className="mt-6 text-4xl font-semibold text-white">
                建立你的时空档案
              </h2>
              <p className="mt-4 text-lg text-slate-200">
                完成以下信标，以匿名身份生成专属档案，解锁未来回信与洞见报告。
              </p>

              <div className="mt-12 space-y-7">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className="group flex items-start gap-6 rounded-2xl border border-white/10 bg-white/4 px-7 py-6 transition-all hover:border-sky-300/40 hover:bg-white/6"
                  >
                    <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/80 via-indigo-500/70 to-purple-500/70 text-lg font-semibold text-white shadow-[0_10px_30px_-15px_rgba(64,147,255,0.85)]">
                      {step.id}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-base text-slate-200/85">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/profile/questionnaire')}
                className="mt-14 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-10 py-5 text-lg font-semibold text-white transition-all hover:shadow-[0_24px_70px_-35px_rgba(64,147,255,0.9)]"
              >
                启动时空引擎
                <ArrowRight className="h-5 w-5" />
              </button>

              <div className="mt-6 text-center text-sm text-slate-300">
                <p>预计完成时间约 15-20 分钟</p>
                <p className="mt-1 text-slate-400/90">所有数据以匿名方式存储</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </StarFieldLayout>
  )
}

