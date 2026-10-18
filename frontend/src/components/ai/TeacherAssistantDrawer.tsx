import React, { useState } from 'react'
import { Sparkles, Send, X, Bot, User, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import type { TeacherAssistantResponse } from '../../types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  modelUsed?: string
  suggestedFollowUps?: string[]
}

interface TeacherAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  contextType?: string
  contextId?: number
  contextTitle?: string
}

export const TeacherAssistantDrawer: React.FC<TeacherAssistantDrawerProps> = ({
  isOpen,
  onClose,
  contextType,
  contextId,
  contextTitle,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello Teacher! I am your Parallax Teacher Assistant. How can I help you analyze assessment evidence, design targeted interventions, or prepare tomorrow’s lesson?',
      suggestedFollowUps: [
        'What should I teach next for quadratic factoring?',
        'Suggest a 15-min intervention for Newton’s laws',
        'How can I measure recovery after an intervention?',
      ],
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSend = async (questionToSend?: string) => {
    const q = (questionToSend || input).trim()
    if (!q || isLoading) return

    const userMsg: Message = { role: 'user', content: q }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res: TeacherAssistantResponse = await apiService.askTeacherAssistant(q, contextType, contextId)
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.answer,
        modelUsed: res.model_used,
        suggestedFollowUps: res.suggested_follow_up_questions,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'AI service temporarily unavailable.'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${errMsg}. Note: Standard dashboard operations and Teacher Memory chains continue functioning offline.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0d1021] border-l border-white/10 h-full flex flex-col shadow-2xl text-white">
        {/* Header */}
        <div className="p-4 px-6 border-b border-white/10 bg-[#080b18] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7657F6] to-[#35D6D0] flex items-center justify-center shadow-md shadow-[#7657F6]/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide">Teacher Intelligence Assistant</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#35D6D0]/15 text-[#35D6D0] border border-[#35D6D0]/30">
                  Gemini API
                </span>
              </div>
              <p className="text-[11px] text-[#77758D]">
                {contextTitle ? `Context: ${contextTitle}` : 'Pedagogical support & intervention planning'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-md shadow-[#7657F6]/20'
                    : 'bg-white/[0.05] border border-white/10 text-white/90'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-white/60">
                  {msg.role === 'user' ? (
                    <>
                      <User className="w-3 h-3" />
                      <span>You</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-[#35D6D0]" />
                      <span>Parallax Intelligence</span>
                      {msg.modelUsed && (
                        <span className="text-[9px] font-mono text-white/40">({msg.modelUsed})</span>
                      )}
                    </>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {/* Follow-up suggestions */}
              {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                  {msg.suggestedFollowUps.map((suggestion, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSend(suggestion)}
                      disabled={isLoading}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-[#35D6D0]/15 border border-white/10 hover:border-[#35D6D0]/40 text-white/70 hover:text-[#35D6D0] transition-all cursor-pointer text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3.5 max-w-[85%] rounded-2xl bg-white/[0.05] border border-white/10 text-white/70 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#35D6D0]" />
              <span>Synthesizing evidence with Gemini...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-white/10 bg-[#080b18]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a class, assessment gap, or teaching activity..."
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#35D6D0] transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#7657F6] to-[#35D6D0] text-white hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#7657F6]/20"
              aria-label="Send inquiry"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#77758D]">
            <span>Teacher judgment remains primary. AI suggestions are non-prescriptive.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
