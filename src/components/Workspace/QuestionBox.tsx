import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Circle,
  Send,
  HelpCircle,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import type { ChatQuestion } from '../../types/ai'

interface QuestionBoxProps {
  questions: ChatQuestion[]
  onSubmit: (answer: string) => void
  isSubmitting?: boolean
}

const QuestionBox: React.FC<QuestionBoxProps> = ({
                                                   questions,
                                                   onSubmit,
                                                   isSubmitting,
                                                 }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({})

  useEffect(() => {
    setCurrentStep(0)
    setAnswers({})
    setOtherTexts({})
  }, [questions])

  if (!questions || questions.length === 0) return null

  const currentQuestion = questions[currentStep]
  const selectedOptions = answers[currentStep] || []
  const otherText = otherTexts[currentStep] || ''
  const isMultiSelect = currentQuestion.type === 'multi_select'

  const isOtherOption = (option: string) => {
    return option.trim().toLowerCase() === 'khác'
  }

  const handleOptionClick = (option: string) => {
    if (!isMultiSelect) {
      setAnswers(prev => ({ ...prev, [currentStep]: [option] }))
      return
    }

    setAnswers(prev => {
      const currentAnswers = prev[currentStep] || []
      const isSelected = currentAnswers.includes(option)

      if (isSelected) {
        return {
          ...prev,
          [currentStep]: currentAnswers.filter(o => o !== option),
        }
      }

      return {
        ...prev,
        [currentStep]: [...currentAnswers, option],
      }
    })
  }

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = () => {
    const formattedAnswers = questions.map((q, idx) => {
      const qAnswers = answers[idx] || []
      const qOtherText = otherTexts[idx] || ''

      const processedAnswers = qAnswers.map(ans =>
          isOtherOption(ans) ? `Khác: ${qOtherText.trim()}` : ans
      )

      return `${idx + 1}. ${q.title}: ${processedAnswers.join(', ')}`
    })

    const finalPrompt = `Đây là các câu trả lời của tôi:\n${formattedAnswers.join('\n')}`
    onSubmit(finalPrompt)
  }

  const isOtherSelected = selectedOptions.some(isOtherOption)

  const isCurrentStepValid =
      selectedOptions.length > 0 &&
      (!isOtherSelected || otherText.trim() !== '')

  const isAllValid = questions.every((_, idx) => {
    const qAnswers = answers[idx] || []
    const qOtherText = otherTexts[idx] || ''
    const qOtherSelected = qAnswers.some(isOtherOption)

    return qAnswers.length > 0 && (!qOtherSelected || qOtherText.trim() !== '')
  })

  return (
      <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 my-3 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
              <HelpCircle size={14} className="text-amber-600" />
            </div>

            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
            Câu hỏi {currentStep + 1}/{questions.length}
          </span>
          </div>

          {questions.length > 1 && (
              <div className="flex gap-1">
                {questions.map((_, idx) => (
                    <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                            idx === currentStep
                                ? 'bg-uml-blue w-4'
                                : idx < currentStep
                                    ? 'bg-uml-blue/40'
                                    : 'bg-gray-200'
                        }`}
                    />
                ))}
              </div>
          )}
        </div>

        <div
            className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200"
            key={currentStep}
        >
          <p className="text-xs font-bold text-gray-800 leading-relaxed">
            {currentQuestion.title}
          </p>

          <div className="flex flex-wrap gap-2">
            {currentQuestion.options.map(option => {
              const isSelected = selectedOptions.includes(option)

              return (
                  <button
                      key={option}
                      onClick={() => handleOptionClick(option)}
                      className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${
                          isSelected
                              ? 'bg-uml-blue border-uml-blue text-white shadow-md scale-[1.02]'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-uml-blue/40 hover:bg-blue-50/50'
                      }`}
                  >
                    {!isMultiSelect ? (
                        isSelected ? (
                            <CheckCircle2 size={14} />
                        ) : (
                            <Circle size={14} className="opacity-30" />
                        )
                    ) : isSelected ? (
                        <CheckSquare size={14} />
                    ) : (
                        <Square size={14} className="opacity-30" />
                    )}

                    {option}
                  </button>
              )
            })}
          </div>

          {isOtherSelected && (
              <div className="animate-in zoom-in-95 duration-200">
            <textarea
                value={otherText}
                onChange={e =>
                    setOtherTexts(prev => ({
                      ...prev,
                      [currentStep]: e.target.value,
                    }))
                }
                placeholder="Vui lòng nhập nội dung khác..."
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-uml-blue/10 focus:border-uml-blue transition-all resize-none h-20"
            />
              </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {currentStep > 0 && (
              <button
                  onClick={handleBack}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-1"
              >
                <ChevronLeft size={14} />
                Quay lại
              </button>
          )}

          {currentStep < questions.length - 1 ? (
              <button
                  onClick={handleNext}
                  disabled={!isCurrentStepValid}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-all ${
                      isCurrentStepValid
                          ? 'bg-white border border-uml-blue text-uml-blue hover:bg-blue-50'
                          : 'bg-gray-50 border border-gray-100 text-gray-300'
                  }`}
              >
                Tiếp theo
                <ChevronRight size={14} />
              </button>
          ) : (
              <button
                  onClick={handleSubmit}
                  disabled={!isAllValid || isSubmitting}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      isAllValid && !isSubmitting
                          ? 'bg-uml-blue text-white shadow-lg shadow-uml-blue/20 hover:bg-blue-600'
                          : 'bg-gray-100 text-gray-400'
                  }`}
              >
                {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <Send size={14} />
                )}

                Xác nhận gửi tất cả
              </button>
          )}
        </div>
      </div>
  )
}

export default QuestionBox