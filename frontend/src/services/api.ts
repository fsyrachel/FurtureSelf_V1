/**
 * API 客户端 - v1.5
 * 
 * 基于 Axios 的 HTTP 客户端，封装所有后端 API 调用
 * 参考: docs/API_v1.5.md
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============= 类型定义 =============

// F2.1: 当前档案 (v1.3)
export interface DemoData {
  name: string;
  age: number;
  gender: string;
  status: string;
  field: string;
  interests: string;  // 后端期望字符串，不是数组
  location: string;
  future_location: string;
}

export interface ValsData {
  self_direction: number;  // 1-5
  stimulation: number;
  hedonism: number;
  achievement: number;
  power: number;
  security: number;
  conformity: number;
  tradition: number;
  benevolence: number;
  universalism: number;
}

export interface BFIData {
  extraversion: number;  // 1.0-5.0
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
  openness: number;
}

export interface CurrentProfileCreate {
  demo_data: DemoData;
  vals_data: ValsData;
  bfi_data: BFIData;
}

// F2.2: 未来档案 (v1.3)
export interface FutureProfileItem {
  profile_name: string;
  future_values: string;
  future_vision: string;
  future_obstacles: string;
}

export interface FutureProfileCreate {
  profiles: FutureProfileItem[];
}

export interface FutureProfileCreatedItem {
  future_profile_id: string;
  profile_name: string;
}

// F1.1: 用户
export interface UserInitResponse {
  user_id: string;
  status: 'ONBOARDING' | 'ACTIVE';
}

// F3.1: 信件
export interface LetterSubmit {
  content: string;
}

export interface LetterResponse {
  letter_id: string;
  status: string;
}

export interface LetterReplyResponse {
  reply_id: string;
  future_profile_id: string;
  from_profile_name: string;
  content: string;
  chat_status: 'NOT_STARTED' | 'COMPLETED';
}

export interface InboxReplyItem {
  reply_id: string;
  future_profile_id: string;
  from_profile_name: string;
  chat_status: 'NOT_STARTED' | 'COMPLETED';
}

export interface InboxResponse {
  letter_id: string;
  letter_content_snippet: string;
  replies: InboxReplyItem[];
}

// F3.2: 聊天
export interface ChatMessageSend {
  user_id: string;
  content: string;
}

export interface ChatMessageResponse {
  message_id: string;
  sender: 'USER' | 'AGENT';
  content: string;
  created_at: string;
}

// F5: 报告
export interface ReportGenerate {
  letter_id?: string;  // 可选：指定信件ID
  future_profile_id?: string;  // 可选：指定未来人设ID
}

export interface ReportStatusResponse {
  status: 'GENERATING' | 'READY' | 'FAILED';
}

export interface WOOPContent {
  wish: string;  // Wish
  outcome: string;  // Outcome
  obstacle: string;  // Obstacle
  plan: string;  // Plan
}

export interface ReportResponse {
  report_id: string;
  status: string;
  content: WOOPContent;
  created_at: string;
}

// ============= API 客户端类 =============

class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,  // 30秒超时
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 响应拦截器：错误处理
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError) {
    if (error.response) {
      // 服务器返回错误
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // 请求发出但未收到响应
      console.error('Network Error:', error.message);
    } else {
      // 其他错误
      console.error('Request Error:', error.message);
    }
  }

  // ============= F1: 用户 =============

  async initUser(anonymousUserId: string | null = null): Promise<UserInitResponse> {
    const { data } = await this.client.post<UserInitResponse>('/user/init', {
      anonymous_user_id: anonymousUserId,
    });
    return data;
  }

  // ============= F2: 档案 =============

  async createCurrentProfile(
    userId: string,
    profile: CurrentProfileCreate
  ): Promise<{ status: string }> {
    const { data } = await this.client.post(
      `/profile/current?user_id=${userId}`,
      profile
    );
    return data;
  }

  async createFutureProfiles(
    userId: string,
    profiles: FutureProfileCreate
  ): Promise<{
    status: string;
    user_id: string;
    created_profiles: FutureProfileCreatedItem[];
  }> {
    const { data } = await this.client.post(
      `/profile/future?user_id=${userId}`,
      profiles
    );
    return data;
  }

  // ============= F3.1: 信件 =============

  async submitLetter(
    userId: string,
    letter: LetterSubmit
  ): Promise<LetterResponse> {
    const { data } = await this.client.post<LetterResponse>(
      `/letters/submit?user_id=${userId}`,
      letter
    );
    return data;
  }

  async getLetterStatus(userId: string): Promise<{ status: string; content: string | null }> {
    const { data } = await this.client.get(`/letters/status?user_id=${userId}`);
    return data;
  }

  async getLetterReply(replyId: string): Promise<LetterReplyResponse> {
    const { data } = await this.client.get<LetterReplyResponse>(
      `/letters/reply/${replyId}`
    );
    return data;
  }

  async getInbox(userId: string): Promise<InboxResponse> {
    const { data } = await this.client.get<InboxResponse>(
      `/letters/inbox/latest?user_id=${userId}`
    );
    return data;
  }

  // ============= F3.2: 聊天 =============

  async getChatHistory(
    futureProfileId: string,
    userId: string
  ): Promise<ChatMessageResponse[]> {
    const { data } = await this.client.get<ChatMessageResponse[]>(
      `/chat/${futureProfileId}/history?user_id=${userId}`
    );
    return data;
  }

  async sendChatMessage(
    futureProfileId: string,
    message: ChatMessageSend
  ): Promise<ChatMessageResponse> {
    const { data } = await this.client.post<ChatMessageResponse>(
      `/chat/${futureProfileId}/send`,
      message
    );
    return data;
  }

  // ============= F5: 报告 =============
  
  async generateReport(
    letterId?: string,
    futureProfileId?: string
  ): Promise<{ report_id: string; status: string; letter_id?: string; future_profile_id?: string }> {
    const { data } = await this.client.post(`/report/generate`, {
      letter_id: letterId || null,
      future_profile_id: futureProfileId || null
    });
    return data;
  }

  async getReportStatus(userId: string): Promise<ReportStatusResponse> {
    const { data } = await this.client.get(`/report/status?user_id=${userId}`);
    return data;
  }

  async getLatestReport(userId: string): Promise<ReportResponse> {
    const { data } = await this.client.get(`/report/latest?user_id=${userId}`);
    return data;
  }
}

// 导出单例实例
export const apiClient = new APIClient();
export default apiClient;