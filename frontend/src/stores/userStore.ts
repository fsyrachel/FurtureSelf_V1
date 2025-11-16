/**
 * 用户状态管理 - Zustand Store
 * F1.1: 匿名用户初始化
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
/*           const existingUserId = get().userId

          const response = await axios.post(`${API_URL}/api/v1/user/init`, {
            anonymous_user_id: existingUserId,
          })

          set({
            userId: response.data.user_id,
            status: response.data.status,
            isLoading: false,
          }) */
        
            // 2. 添加我们 Day 2 任务需要的“模拟数据”
          console.log("MOCK: 模拟新用户，强制进入 ONBOARDING 流程...");
          set({
            userId: "fake-user-hys-123",  // 这是一个假的 ID，没关系
            status: "ONBOARDING",        // <--- 这是最关键的一行！
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

