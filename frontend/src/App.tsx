import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

// Pages
import HomePage from '@/pages/HomePage'
import OnboardingPage from '@/pages/OnboardingPage'
import ProfileQuestionnairePage from '@/pages/ProfileQuestionnairePage'
import FutureProfilePage from '@/pages/FutureProfilePage'
import WriteLetterPage from '@/pages/WriteLetterPage'
import LetterProcessingPage from '@/pages/LetterProcessingPage'
import InboxPage from '@/pages/InboxPage'
import LetterReplyPage from '@/pages/LetterReplyPage'
import ChatPage from '@/pages/ChatPage'
import ReportProcessingPage from '@/pages/ReportProcessingPage'
import ReportPage from '@/pages/ReportPage'

// Hooks & Store
import { useUserStore } from '@/stores/userStore'

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const { initializeUser, status } = useUserStore()

  useEffect(() => {
    // 初始化用户
    initializeUser()
  }, [initializeUser])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* 根路由 - 根据状态重定向 */}
          <Route 
            path="/" 
            element={
              status === 'ONBOARDING' 
                ? <Navigate to="/onboarding" replace /> 
                : <HomePage />
            } 
          />

          {/* 入职流程 */}
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/profile/questionnaire" element={<ProfileQuestionnairePage />} />
          <Route path="/profile/future" element={<FutureProfilePage />} />

          {/* 核心交互 */}
          <Route path="/letter/write" element={<WriteLetterPage />} />
          <Route path="/letter/processing" element={<LetterProcessingPage />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/letter/reply/:replyId" element={<LetterReplyPage />} />
          <Route path="/chat/:futureProfileId" element={<ChatPage />} />
          <Route path="/report/processing" element={<ReportProcessingPage />} />
          <Route path="/report" element={<ReportPage />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

