import { Check } from 'lucide-react'

interface Step {
  label: string
  sublabel?: string
}

interface Props {
  steps: Step[]
  current: number // 1-based
}

export default function StepIndicator({ steps, current }: Props) {
  return (
    <div className="flex items-start justify-center gap-0 mb-8">
      {steps.map((step, i) => {
        const num = i + 1
        const done = num < current
        const active = num === current
        return (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done
                  ? 'bg-green-100 border-green-600 text-green-700'
                  : active
                  ? 'text-white border-green-700'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
                style={active ? { background: 'var(--brand)', borderColor: 'var(--brand)' } : {}}>
                {done ? <Check size={16} /> : num}
              </div>
              <div className={`text-xs text-center max-w-[5rem] font-medium ${
                active ? 'text-green-700' : done ? 'text-green-600' : 'text-gray-400'
              }`}
                style={active ? { color: 'var(--brand)' } : {}}>
                {step.label}
                {step.sublabel && (
                  <div className="font-normal text-gray-400 text-[10px]">{step.sublabel}</div>
                )}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 mt-4 mx-1 transition-colors ${
                done ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
