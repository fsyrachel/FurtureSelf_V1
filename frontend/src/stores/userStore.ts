/**
 * 用户状态管理 - Zustand Store
 * F1.1: 匿名用户初始化
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../services/api'

// UUID 验证正则表达式
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 验证字符串是否是有效的 UUID
 */
function isValidUUID(str: string | null): boolean {
  if (!str) return false
  return UUID_REGEX.test(str)
}

interface UserState {
  userId: string | null
  status: 'ONBOARDING' | 'ACTIVE' | null
  isLoading: boolean
  error: string | null
  
  // Actions
  initializeUser: () => Promise<void>
  setStatus: (status: 'ONBOARDING' | 'ACTIVE') => void
  reset: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      userId: null,
      status: null,
      isLoading: false,
      error: null,

      /**
       * F1.1: 初始化匿名用户
       */
      initializeUser: async () => {
        set({ isLoading: true, error: null })

        try {
          let existingUserId = get().userId

          // 验证 userId 是否是有效的 UUID
          // 如果不是（比如旧的 mock 数据 "fake-user-hys-123"），则重置为 null
          if (existingUserId && !isValidUUID(existingUserId)) {
            console.warn(`Invalid UUID in localStorage: ${existingUserId}, resetting to null`)
            existingUserId = null
          }

          const response = await apiClient.initUser(existingUserId)

          set({
            userId: response.user_id,
            status: response.status,
            isLoading: false,
          })

        } catch (error) {
          console.error('Failed to initialize user:', error)
          set({
            error: 'Failed to initialize user',
            isLoading: false,
          })
        }
      },

      setStatus: (status) => set({ status }),

      /**
       * F6.7: 重置会话 (仅开发环境)
       */
      reset: () => {
        set({
          userId: null,
          status: null,
          isLoading: false,
          error: null,
        })
        
        // 清空 localStorage
        localStorage.clear()
        
        // 刷新页面
        window.location.reload()
      },
    }),
    {
      name: 'user-storage', // localStorage key
      partialize: (state) => ({
        userId: state.userId,
        status: state.status,
      }),
    }
  )
)