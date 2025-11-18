/**
 * F5.3: 报告生成等待页面
 * 实现状态轮询和自动导航
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'
import { useUserStore } from '@/stores/userStore'
import apiClient from '@/services/api'

const POLL_INTERVAL = 5000 // 5秒
const MAX_ATTEMPTS = 60 // 最多60次（5分钟）

type ReportStatus = 'GENERATING' | 'READY' | 'FAILED' | 'TIMEOUT'

export default function ReportProcessingPage() {
  const navigate = useNavigate()
  const { userId } = useUserStore((state) => ({
    userId: state.userId,
  }))

  const [status, setStatus] = useState<ReportStatus>('GENERATING')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setError('未找到用户信息')
      return
    }

    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let currentAttempts = 0

    const pollStatus = async () => {
      if (currentAttempts >= MAX_ATTEMPTS) {
        setStatus('TIMEOUT')
        setError('报告生成超时，请稍后重试。')
        return
      }

      try {
        const response = await apiClient.getReportStatus(userId)
        currentAttempts++
        setAttempts(currentAttempts)

        if (response.status === 'READY') {
          setStatus('READY')
          // 自动导航到报告页
          setTimeout(() => {
            navigate('/report')
          }, 1000)
          return
        }

        if (response.status === 'FAILED') {
          setStatus('FAILED')
          setError('报告生成失败，请稍后重试。')
          return
        }

        // GENERATING 状态，继续轮询
        if (response.status === 'GENERATING') {
          pollTimer = setTimeout(pollStatus, POLL_INTERVAL)
        }
      } catch (err: any) {
        console.error('Failed to poll report status', err)
        // 网络错误，继续尝试
        if (currentAttempts < MAX_ATTEMPTS) {
          pollTimer = setTimeout(pollStatus, POLL_INTERVAL)
        } else {
          setStatus('TIMEOUT')
          setError('网络错误，请检查连接后重试。')
        }
      }
    }

    // 开始轮询
    pollTimer = setTimeout(pollStatus, POLL_INTERVAL)

    return () => {
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
    }
  }, [userId, navigate])

  const getStatusMessage = () => {
    switch (status) {
      case 'GENERATING':
        return 'AI 领航员正在解析你的时空链接数据，并应用 WOOP 框架进行多维度建模...'
      case 'READY':
        return '时空洞察报告已生成，正在为你传送至报告终端...'
      case 'FAILED':
        return '数据解码过程中发生未知错误'
      case 'TIMEOUT':
        return '数据流连接超时'
      default:
        return '正在初始化解码器...'
    }
  }

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32 relative overflow-hidden">
      {/* 背景太空元素 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* 星云效果 */}
        <div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 100%)',
            animation: 'pulse 8s ease-in-out infinite',
          }}
        ></div>
        <div
          className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, rgba(168, 85, 247, 0.3) 50%, transparent 100%)',
            animation: 'pulse 10s ease-in-out infinite',
            animationDelay: '2s',
          }}
        ></div>
      </div>

      <style>{`
        @keyframes meteor {
          0% { opacity: 0; transform: translateY(-100px) rotate(-45deg); }
          10% { opacity: 1; }
          100% { opacity: 0; transform: translateY(200px) rotate(-45deg); }
        }
        @keyframes fly-by {
          0% { transform: translate(-80vw, -40vh) rotate(-35deg) scale(0.7); opacity: 1; }
          100% { transform: translate(80vw, 40vh) rotate(-35deg) scale(1.3); opacity: 1; }
        }
        @keyframes warp-lines {
          from { transform: scaleX(0); opacity: 1; }
          to { transform: scaleX(100); opacity: 0; }
        }
      `}</style>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center min-h-[60vh] relative z-10">
        {/* 视觉效果区域 - 报告生成中 */}
        <div className="relative w-full max-w-md mb-16">
          {/* 中心光点 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500 opacity-60 animate-pulse"></div>
          </div>

          {/* 旋转光环 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-sky-300/30 rounded-full animate-spin" style={{ animationDuration: '8s' }}></div>
          </div>

          {/* 外层光环 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border border-indigo-300/20 rounded-full animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}></div>
          </div>

          {/* 新增: 时空隧道 */}
          <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] pointer-events-none">
            {[...Array(60)].map((_, i) => {
              const duration = 0.5 + Math.random() * 0.5
              const delay = Math.random() * 1
              return (
                <div
                  key={`warp-${i}`}
                  className="absolute w-1/2 h-px bg-gradient-to-l from-sky-300 to-transparent"
                  style={{
                    top: '50%',
                    left: '50%',
                    transformOrigin: 'left center',
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animation: `warp-lines ${duration}s linear ${delay}s infinite`,
                  }}
                />
              )
            })}
          </div>

          {/* 新增: 宇宙飞船 */}
          <div
            className="absolute w-[120px] h-[120px]"
            style={{ top: '50%', left: '50%', animation: 'fly-by 12s linear infinite' }}
          >
            <svg width="120" height="120" viewBox="-50 -50 100 100" style={{ transform: 'rotate(135deg)' }}>
              {/* 替换为新的火箭 SVG */}
              <g stroke="rgba(220, 220, 255, 0.9)" strokeWidth="2" fill="rgba(220, 220, 255, 0.2)">
                {/* Body */}
                <path d="M 0 -30 C -20 0, -20 10, -15 20 L 15 20 C 20 10, 20 0, 0 -30 Z" />
                {/* Window */}
                <circle cx="0" cy="-5" r="8" fill="rgba(130, 200, 255, 0.5)" />
                <circle cx="0" cy="-5" r="4" fill="rgba(220, 220, 255, 0.3)" />
                {/* Fins */}
                <path d="M -15 10 L -25 25 L -15 20 Z" />
                <path d="M 15 10 L 25 25 L 15 20 Z" />
              </g>
              {/* Flame */}
              <path d="M 0 20 L -10 35 L 10 35 Z" fill="rgba(255, 180, 50, 1)">
                <animate
                  attributeName="d"
                  values="M 0 20 L -10 35 L 10 35 Z; M 0 20 L -15 45 L 15 45 Z; M 0 20 L -10 35 L 10 35 Z"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="1; 0.5; 1" dur="0.5s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
          
          {/* WOOP 字母显示 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-white/80 tracking-wider">
              <DecodingText />
            </div>
          </div>
        </div>

        {/* 状态提示 */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            {status === 'GENERATING' && '正在解码时空数据...'}
            {status === 'READY' && '解码完成！'}
            {status === 'FAILED' && '解码失败'}
            {status === 'TIMEOUT' && '解码超时'}
          </h2>
          <p className="text-lg text-slate-200">{getStatusMessage()}</p>
          {status === 'GENERATING' && (
            <p className="text-sm text-slate-300">
              已解码 {Math.floor((attempts * POLL_INTERVAL) / 1000)} 秒
            </p>
          )}
        </div>

        {/* 错误提示 */}
        {(status === 'FAILED' || status === 'TIMEOUT' || error) && (
          <div className="mt-8 w-full max-w-md">
            <div className="rounded-xl border border-red-400/60 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-100 mb-4">{error || getStatusMessage()}</p>
            </div>
          </div>
        )}

        {/* 加载动画提示 */}
        {status === 'GENERATING' && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-sky-200/80">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>
    </StarFieldLayout>
  )
}

// 新增：动态文本解码组件
const DecodingText = () => {
  const [text, setText] = useState('WOOP')
  const chars = '!<>-_\\/[]{}—=+*^?#________'

  useEffect(() => {
    let frameRequest: number
    let frame = 0
    let queue: { from: string; to: string; start: number; end: number; char?: string }[] = []

    const setTextWithAnimation = (newText: string) => {
      const oldText = text
      const length = Math.max(oldText.length, newText.length)
      const promise = new Promise<void>((resolve) => {
        queue = []
        for (let i = 0; i < length; i++) {
          const from = oldText[i] || ''
          const to = newText[i] || ''
          const start = Math.floor(Math.random() * 40)
          const end = start + Math.floor(Math.random() * 40)
          queue.push({ from, to, start, end })
        }
        cancelAnimationFrame(frameRequest)
        frame = 0
        update()
        setTimeout(resolve, 800) // 动画大致完成时间
      })
    }

    const update = () => {
      let output = ''
      let complete = 0
      for (let i = 0, n = queue.length; i < n; i++) {
        let { from, to, start, end, char } = queue[i]
        if (frame >= end) {
          complete++
          output += to
        } else if (frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = chars[Math.floor(Math.random() * chars.length)]
            queue[i].char = char
          }
          output += `<span class="opacity-50">${char}</span>`
        } else {
          output += from
        }
      }
      // 使用 dangerouslySetInnerHTML 来渲染 HTML 标签
      const element = document.getElementById('decoding-text')
      if (element) {
        element.innerHTML = output
      }
      if (complete !== queue.length) {
        frameRequest = requestAnimationFrame(update)
        frame++
      }
    }

    const texts = ['WOOP', 'ANALYSIS', 'DECODING', 'INSIGHTS', 'SYNTHESIS']
    let textIndex = 0
    const interval = setInterval(() => {
      textIndex = (textIndex + 1) % texts.length
      setTextWithAnimation(texts[textIndex])
    }, 2000)

    return () => {
      clearInterval(interval)
      cancelAnimationFrame(frameRequest)
    }
  }, [])

  return <div id="decoding-text">{text}</div>
}

