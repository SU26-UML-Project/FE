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
    <div className="border-t border-gray-200 bg-amber-50/50 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <HelpCircle size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Clarification ({round}/{maxRounds})
            </span>
          </div>
          <p className="text-sm text-gray-800 mb-3">{clarification.question}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {clarification.options.map((option) => (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-700 hover:border-uml-blue hover:text-uml-blue hover:bg-blue-50 transition"
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={customAnswer}
              onChange={e => setCustomAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit() }}
              placeholder="Or type your answer..."
              className="flex-1 text-xs bg-white border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-uml-blue"
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customAnswer.trim()}
              className="p-1.5 rounded-md bg-uml-blue text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
