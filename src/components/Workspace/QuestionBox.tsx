import { useState } from 'react'
import { HelpCircle, Send } from 'lucide-react'
import type { Clarification } from '../../types/workspace'

interface QuestionBoxProps {
  clarification: Clarification | null
  onAnswer: (answer: string) => void
  round: number
  maxRounds: number
}

export default function QuestionBox({ clarification, onAnswer, round, maxRounds }: QuestionBoxProps) {
  const [customAnswer, setCustomAnswer] = useState('')

  if (!clarification) return null

  const handleOptionClick = (option: string) => {
    onAnswer(option)
  }

  const handleCustomSubmit = () => {
    if (customAnswer.trim()) {
      onAnswer(customAnswer.trim())
      setCustomAnswer('')
    }
  }

  return (
    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 my-3 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
            <HelpCircle size={14} className="text-amber-600" />
          </div>
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Câu hỏi {round}/{maxRounds}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-800 leading-relaxed">
          {clarification.question}
        </p>

        <div className="flex flex-wrap gap-2">
          {clarification.options.map((option) => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              className="px-3 py-2 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 bg-white border-gray-200 text-gray-700 hover:border-uml-blue/40 hover:bg-blue-50/50"
            >
              <div className="w-3 h-3 rounded-full border border-gray-300" />
              {option}
            </button>
          ))}
        </div>

        <div className="relative group">
          <textarea
            value={customAnswer}
            onChange={e => setCustomAnswer(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustomSubmit() } }}
            placeholder="Vui lòng nhập nội dung khác..."
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue transition-all resize-none min-h-[40px] max-h-[120px]"
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customAnswer.trim()}
            className={`absolute right-1.5 bottom-1.5 w-7 h-7 rounded-md flex items-center justify-center transition-all ${
              customAnswer.trim()
                ? 'bg-uml-blue text-white shadow-md hover:bg-blue-600'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
