/**
 * F3.1.2: 写信页面
 * 实现信件编辑器和异步提交
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'
import { useUserStore } from '@/stores/userStore'
import apiClient from '@/services/api'
import Button from '@/components/common/Button'

const MIN_LENGTH = 50
const MAX_LENGTH = 5000

const guideQuestions = [
  '请写一封信给五年后的你。',
  '想象TA已经成为你想成为的人。',
  '你想问TA什么？你希望TA记得你现在的哪些感受？',
]

export default function WriteLetterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userId } = useUserStore((state) => ({
    userId: state.userId,
  }))

  const [letterContent, setLetterContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRetry, setIsRetry] = useState(false)

  // 从路由 state 恢复内容（超时/失败后返回）
  useEffect(() => {
    if (location.state?.content) {
      setLetterContent(location.state.content)
      setIsRetry(true)
      setError(
        location.state.reason === 'timeout'
          ? '信件处理超时，请检查内容后重新提交。'
          : '信件处理失败，请检查内容后重新提交。'
      )
      // 清除 state，避免刷新后重复恢复
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // 从 sessionStorage 恢复草稿（如果存在且当前为空）
  useEffect(() => {
    const draft = sessionStorage.getItem('letter_draft')
    if (draft && !letterContent && !location.state?.content) {
      setLetterContent(draft)
    }
  }, [])

  const charCount = letterContent.length
  const isValid = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH

  const handleSubmit = async () => {
    if (!userId) {
      setError('未找到用户信息，请返回重新初始化。')
      return
    }

    if (!isValid) {
      setError(`信件内容必须在 ${MIN_LENGTH}-${MAX_LENGTH} 字之间。`)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      // 保存内容到 sessionStorage（用于超时/失败后恢复）
      sessionStorage.setItem('letter_draft', letterContent)

      const response = await apiClient.submitLetter(userId, {
        content: letterContent,
      })

      if (response.status === 'SUBMITTED') {
        // 清除 sessionStorage，跳转到处理页面
        sessionStorage.removeItem('letter_draft')
        navigate('/letter/processing')
      }
    } catch (err: any) {
      console.error('Failed to submit letter', err)
      setError('提交失败，请稍后重试或检查网络连接。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.45rem] text-sky-200/80">
            Step F3.1.2
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
            给未来的自己写信
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">
            写下一封来自现在的讯息，将它发送到未来。信件将触发 AI 生成的未来回应，并成为职业洞见的重要素材。
          </p>
        </header>

        <section className="rounded-[32px] border border-white/10 bg-white/8 p-10 shadow-[0_45px_140px_-45px_rgba(90,128,255,0.58)] backdrop-blur-xl">
          {/* 重试提示 */}
          {isRetry && (
            <div className="mb-6 rounded-xl border border-orange-400/60 bg-orange-500/10 p-4 text-sm text-orange-100">
              <p className="font-semibold">⚠️ 信件处理超时或失败</p>
              <p className="mt-1 text-orange-200/80">
                请检查内容后重新提交。你的信件内容已自动恢复。
              </p>
            </div>
          )}

          {/* 引导问题 */}
          <div className="mb-8 space-y-3">
            {guideQuestions.map((question, index) => (
              <p key={index} className="text-lg font-bold text-white">
                {question}
              </p>
            ))}
          </div>

          {/* 文本输入区域 */}
          <div className="rounded-3xl border border-white/12 bg-[#0d1329]/70 p-8 shadow-[0_30px_120px_-60px_rgba(94,197,255,0.35)]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  信件内容
                </label>
                <textarea
                  value={letterContent}
                  onChange={(e) => {
                    setLetterContent(e.target.value)
                    setError(null)
                  }}
                  placeholder="在这里写下你想对未来的自己说的话..."
                  rows={12}
                  maxLength={MAX_LENGTH}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-300">
                    {charCount < MIN_LENGTH
                      ? `至少需要 ${MIN_LENGTH} 字（当前：${charCount} 字）`
                      : charCount > MAX_LENGTH
                      ? `超过最大长度 ${MAX_LENGTH} 字`
                      : '建议 300-500 字'}
                  </p>
                  <p
                    className={`text-xs ${
                      isValid ? 'text-slate-300' : 'text-orange-400'
                    }`}
                  >
                    {charCount} / {MAX_LENGTH}
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-slate-300">
                  📌 提示：信件内容将用于生成 AI 回信，请尽量详细地表达你的想法和感受。
                </p>
                <Button
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={!isValid || isSubmitting}
                >
                  发送给未来的我
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StarFieldLayout>
  )
}
