/**
 * F2.2: 创建未来档案页面
 * Day 3 任务：实现 "先构想，再命名" 的两步走流程
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarFieldLayout from '@/components/layouts/StarFieldLayout' // (复用漂亮的背景)
import { useUserStore } from '@/stores/userStore'
import apiClient, { FutureProfileCreate } from '@/services/api'
import Button from '@/components/common/Button' // (复用漂亮的按钮)

// 模块一：共享的构想
// 模块一：共享的构想 (升级版 v2)
const ConceptionForm = ({ data, setData, onNext }: any) => {
  const handleChange = (field: string, value: string) => {
    setData((prev: any) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-8">
      
      {/* 模块一：价值观 */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <label className="text-xl font-bold text-white">
          航线参数 1: 核心价值锚点——请描述一下你认为未来的职业什么是最重要的
        </label>
        <ul className="list-disc list-inside text-sm text-slate-300 mt-3 space-y-2 pl-2">
          <li>
            例如抛开金钱和地位，对你而言，一份‘完美’的工作最不可或缺的要素是什么？
          </li>
          <li>
            例如“你最敬佩哪位职业人士（现实或虚构均可）？请具体描述他/她身上的哪些特质吸引你。”
          </li>
        </ul>
        <textarea 
          value={data.future_values}
          onChange={(e) => handleChange('future_values', e.target.value)}
          className="w-full p-3 mt-4 text-white bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300/30" 
          rows={5} 
          placeholder="我的核心驱动力是..."
        />
      </div>

      {/* 模块二：愿景 */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <label className="text-xl font-bold text-white">
          航线参数 2: 理想未来愿景——请尽情畅想，未来的你处在最理想、最满意的职业状态
        </label>
        <ul className="list-disc list-inside text-sm text-slate-300 mt-3 space-y-2 pl-2">
          <li>
            例如“详细描述一个普通的工作日，从早晨醒来直到晚上休息，你都在做什么、想什么、感受如何？”
          </li>
          <li>
            例如“你认为未来最可能从事的职业是什么？描述一下那个‘最可能自我’的日常状态。”
          </li>
          <li>
            或者“描述一个你绝对不想成为的‘未来自我’是什么样的？他/她的生活和工作状态如何？”
          </li>
        </ul>
        <textarea 
          value={data.future_vision}
          onChange={(e) => handleChange('future_vision', e.target.value)}
          className="w-full p-3 mt-4 text-white bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300/30" 
          rows={5} 
          placeholder="在理想的时间线中，我每天会..."
        />
      </div>
      
      {/* 模块三：障碍 */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <label className="text-xl font-bold text-white">
          航线参数 3: 识别潜在的现实扭曲力场——你认为目前你需要克服什么困难
        </label>
        <ul className="list-disc list-inside text-sm text-slate-300 mt-3 space-y-2 pl-2">
          <li>
            例如“在思考未来职业时，你内心最大的担忧或恐惧是什么？”
          </li>
          <li>
            例如“想象一下，如果你在职业上‘失败’了，那会是什么样的场景？你认为导致失败的最大可能原因是什么？”
          </li>
          <li>
            或者“在你通往理想职业的道路上，你认为存在哪些内部（如自我怀疑）和外部（如家庭压力）的障碍？”
          </li>
        </ul>
        <textarea 
          value={data.future_obstacles}
          onChange={(e) => handleChange('future_obstacles', e.target.value)}
          className="w-full p-3 mt-4 text-white bg-black/20 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-300/30" 
          rows={5} 
          placeholder="要想到达理想的未来，我需要克服..."
        />
      </div>

      <Button onClick={onNext} className="w-full">
        参数设定完成，开始构建未来化身
      </Button>
    </div>
  )
}

// 模块二：命名人设
const NamingForm = ({ conceptionData, onBack, onSubmit, isLoading }: any) => {
  // 允许用户输入 1-3 个人设名称
  const [profileNames, setProfileNames] = useState(['', '', ''])
  
  const handleNameChange = (index: number, value: string) => {
    const newNames = [...profileNames]
    newNames[index] = value
    setProfileNames(newNames)
  }

  const handleSubmit = () => {
    // 过滤掉空的人设名称
    const filledNames = profileNames.filter(name => name.trim().length > 0)
    if (filledNames.length === 0) {
      alert("请至少填写一个人设名称")
      return
    }

    // 按照你的设想，把“共享构想”和“人设名称”打包
    const payload: FutureProfileCreate = {
      profiles: filledNames.map(name => ({
        profile_name: name.trim(),
        future_values: conceptionData.future_values, //
        future_vision: conceptionData.future_vision, //
        future_obstacles: conceptionData.future_obstacles, //
      }))
    }
    onSubmit(payload)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold text-white">命名你的未来化身 (1-3个)</h2>
        <p className="text-sm text-slate-300 mt-2">
          基于刚才设定的航线参数，为你在平行时空中的不同可能性命名。
        </p>
        
        <div className="space-y-4 mt-6">
          <input 
            type="text" 
            value={profileNames[0]}
            onChange={(e) => handleNameChange(0, e.target.value)}
            className="w-full p-3 text-white bg-black/20 border border-white/20 rounded-lg" 
            placeholder="未来化身 1 (例如: UX研究员)"
          />
          <input 
            type="text" 
            value={profileNames[1]}
            onChange={(e) => handleNameChange(1, e.target.value)}
            className="w-full p-3 text-white bg-black/20 border border-white/20 rounded-lg" 
            placeholder="未来化身 2 (可选, 例如: 继续读博的我)"
          />
          <input 
            type="text" 
            value={profileNames[2]}
            onChange={(e) => handleNameChange(2, e.target.value)}
            className="w-full p-3 text-white bg-black/20 border border-white/20 rounded-lg" 
            placeholder="未来化身 3 (可选, 例如: 自由职业者)"
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          返回修改航线参数
        </Button>
        <Button onClick={handleSubmit} loading={isLoading} className="flex-1">
          建立时空链接
        </Button>
      </div>
    </div>
  )
}

// 主页面
export default function FutureProfilePage() {
  const navigate = useNavigate()
  const { userId, setStatus } = useUserStore((state) => ({
    userId: state.userId,
    setStatus: state.setStatus,
  }))

  const [currentStep, setCurrentStep] = useState(1) // 1 = 构想, 2 = 命名
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // 步骤1的共享数据
  const [conceptionData, setConceptionData] = useState({
    future_values: '',
    future_vision: '',
    future_obstacles: '',
  })

  // 最终提交
  const handleSubmit = async (payload: FutureProfileCreate) => {
    if (!userId) {
      setSubmitError("用户未初始化")
      return
    }

    setIsLoading(true)
    setSubmitError(null)
    
    try {
      // 1. 调用你模拟的 F2.2 API
      await apiClient.createFutureProfiles(userId, payload)
      
      // 2. (最终!) 更新状态为 ACTIVE
      setStatus('ACTIVE')
      
      // 3. (最终!) 跳转到首页！
      navigate('/')
      
    } catch (err) {
      console.error("提交 F2.2 失败:", err)
      setSubmitError("提交失败，请稍后重试。")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StarFieldLayout className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.45rem] text-sky-200/80">
            未来构想
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
            {currentStep === 1 ? '信标 02: 设定未来航线' : '创建未来化身'}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200">
            {currentStep === 1 
              ? "这是校准航线的关键一步。请回答三个核心问题，为未来的可能性建模。" 
              : "现在，为你刚才的构想命名 1-3 个未来化身。"}
          </p>
        </header>

        <section className="rounded-[32px] border border-white/10 bg-white/8 p-10 shadow-[0_45px_140px_-45px_rgba(99,121,255,0.58)] backdrop-blur-xl">
          {currentStep === 1 && (
            <ConceptionForm 
              data={conceptionData} 
              setData={setConceptionData} 
              onNext={() => setCurrentStep(2)} 
            />
          )}

          {currentStep === 2 && (
            <NamingForm 
              conceptionData={conceptionData}
              onBack={() => setCurrentStep(1)}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}

          {submitError && <p className="text-red-400 mt-4">{submitError}</p>}
        </section>
      </div>
    </StarFieldLayout>
  )
}