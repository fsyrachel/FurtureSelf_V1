import { useState } from 'react'
import { BFIData } from '@/services/api'

// --- 1. 数据结构 (保持不变) ---
const BFI_QUESTIONS_LIST = [
  // 外向性
  { key: 'ext1', label: '我喜欢与他人互动', dimension: 'extraversion' },
  { key: 'ext2', label: '我容易在群体中表达自己', dimension: 'extraversion' },
  // 宜人性
  { key: 'agr1', label: '我乐于倾听并理解他人', dimension: 'agreeableness' },
  { key: 'agr2', label: '我倾向于避免冲突', dimension: 'agreeableness' },
  // 尽责性
  { key: 'con1', label: '我会按计划地完成任务', dimension: 'conscientiousness' },
  { key: 'con2', label: '我在做决定前会仔细思考', dimension: 'conscientiousness' },
  // 神经质
  { key: 'neu1', label: '我有时会因为担心而睡不着', dimension: 'neuroticism' },
  { key: 'neu2', label: '我容易因为小事感到不安', dimension: 'neuroticism' },
  // 开放性
  { key: 'opn1', label: '我喜欢探索新的想法', dimension: 'openness' },
  { key: 'opn2', label: '我经常思考不同的可能性', dimension: 'openness' }
];

// --- 2. 内部状态 (保持不变) ---
type RawBfiAnswers = {
  [key: string]: number 
}
const initialRawAnswers: RawBfiAnswers = {
  ext1: 3, ext2: 3, agr1: 3, agr2: 3,
  con1: 3, con2: 3, neu1: 3, neu2: 3,
  opn1: 3, opn2: 3,
}

// --- 3. BFIForm 组件定义 (保持不变) ---
interface BFIFormProps {
  values: BFIData
  onChange: (values: BFIData) => void
  errors?: string[]
}

export function BFIForm({ onChange, errors }: BFIFormProps) {
  const [rawAnswers, setRawAnswers] = useState<RawBfiAnswers>(initialRawAnswers)

  // 内部逻辑 (保持不变)
  const handleRawChange = (key: string, value: number) => {
    const newRawAnswers = { ...rawAnswers, [key]: value }
    setRawAnswers(newRawAnswers)
    
    const newBfiData: BFIData = {
      extraversion: (newRawAnswers.ext1 + newRawAnswers.ext2) / 2,
      agreeableness: (newRawAnswers.agr1 + newRawAnswers.agr2) / 2,
      conscientiousness: (newRawAnswers.con1 + newRawAnswers.con2) / 2,
      neuroticism: (newRawAnswers.neu1 + newRawAnswers.neu2) / 2,
      openness: (newRawAnswers.opn1 + newRawAnswers.opn2) / 2,
    }
    onChange(newBfiData)
  }

  // 计算每个按钮的相对大小 (1和5最大，2和4中等，3最小)
  const getButtonScale = (num: number) => {
    switch (num) {
      case 1:
      case 5:
        return 'scale-125' // 两边最大
      case 2:
      case 4:
        return 'scale-110' // 中等
      case 3:
        return 'scale-95' // 中间最小
      default:
        return ''
    }
  }

  // --- 4. 【关键】修改 UI 渲染 ---
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white">大五人格快速量表 (BFI-2-S简版)</h3>
        <p className="mt-1 text-sm text-slate-200/80">
          请根据下列 10 个描述评估自己，1分代表“非常不同意”，5分代表“非常同意”。
        </p>
      </div>

      <div className="space-y-6">
        {BFI_QUESTIONS_LIST.map((subQ, index) => (
          <div key={subQ.key} className="rounded-xl border border-white/12 bg-white/6 p-5 backdrop-blur-sm">
            
            {/* 问题标签 */}
            <label className="text-base font-medium text-white">
              {index + 1}. {subQ.label}
            </label>
            
            {/* * ---------------------------------------------
              * 【UI 升级】开始：分散、空心圆、渐变大小
              * ---------------------------------------------
            */}
            <div className="mt-4 flex w-full items-center justify-between gap-2"> {/* 使用 justify-between 使按钮分散 */}
              <span className="text-xs text-slate-300">1 (非常不同意)</span>
              
              {/* 5个选择按钮 */}
              <div className="flex flex-1 justify-around gap-1 sm:gap-2"> {/* flex-1 让按钮占据可用空间并分散 */}
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = rawAnswers[subQ.key] === num;
                  const scaleClass = getButtonScale(num); // 获取大小渐变 class
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleRawChange(subQ.key, num)}
                      className={`
                        flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-200 ease-in-out
                        ${isSelected
                          ? 'bg-purple-500 text-white border-purple-400 shadow-lg' // 选中状态
                          : 'bg-transparent text-slate-200 border-white/30 hover:bg-white/10' // 空心默认状态
                        }
                        ${scaleClass} // 应用大小渐变
                      `}
                      style={{ minWidth: '40px', minHeight: '40px' }} // 确保基本大小
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              
              <span className="text-xs text-slate-300">5 (非常同意)</span>
            </div>
            {/* * ---------------------------------------------
              * 【UI 升级】结束
              * ---------------------------------------------
            */}
          </div>
        ))}
      </div>

      {/* 错误显示 (保持不变) */}
      {errors && errors.length > 0 && (
        <div className="rounded-xl border border-red-300/60 bg-red-500/10 p-4 text-sm text-red-200">
          <h4 className="font-semibold text-red-100">请检查以下提示：</h4>
          <ul className="mt-2 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}