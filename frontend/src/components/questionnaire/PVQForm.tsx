import { ValsData } from '@/services/api'

// --- 1. 数据结构 (保持不变) ---
interface PVQFormProps {
  values: ValsData
  onChange: (values: ValsData) => void
}

// --- 2. 【关键】使用你提供的“新”问卷内容 ---
const PVQ_ITEMS: Array<{ key: keyof ValsData; label: string; description: string }> = [
  { key: 'self_direction', label: '1. 我希望能自由地做出自己的选择。', description: '自我导向 Self-Direction' },
  { key: 'stimulation', label: '2. 我希望有机会冒险并探索新事物。', description: '刺激 Stimulation' },
  { key: 'benevolence', label: '3. 我关心他人，并希望能帮助他们。', description: '仁慈 Benevolence' },
  { key: 'power', label: '4. 我希望被他人尊重并受到赞赏。', description: '权力 Power' },
  { key: 'security', label: '5. 我重视社会的安全与稳定。', description: '安全 Security' },
  { key: 'hedonism', label: '6. 我希望生活充满乐趣与新体验。', description: '享乐 Hedonism' },
  { key: 'universalism', label: '7. 我关心自然环境。', description: '普遍主义 Universalism' },
  { key: 'tradition', label: '8. 我希望成为他人信赖的人。', description: '传统 Tradition' },
  { key: 'conformity', label: '9. 我重视遵守社会规则。', description: '从众 Conformity' },
  { key: 'achievement', label: '10. 我希望通过努力实现个人目标。', description: '成就 Achievement' },
]

// --- 3. PVQForm 组件 (逻辑不变, UI 不变) ---
export function PVQForm({ values, onChange }: PVQFormProps) {
  const handleChange = (key: keyof ValsData, value: number) => {
    onChange({ ...values, [key]: value })
  }

  // (这是为新UI准备的标签)
  const scoreLabels: { [key: number]: string } = {
    1: '非常不像我',
    2: '不像我',
    3: '一般',
    4: '像我',
    5: '非常像我',
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

  return (
    <div className="space-y-8">
      {/* 1. 问卷说明 (保持不变) */}
      <div>
        <h3 className="text-lg font-semibold text-white">价值观量表 (PVQ-10)</h3>
        <p className="mt-1 text-sm text-slate-200/80">
          请根据以下描述与您的符合程度打分，1分表示"非常不像我"，5分表示"非常像我"。
        </p>
      </div>

      {/* 2. 问卷卡片列表 (循环新的 PVQ_ITEMS) */}
      <div className="space-y-6">
        {PVQ_ITEMS.map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-white/12 bg-white/6 p-5 backdrop-blur-sm">
            
            {/* 3. 【自动更新】显示"新"的问题和描述 */}
            <div className="mb-3 flex flex-col items-start justify-between sm:flex-row">
              <div>
                <h4 className="font-medium text-white">{label}</h4>
              </div>
              <span className="mt-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 sm:mt-0">
                {(values[key] ?? 3) as number}分 - {scoreLabels[values[key] ?? 3]}
              </span>
            </div>

            {/* 4. "空心圆"按钮 (保持不变) */}
            <div className="mt-4 flex w-full items-center justify-between gap-2">
              <span className="text-xs text-slate-300">1 (非常不像我)</span>
              
              <div className="flex flex-1 justify-around gap-1 sm:gap-2">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isSelected = (values[key] ?? 3) === num;
                  const scaleClass = getButtonScale(num); 
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleChange(key, num)}
                      className={`
                        flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-200 ease-in-out
                        ${isSelected
                          ? 'bg-blue-600 text-white border-blue-700 shadow-lg' // 蓝色选中状态
                          : 'bg-transparent text-slate-200 border-white/30 hover:bg-white/10' // 空心默认状态
                        }
                        ${scaleClass}
                      `}
                      style={{ minWidth: '40px', minHeight: '40px' }} 
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              
              <span className="text-xs text-slate-300">5 (非常像我)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}