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
        return '正在生成你的职业洞见报告，请耐心等待...'
      case 'READY':
        return '报告已生成，正在跳转...'
      case 'FAILED':
        return '报告生成失败'
      case 'TIMEOUT':
        return '生成超时'
      default:
        return '处理中...'
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

      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center justify-center min-h-[60vh] relative z-10">
        {/* 视觉效果区域 - 报告生成中 */}
        <div className="relative w-full max-w-md mb-12">
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

          {/* WOOP 字母显示 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-white/80 tracking-wider">
              WOOP
            </div>
          </div>
        </div>

        {/* 状态提示 */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            {status === 'GENERATING' && '正在分析你的对话...'}
            {status === 'READY' && '分析完成！'}
            {status === 'FAILED' && '分析失败'}
            {status === 'TIMEOUT' && '分析超时'}
          </h2>
          <p className="text-lg text-slate-200">{getStatusMessage()}</p>
          {status === 'GENERATING' && (
            <p className="text-sm text-slate-300">
              已等待 {Math.floor((attempts * POLL_INTERVAL) / 1000)} 秒
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

