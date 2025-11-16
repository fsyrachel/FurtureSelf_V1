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
  status: string;
  field: string;
  interests: string[];
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
  user_id: string;
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
    console.log("MOCK (F2.1): 假装正在提交问卷数据:", userId, profile);
    /* const { data } = await this.client.post(
      `/profile/current?user_id=${userId}`,
      profile
    ); */
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟 1 秒延迟
    console.log('MOCK (F2.1): 问卷提交成功！');
    return { status: 'CURRENT_PROFILE_SAVED' }; // <--- 模拟成功返回
  }

  async createFutureProfiles(
    userId: string,
    profiles: FutureProfileCreate
  ): Promise<{
    status: string;
    user_id: string;
    created_profiles: FutureProfileCreatedItem[];
  }> {
    console.log("MOCK (F2.2): 假装正在提交未来人设:", userId, profiles);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟 1 秒延迟
    const created = profiles.profiles.map((profile, index) => ({
      future_profile_id: `mock-future-profile-${index + 1}`,
      profile_name: profile.profile_name,
    }));
    console.log('MOCK (F2.2): 未来人设提交成功！');
    return {
      status: 'ACTIVE',
      user_id: userId,
      created_profiles: created,
    };
  }

  // ============= F3.1: 信件 =============

  async submitLetter(
    userId: string,
    letter: LetterSubmit
  ): Promise<LetterResponse> {
    console.log("MOCK (F3.1.2): 假装正在提交信件:", userId, letter);
    /* const { data } = await this.client.post<LetterResponse>(
      `/letters/submit?user_id=${userId}`,
      letter
    ); */
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 模拟 1 秒延迟
    console.log('MOCK (F3.1.2): 信件提交成功！');
    return {
      letter_id: `mock-letter-${Date.now()}`,
      status: 'SUBMITTED'
    };
  }

  async getLetterStatus(userId: string): Promise<{ status: string }> {
    console.log("MOCK (F6.6): 假装正在轮询信件状态:", userId);
    /* const { data } = await this.client.get(`/letters/status?user_id=${userId}`);
    return data; */
    // 模拟处理过程：前几次返回 PENDING，然后返回 REPLIES_READY
    await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟网络延迟
    // 这里可以根据实际需求返回不同状态
    // 为了测试，我们可以随机返回状态，或者使用一个计数器
    const mockStatus = Math.random() > 0.3 ? 'PENDING' : 'REPLIES_READY';
    console.log(`MOCK (F6.6): 返回状态: ${mockStatus}`);
    return { status: mockStatus };
  }

  async getLetterReply(replyId: string): Promise<LetterReplyResponse> {
    console.log("MOCK (F3.1.3): 假装正在获取回信:", replyId);
    /* const { data } = await this.client.get<LetterReplyResponse>(
      `/letters/reply/${replyId}`
    );
    return data; */
    await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟网络延迟
    
    // 根据 replyId 返回不同的 mock 数据
    const isFirstReply = replyId.includes('mock-reply-1');
    
    console.log('MOCK (F3.1.3): 回信加载成功！');
    return {
      reply_id: replyId,
      future_profile_id: isFirstReply ? 'mock-future-profile-1' : 'mock-future-profile-2',
      from_profile_name: isFirstReply ? 'UX研究员' : '继续读博的我',
      content: `亲爱的过去的我，

我记得你现在的感受，那种站在十字路口的迷茫和不安。我想告诉你，你现在所担心的技术背景问题，在未来并没有成为真正的障碍。

当我在思考是否要继续读博，还是进入工业界时，我也曾有过同样的焦虑。但后来我发现，真正重要的是你对用户研究的热情，以及你对人和技术之间关系的好奇。这种好奇心比任何技术背景都更加珍贵。

我现在在一家专注于用户体验的科技公司工作，领导一个小型研究团队。我每天的工作就是在用户和技术之间搭建桥梁，用研究的方法理解用户需求，然后将这些需求转化为产品团队能够理解的语言。

你现在的担心是可以理解的，但请相信，技术背景可以通过学习来补足，而对用户的同理心和研究能力却是更难培养的。你的计算机背景实际上是一个优势，因为它让你能够理解技术实现的可能性和限制。

我的建议是：不要被恐惧驱动，而是被你的信念和价值感指引。如果你真的热爱用户研究，那就勇敢地朝这个方向前进。无论是读博还是进入工业界，只要你的初心不变，你都能找到属于自己的道路。

未来的我，希望你能够继续带着这份初心，勇敢地生活，坚定地创造。

愿你一切顺利。

未来的你`,
      chat_status: isFirstReply ? 'NOT_STARTED' : 'COMPLETED',
    };
  }

  async getInbox(userId: string): Promise<InboxResponse> {
    console.log("MOCK (F6.5): 假装正在获取收信箱:", userId);
    /* const { data} = await this.client.get<InboxResponse>(
      `/letters/inbox/latest?user_id=${userId}`
    );
    return data; */
    await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟网络延迟
    
    // 模拟返回多个回信（假设用户创建了2个未来人设）
    const mockReplies = [
      {
        reply_id: `mock-reply-1-${Date.now()}`,
        future_profile_id: 'mock-future-profile-1',
        from_profile_name: 'UX研究员',
        chat_status: 'NOT_STARTED' as const,
      },
      {
        reply_id: `mock-reply-2-${Date.now()}`,
        future_profile_id: 'mock-future-profile-2',
        from_profile_name: '继续读博的我',
        chat_status: 'COMPLETED' as const,
      },
    ];
    
    console.log('MOCK (F6.5): 收信箱加载成功！');
    return {
      letter_id: `mock-letter-${Date.now()}`,
      letter_content_snippet: '亲爱的未来的我，我现在正处于人生的十字路口，内心充满了迷茫与期待...',
      replies: mockReplies,
    };
  }

  // ============= F3.2: 聊天 =============

  async getChatHistory(
    futureProfileId: string,
    userId: string
  ): Promise<ChatMessageResponse[]> {
    console.log("MOCK (F3.2.3): 假装正在获取聊天历史:", futureProfileId, userId);
    /* const { data } = await this.client.get<ChatMessageResponse[]>(
      `/chat/${futureProfileId}/history?user_id=${userId}`
    );
    return data; */
    await new Promise((resolve) => setTimeout(resolve, 500)); // 模拟网络延迟
    
    // 模拟返回空的聊天历史（新对话）或已有的对话
    // 可以从 localStorage 获取模拟的历史记录
    const storageKey = `chat_history_${futureProfileId}`;
    const storedHistory = localStorage.getItem(storageKey);
    
    if (storedHistory) {
      const history = JSON.parse(storedHistory);
      console.log('MOCK (F3.2.3): 从 localStorage 恢复聊天历史');
      return history;
    }
    
    console.log('MOCK (F3.2.3): 返回空聊天历史');
    return [];
  }

  async sendChatMessage(
    futureProfileId: string,
    message: ChatMessageSend
  ): Promise<ChatMessageResponse> {
    console.log("MOCK (F3.2.2): 假装正在发送消息:", futureProfileId, message);
    /* const { data } = await this.client.post<ChatMessageResponse>(
      `/chat/${futureProfileId}/send`,
      message
    );
    return data; */
    
    // 模拟 AI 响应延迟
    await new Promise((resolve) => setTimeout(resolve, 1500)); // 模拟 1.5 秒延迟
    
    // 检查消息数量限制
    const storageKey = `chat_history_${futureProfileId}`;
    const storedHistory = localStorage.getItem(storageKey);
    const history: ChatMessageResponse[] = storedHistory ? JSON.parse(storedHistory) : [];
    const userMessageCount = history.filter(msg => msg.sender === 'USER').length;
    
    if (userMessageCount >= 5) {
      throw new Error('MESSAGE_LIMIT_EXCEEDED');
    }
    
    // 创建用户消息
    const userMessage: ChatMessageResponse = {
      message_id: `mock-msg-user-${Date.now()}`,
      sender: 'USER',
      content: message.content,
      created_at: new Date().toISOString(),
    };
    
    // 创建 AI 回复
    const aiMessage: ChatMessageResponse = {
      message_id: `mock-msg-agent-${Date.now()}`,
      sender: 'AGENT',
      content: `关于你的问题"${message.content}"，我的建议是：首先，保持对目标的清晰认知。你的担心是可以理解的，但请相信，通过持续的学习和实践，你能够克服这些挑战。未来的你已经证明，坚持初心和持续学习是成功的关键。`,
      created_at: new Date().toISOString(),
    };
    
    // 保存到 localStorage
    const newHistory = [...history, userMessage, aiMessage];
    localStorage.setItem(storageKey, JSON.stringify(newHistory));
    
    console.log('MOCK (F3.2.2): 消息发送成功！');
    return aiMessage;
  }

  // ============= F5: 报告 =============
  
  async generateReport(userId: string): Promise<void> {
    console.log("MOCK (F5.1): 假装触发报告生成:", userId)
    // 标记开始时间与状态到 localStorage，用于轮询判断
    const key = `report_generation_${userId}`
    const payload = { startedAt: Date.now(), status: 'GENERATING' as 'GENERATING' }
    localStorage.setItem(key, JSON.stringify(payload))
    // 模拟网络/处理延迟
    await new Promise((r) => setTimeout(r, 500))
  }

  async getReportStatus(userId: string): Promise<ReportStatusResponse> {
    console.log("MOCK (F5.3): 轮询报告状态:", userId)
    const key = `report_generation_${userId}`
    const raw = localStorage.getItem(key)
    // 若从未触发过，视为仍在生成（前端会继续轮询）
    if (!raw) {
      return { status: 'GENERATING' }
    }
    const data = JSON.parse(raw) as { startedAt: number; status: 'GENERATING' | 'READY' }
    const elapsed = Date.now() - data.startedAt
    // 模拟 10 秒生成完成
    const ready = elapsed >= 10_000
    const status: 'GENERATING' | 'READY' = ready ? 'READY' : 'GENERATING'
    if (status !== data.status) {
      localStorage.setItem(key, JSON.stringify({ ...data, status }))
    }
    return { status }
  }

  async getLatestReport(userId: string): Promise<ReportResponse> {
    console.log("MOCK (F5.2): 获取最新报告:", userId)
    const key = `report_generation_${userId}`
    const raw = localStorage.getItem(key)
    const data = raw ? (JSON.parse(raw) as { startedAt: number; status: string }) : null
    if (!data || data.status !== 'READY') {
      // 模拟后端未就绪的语义：抛出 404 等价错误
      throw new Error('REPORT_NOT_READY')
    }

    // 生成一份示例 WOOP 报告内容
    const mock: ReportResponse = {
      report_id: `mock-report-${Date.now()}`,
      status: 'READY',
      created_at: new Date().toISOString(),
      content: {
        wish: '成为能够连接用户与技术的优秀产品研究者',
        outcome: '清晰的研究方向与方法论，产出对产品决策有影响力的洞见',
        obstacle: '对技术栈不自信、信息过载、时间管理与反馈不足',
        plan: '每周固定2次文献/案例精读；与工程同学结对做一次小项目；为每个调研设定可验证的决策问题与成功标准',
      },
    }
    // 可选：清理状态或保留
    return mock
  }
}

// 导出单例实例
export const apiClient = new APIClient();
export default apiClient;

