import React, { useState, useEffect } from 'react'
import {
  BrainCircuit,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { apiService } from '../services/api'
import { RecordInterventionModal } from '../components/modals/RecordInterventionModal'
import { MemoryOutcomeAnalysisModal } from '../components/modals/MemoryOutcomeAnalysisModal'
import type { FullMemoryChain } from '../types'

interface TeacherMemoryViewProps {
  refreshKey: number
}

export const TeacherMemoryView: React.FC<TeacherMemoryViewProps> = ({ refreshKey }) => {
  const [chains, setChains] = useState<FullMemoryChain[]>([])
  const [loading, setLoading] = useState(true)
  const [recordModalOpen, setRecordModalOpen] = useState(false)
  const [selectedAnalysisChain, setSelectedAnalysisChain] = useState<FullMemoryChain | null>(null)

  const fetchChains = async () => {
    setLoading(true)
    try {
      const data = await apiService.getTeacherMemoryChains()
      setChains(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChains()
  }, [refreshKey])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#65E6AC]" />
            <span>Gap Resolved</span>
          </span>
        )
      case 'progressing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#4388FF] border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-[#35D6D0]" />
            <span>Progressing</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-[#E9B45C]" />
            <span>Pending Evaluation</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#24223D]">
              Teacher Memory Engine
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6] uppercase">
              Core Engine
            </span>
          </div>
          <p className="text-xs text-[#77758D] mt-0.5">
            Longitudinal pedagogical chains connecting diagnostic evidence, teacher interventions, and recovery outcomes
          </p>
        </div>

        <button
          onClick={() => setRecordModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Intervention</span>
        </button>
      </div>

      {/* Engine Architecture Explainer Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#17152F] via-[#201E3D] to-[#17152F] text-white border border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-[#35D6D0] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Continuous Learning Loop</span>
          </span>
          <p className="text-xs text-white/80 leading-relaxed max-w-2xl">
            The Teacher Memory Engine prevents learning gaps from being forgotten after an exam. It tracks whether the teacher's applied strategy closed the misconception or if the concept requires subsequent reinforcement.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-white/70 bg-white/10 px-3.5 py-2 rounded-xl shrink-0">
          <span className="text-[#4388FF]">Evidence</span>
          <span>→</span>
          <span className="text-[#7657F6]">Gap</span>
          <span>→</span>
          <span className="text-[#35D6D0]">Intervention</span>
          <span>→</span>
          <span className="text-[#65E6AC]">Outcome</span>
        </div>
      </div>

      {/* Memory Chains List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-[#7657F6] animate-spin" />
        </div>
      ) : chains.length > 0 ? (
        <div className="space-y-6">
          {chains.map((chain) => (
            <div
              key={chain.id}
              className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow space-y-5"
            >
              {/* Chain Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E7E6F1]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#7657F6] uppercase tracking-wider">
                      {chain.subject} • {chain.topic_name}
                    </span>
                    <span className="text-xs text-[#77758D]">
                      ({chain.student_name} • {chain.student_id_code})
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#24223D] mt-0.5">
                    {chain.intervention_title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(chain.outcome_status)}
                  <button
                    onClick={() => setSelectedAnalysisChain(chain)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6]/10 to-[#35D6D0]/10 text-[#7657F6] hover:bg-[#7657F6]/20 transition-all cursor-pointer border border-[#7657F6]/20"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#35D6D0]" />
                    <span>AI Longitudinal Analysis</span>
                  </button>
                </div>
              </div>

              {/* 4-Stage Horizontal Stepper */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Stage 1: Assessment Evidence */}
                <div className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] border-l-4 border-l-[#4388FF] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#4388FF] uppercase">1. Evidence</span>
                    <span className="font-mono text-[10px] text-[#77758D]">{chain.assessment_date}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#24223D] truncate">
                    {chain.assessment_title}
                  </p>
                  <p className="text-xs font-bold text-rose-600">
                    Initial Score: {chain.initial_score_percent}%
                  </p>
                  <p className="text-[11px] text-[#77758D] leading-relaxed line-clamp-3">
                    {chain.evidence_text}
                  </p>
                </div>

                {/* Stage 2: Identified Learning Gap */}
                <div className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] border-l-4 border-l-[#7657F6] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#7657F6] uppercase">2. Diagnosed Gap</span>
                    <span className="text-[10px] uppercase font-bold text-amber-600">{chain.gap_severity}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#24223D] truncate">
                    {chain.topic_name}
                  </p>
                  <p className="text-[11px] text-[#77758D] leading-relaxed line-clamp-4">
                    {chain.gap_description}
                  </p>
                </div>

                {/* Stage 3: Teacher Intervention */}
                <div className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] border-l-4 border-l-[#35D6D0] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#35D6D0] uppercase">3. Intervention</span>
                    <span className="text-[10px] font-semibold text-[#65E6AC] bg-emerald-50 px-1.5 py-0.2 rounded">
                      Approved
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#24223D] truncate">
                    Strategy: {chain.strategy_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[11px] text-[#77758D] leading-relaxed line-clamp-4">
                    {chain.intervention_description}
                  </p>
                </div>

                {/* Stage 4: Follow-Up Outcome */}
                <div className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] border-l-4 border-l-[#65E6AC] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#65E6AC] uppercase">4. Outcome</span>
                    <span className="text-[10px] font-mono text-[#77758D]">{chain.recorded_at || 'Pending'}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#24223D]">
                    {chain.outcome_score_percent ? (
                      <span className="text-emerald-700 font-bold">
                        Retest Score: {chain.outcome_score_percent}%
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium">Outcome pending</span>
                    )}
                  </p>
                  <p className="text-[11px] text-[#77758D] leading-relaxed line-clamp-4">
                    {chain.observations}
                  </p>
                </div>
              </div>

              {/* Next Recommended Teaching Move */}
              <div className="p-3.5 rounded-2xl bg-[#7657F6]/5 border border-[#7657F6]/20 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-[#7657F6] shrink-0" />
                  <span className="text-[#24223D]">
                    <strong className="font-semibold text-[#7657F6]">Recommended Next Move: </strong>
                    {chain.recommended_next_step}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E7E6F1]">
          <BrainCircuit className="w-8 h-8 text-[#77758D] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#24223D]">No Teacher Memory Chains Found</h3>
          <p className="text-xs text-[#77758D] mt-1 mb-4">
            Record an intervention to begin building your longitudinal memory engine.
          </p>
          <button
            onClick={() => setRecordModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white cursor-pointer"
          >
            Record Intervention
          </button>
        </div>
      )}

      {/* Record Intervention Modal */}
      {recordModalOpen && (
        <RecordInterventionModal
          isOpen={true}
          onClose={() => setRecordModalOpen(false)}
          onRecorded={() => {
            fetchChains()
          }}
        />
      )}

      {/* AI Longitudinal Outcome Analysis Modal */}
      {selectedAnalysisChain && (
        <MemoryOutcomeAnalysisModal
          chain={selectedAnalysisChain}
          onClose={() => setSelectedAnalysisChain(null)}
        />
      )}
    </div>
  )
}
