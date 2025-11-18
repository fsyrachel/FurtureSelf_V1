/**
 * F6.6: 信件处理等待页面
 * 实现状态轮询和未来时空信息传输视觉效果
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout'
import { useUserStore } from '@/stores/userStore'
import apiClient from '@/services/api'
import Button from '@/components/common/Button'

const POLL_INTERVAL = 3000 // 3秒
const MAX_ATTEMPTS = 60 // 最多60次（3分钟）

type ProcessingStatus = 'PENDING' | 'REPLIES_READY' | 'FAILED' | 'TIMEOUT'

export default function LetterProcessingPage() {
  const navigate = useNavigate()
  const { userId } = useUserStore((state) => ({
    userId: state.userId,
  }))

  const [status, setStatus] = useState<ProcessingStatus>('PENDING')
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
        setError('处理超时，请返回重新提交。')
        return
      }

      try {
        const response = await apiClient.getLetterStatus(userId)
        currentAttempts++
        setAttempts(currentAttempts)

        if (response.status === 'REPLIES_READY') {
          setStatus('REPLIES_READY')
          // 清除 sessionStorage
          sessionStorage.removeItem('letter_draft')
          // 跳转到收信箱
          navigate('/inbox')
          return
        }

        if (response.status === 'FAILED') {
          setStatus('FAILED')
          // 从 sessionStorage 读取内容
          const content = sessionStorage.getItem('letter_draft')
          if (content) {
            navigate('/letter/write', {
              state: { content, reason: 'failed' },
            })
          } else {
            setError('信件处理失败，请返回重新提交。')
          }
          return
        }

        // PENDING 状态，继续轮询
        if (response.status === 'PENDING') {
          pollTimer = setTimeout(pollStatus, POLL_INTERVAL)
        }
      } catch (err: any) {
        console.error('Failed to poll letter status', err)
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

  const handleReturnToWrite = () => {
    const content = sessionStorage.getItem('letter_draft')
    navigate('/letter/write', {
      state: { content: content || '', reason: status === 'TIMEOUT' ? 'timeout' : 'failed' },
    })
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'PENDING':
        return '时空数据包正在量子网络中穿梭，AI 领航员正在为该信号匹配最优的未来时间线...'
      case 'REPLIES_READY':
        return '成功接收到来自未来的回响！正在解码数据并传送至你的信号接收站...'
      case 'FAILED':
        return '数据包在传输过程中损坏'
      case 'TIMEOUT':
        return '与未来时间线的链接超时'
      default:
        return '正在建立链接...'
    }
  }

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32 relative overflow-hidden">
      {/* 背景太空元素 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* 星云效果 - 左侧 */}
        <div
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 100%)',
            animation: 'pulse 8s ease-in-out infinite',
          }}
        ></div>

        {/* 星云效果 - 右侧 */}
        <div
          className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full blur-3xl opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.5) 0%, rgba(168, 85, 247, 0.3) 50%, transparent 100%)',
            animation: 'pulse 10s ease-in-out infinite',
            animationDelay: '2s',
          }}
        ></div>

        {/* 螺旋星云 - 中心偏上 */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.4) 0%, rgba(139, 92, 246, 0.2) 30%, transparent 70%)',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            animation: 'spin 30s linear infinite',
          }}
        ></div>

        {/* 星星 - 随机分布 */}
        {[...Array(30)].map((_, i) => {
          const size = Math.random() * 3 + 1
          const left = Math.random() * 100
          const top = Math.random() * 100
          const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399']
          const color = colors[Math.floor(Math.random() * colors.length)]
          const delay = Math.random() * 3
          return (
            <div
              key={`star-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: color,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            ></div>
          )
        })}

        {/* 大星星 - 特殊位置 */}
        {[
          { left: '15%', top: '20%', color: '#fbbf24', size: 4 },
          { left: '85%', top: '30%', color: '#60a5fa', size: 5 },
          { left: '10%', top: '70%', color: '#f472b6', size: 3 },
          { left: '90%', top: '80%', color: '#34d399', size: 4 },
        ].map((star, i) => (
          <div
            key={`big-star-${i}`}
            className="absolute rounded-full"
            style={{
              left: star.left,
              top: star.top,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: star.color,
              boxShadow: `0 0 ${star.size * 4}px ${star.color}, 0 0 ${star.size * 8}px ${star.color}40`,
              animation: `twinkle ${3 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          ></div>
        ))}

        {/* 行星/星体 */}
        {[
          { left: '20%', top: '15%', size: 60, color: 'rgba(59, 130, 246, 0.3)' },
          { left: '75%', top: '25%', size: 40, color: 'rgba(139, 92, 246, 0.25)' },
          { left: '5%', top: '60%', size: 50, color: 'rgba(236, 72, 153, 0.2)' },
          { left: '95%', top: '70%', size: 45, color: 'rgba(168, 85, 247, 0.25)' },
        ].map((planet, i) => (
          <div
            key={`planet-${i}`}
            className="absolute rounded-full blur-sm"
            style={{
              left: planet.left,
              top: planet.top,
              width: `${planet.size}px`,
              height: `${planet.size}px`,
              background: `radial-gradient(circle at 30% 30%, ${planet.color}, transparent)`,
              transform: 'translate(-50%, -50%)',
              animation: `float ${15 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          ></div>
        ))}

        {/* 流星效果 */}
        {[...Array(3)].map((_, i) => (
          <div
            key={`meteor-${i}`}
            className="absolute"
            style={{
              left: `${20 + i * 30}%`,
              top: `${10 + i * 15}%`,
              width: '2px',
              height: '100px',
              background: 'linear-gradient(to bottom, rgba(96, 165, 250, 0.8), transparent)',
              transform: `rotate(${-45 + i * 10}deg)`,
              animation: `meteor ${3 + i}s linear infinite`,
              animationDelay: `${i * 2}s`,
            }}
          ></div>
        ))}
      </div>

      {/* 添加 CSS 动画 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-20px); }
        }
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
        {/* 视觉效果区域 - 未来时空信息传输 */}
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

          {/* 粒子效果 */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30) * (Math.PI / 180)
            const radius = 100
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            return (
              <div
                key={i}
                className="absolute w-2 h-2 bg-sky-300 rounded-full"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: 'translate(-50%, -50%)',
                  animation: `pulse 2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              ></div>
            )
          })}

          {/* 数据传输线条 */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) * (Math.PI / 180)
              const x1 = 50 + Math.cos(angle) * 20
              const y1 = 50 + Math.sin(angle) * 20
              const x2 = 50 + Math.cos(angle) * 35
              const y2 = 50 + Math.sin(angle) * 35
              return (
                <line
                  key={i}
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="url(#gradient)"
                  strokeWidth="1"
                  className="animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              )
            })}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>

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
        </div>

        {/* 状态提示 */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            {status === 'PENDING' && '正在打开时空隧道...'}
            {status === 'REPLIES_READY' && '链接已建立！'}
            {status === 'FAILED' && '信号传输中断'}
            {status === 'TIMEOUT' && '信号传输超时'}
          </h2>
          <p className="text-lg text-slate-200">{getStatusMessage()}</p>
          {status === 'PENDING' && (
            <p className="text-sm text-slate-300">
              已进入时空曲率航行 {Math.floor((attempts * POLL_INTERVAL) / 1000)} 秒
            </p>
          )}
        </div>

        {/* 错误提示和返回按钮 */}
        {(status === 'FAILED' || status === 'TIMEOUT' || error) && (
          <div className="mt-8 w-full max-w-md">
            <div className="rounded-xl border border-red-400/60 bg-red-500/10 p-6 text-center">
              <p className="text-sm text-red-100 mb-4">{error || getStatusMessage()}</p>
              <Button onClick={handleReturnToWrite} variant="outline">
                返回时空胶囊封装页
              </Button>
            </div>
          </div>
        )}

        {/* 加载动画提示 */}
        {status === 'PENDING' && (
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

