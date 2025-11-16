import { Textarea } from '@/components/common/Textarea'

type StoryFormValues = {
  proud_moment: string
  turning_point: string
  difficult_moment: string
}

interface StoryFormProps {
  values: StoryFormValues
  onChange: (values: StoryFormValues) => void
  errors?: string[]
}

export function StoryForm({ values, onChange, errors }: StoryFormProps) {
  const handleChange = <K extends keyof StoryFormValues>(key: K, value: StoryFormValues[K]) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white">生命故事叙事</h3>
        <p className="mt-1 text-sm text-slate-200/80">
          请以叙事方式回顾你的关键经历。每个问题至少需要 50 字，以帮助系统充分理解你的成长轨迹。
        </p>
      </div>

      <Textarea
        label="1. 让你感到骄傲的时刻"
        value={values.proud_moment}
        onChange={(value) => handleChange('proud_moment', value)}
        placeholder="回忆一个令你感到非常骄傲的事件，描述当时的情境、你的行动以及最后的影响。"
        hint="至少 50 字，鼓励你描述具体细节、感受和收获。"
        minLength={50}
        rows={6}
        required
      />

      <Textarea
        label="2. 人生的重要转折点"
        value={values.turning_point}
        onChange={(value) => handleChange('turning_point', value)}
        placeholder="分享一个改变你人生方向的关键时刻。它如何影响了你的选择或价值观？"
        hint="至少 50 字，可以从内在感受或外部事件展开。"
        minLength={50}
        rows={6}
        required
      />

      <Textarea
        label="3. 曾面对的困难或者挑战"
        value={values.difficult_moment}
        onChange={(value) => handleChange('difficult_moment', value)}
        placeholder="描述一个让你感到困难的经历，以及你是如何处理这段经历的。"
        hint="至少 50 字，聚焦于你如何面对挑战或从中学到的经验。"
        minLength={50}
        rows={6}
        required
      />

      {errors && errors.length > 0 && (
        <div className="rounded-xl border border-red-300/60 bg-red-500/10 p-4 text-sm text-red-200">
          <h4 className="font-semibold text-red-100">请检查字数或完善内容：</h4>
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

