import React, { useState, useEffect } from 'react'
import { X, Sparkles, AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { apiService } from '../../services/api'
import type { FullMemoryChain, MemorySummaryResponse } from '../../types'

interface MemoryOutcomeAnalysisModalProps {
  chain: FullMemoryChain | null
  onClose: () => void
}

export const MemoryOutcomeAnalysisModal: React.FC<MemoryOutcomeAnalysisModalProps> = ({
  chain,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<MemorySummaryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chain) return

    let isMounted = true
    setLoading(true)
    setError(null)

    apiService.getMemorySummary(chain.id)
      .then((data) => {
        if (isMounted) setSummary(data)
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to retrieve AI analysis')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [chain])

  if (!chain) return null

  const scoreDiff = (chain.outcome_score_percent ?? 0) - chain.initial_score_percent

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#35D6D0] text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#24223D]">
                Longitudinal Outcome Analysis
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7657F6]/10 text-[#7657F6] font-bold">
                Teacher Memory
              </span>
            </div>
            <p className="text-xs text-[#77758D]">
              {chain.student_name} ({chain.student_id_code}) • {chain.topic_name}
            </p>
          </div>
        </div>

        {/* Score comparison pill */}
        <div className="p-3.5 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] flex items-center justify-between text-xs mb-4 shrink-0">
          <div>
            <span className="text-[#77758D] block text-[10px] uppercase font-semibold">Diagnostic Baseline</span>
            <span className="font-bold text-rose-600 text-sm">{chain.initial_score_percent}%</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[#7657F6]">
            <span>→</span>
            <span className="text-[11px] font-bold text-[#35D6D0]">{chain.strategy_type.replace(/_/g, ' ')}</span>
            <span>→</span>
          </div>

          <div className="text-right">
            <span className="text-[#77758D] block text-[10px] uppercase font-semibold">Follow-Up Retest</span>
            <span className="font-bold text-emerald-700 text-sm">
              {chain.outcome_score_percent ? `${chain.outcome_score_percent}%` : 'Pending'}
            </span>
          </div>

          {chain.outcome_score_percent && (
            <div className="pl-3 border-l border-[#E7E6F1]">
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${scoreDiff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {scoreDiff >= 0 ? `+${scoreDiff.toFixed(1)}%` : `${scoreDiff.toFixed(1)}%`}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-7 h-7 text-[#7657F6] animate-spin" />
              <p className="text-xs font-medium text-[#77758D]">
                Synthesizing assessment evidence & intervention trajectory with Gemini...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to generate AI analysis</p>
                <p className="text-[11px] mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {summary && !loading && (
            <>
              {/* Observed Changes */}
              <div className="p-4 rounded-2xl bg-white border border-[#E7E6F1] shadow-2xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7657F6]">
                  1. Observed Trajectory & Mastery Progression
                </span>
                <p className="text-[#24223D] leading-relaxed text-xs">
                  {summary.observed_changes}
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-[10px] text-[#77758D]">Evidence Strength:</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-[#4388FF] border border-blue-200">
                    {summary.evidence_strength}
                  </span>
                </div>
              </div>

              {/* Explicit Causality Disclaimer (Critical Ethical Safeguard) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Educational Measurement Integrity Safeguard</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  {summary.causality_caveat}
                </p>
              </div>

              {/* Next Step Recommendation */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#7657F6]/5 to-[#35D6D0]/5 border border-[#7657F6]/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#35D6D0]">
                  Suggested Pedagogical Next Step
                </span>
                <p className="text-[#24223D] font-medium text-xs leading-relaxed">
                  {summary.suggested_next_step}
                </p>
              </div>

              {/* Model Attribution */}
              <div className="text-right text-[10px] font-mono text-[#77758D]">
                Synthesized via: {summary.model_used}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E7E6F1] mt-4 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#24223D] text-white hover:bg-[#17152F] cursor-pointer"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  )
}
