import React, { useState } from 'react'
import {
  X,
  Compass,
  AlertCircle,
  Lightbulb,
  Users,
  CheckCircle2,
  Sparkles,
  Loader2,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react'
import type { LearningGapSummary, GapExplanationResponse } from '../../types'
import { apiService } from '../../services/api'

interface InspectGapModalProps {
  gap: LearningGapSummary | null
  onClose: () => void
  onTakeAction: (gap: LearningGapSummary) => void
}

export const InspectGapModal: React.FC<InspectGapModalProps> = ({
  gap,
  onClose,
  onTakeAction,
}) => {
  const [activeTab, setActiveTab] = useState<'evidence' | 'ai_explanation'>('evidence')
  const [aiExplanation, setAiExplanation] = useState<GapExplanationResponse | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  if (!gap) return null

  const handleFetchExplanation = async () => {
    setActiveTab('ai_explanation')
    if (aiExplanation && aiExplanation.gap_id === gap.id) return

    setIsLoadingAI(true)
    setAiError(null)
    try {
      const data = await apiService.explainLearningGap(gap.id)
      setAiExplanation(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to generate Gemini AI explanation.'
      setAiError(msg)
    } finally {
      setIsLoadingAI(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#0d1021] border border-white/10 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-[#7657F6] to-[#35D6D0] text-white shadow-md shadow-[#7657F6]/20">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-[#77758D] uppercase tracking-wider">
                {gap.subject} • {gap.grade_level}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                  gap.severity === 'critical'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {gap.severity} Priority
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5 truncate">
              {gap.topic_name}
            </h2>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/10 mb-5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'evidence'
                ? 'bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Assessment Evidence
          </button>
          <button
            type="button"
            onClick={handleFetchExplanation}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ai_explanation'
                ? 'bg-gradient-to-r from-[#7657F6] to-[#35D6D0] text-white shadow-sm'
                : 'text-[#35D6D0] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explain with Gemini AI</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'evidence' ? (
            <>
              {/* Affected Learners Metric */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-[#35D6D0]">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-[#77758D]">Affected Learners</p>
                    <p className="text-sm font-bold text-white">
                      {gap.affected_students_count} of {gap.total_class_students} students
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {gap.affected_percentage}% of Class
                </span>
              </div>

              {/* Assessment Evidence */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90 mb-1.5">
                  <AlertCircle className="w-4 h-4 text-[#7657F6]" />
                  <span>Assessment Evidence & Error Pattern</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/80 leading-relaxed">
                  {gap.evidence}
                </div>
              </div>

              {/* Suggested Pedagogical Strategy */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90 mb-1.5">
                  <Lightbulb className="w-4 h-4 text-[#35D6D0]" />
                  <span>Curriculum Baseline Strategy</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#7657F6]/10 border border-[#7657F6]/30 text-xs text-white/90 leading-relaxed">
                  <p className="font-semibold text-[#35D6D0] mb-1">
                    Strategy: {gap.suggested_strategy}
                  </p>
                  <p className="text-white/70">
                    Focus on concrete visual or interactive models rather than mechanical drill. Connecting conceptual geometry reinforces reasoning.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Gemini AI Explanation View */
            <div className="space-y-4">
              {isLoadingAI ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#35D6D0] animate-spin" />
                  <p className="text-sm font-semibold text-white">Analyzing assessment evidence with Gemini...</p>
                  <p className="text-xs text-[#77758D] max-w-sm">
                    Grounded in actual student response patterns. Checking limits of evidence to prevent false assumptions.
                  </p>
                </div>
              ) : aiError ? (
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Gemini AI Unavailable</span>
                  </div>
                  <p>{aiError}</p>
                  <button
                    onClick={handleFetchExplanation}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-medium cursor-pointer"
                  >
                    Retry Analysis
                  </button>
                </div>
              ) : aiExplanation ? (
                <div className="space-y-4">
                  {/* Model attribution badge */}
                  <div className="flex items-center justify-between text-[11px] text-[#77758D] pb-1 border-b border-white/5">
                    <span>Evidence Reliability: <strong className="text-[#65E6AC] capitalize">{aiExplanation.evidence_strength}</strong></span>
                    <span className="font-mono text-[#35D6D0]">{aiExplanation.model_used}</span>
                  </div>

                  {/* 1. What the evidence indicates */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#35D6D0]">
                      <Sparkles className="w-4 h-4" />
                      <span>What the Assessment Evidence Demonstrates</span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {aiExplanation.evidence_analysis}
                    </p>
                  </div>

                  {/* 2. Key Skills Needing Attention */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-white/90">Specific Conceptual Skills Needing Attention:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiExplanation.key_skills_needing_attention.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#7657F6]/20 border border-[#7657F6]/40 text-white/90"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 3. Crucial Safeguard: What evidence does NOT establish */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>What the Evidence Does NOT Prove (Safeguard)</span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {aiExplanation.unsupported_claims}
                    </p>
                  </div>

                  {/* 4. Recommended Diagnostic Checks */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#65E6AC]">
                      <HelpCircle className="w-4 h-4" />
                      <span>Teacher Follow-Up Diagnostic Checks</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-white/75">
                      {aiExplanation.recommended_diagnostic_checks.map((chk, cIdx) => (
                        <li key={cIdx}>{chk}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onTakeAction(gap)
              onClose()
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-lg shadow-[#7657F6]/25 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Record Intervention</span>
          </button>
        </div>
      </div>
    </div>
  )
}
