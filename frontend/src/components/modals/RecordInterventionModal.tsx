import React, { useState, useEffect } from 'react'
import { X, Loader2, BrainCircuit, Sparkles, Check, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { apiService } from '../../services/api'
import type { LearningGapSummary, InterventionProposal, InterventionRecommendationResponse } from '../../types'

interface RecordInterventionModalProps {
  isOpen: boolean
  onClose: () => void
  onRecorded: () => void
  initialGap?: LearningGapSummary | null
}

export const RecordInterventionModal: React.FC<RecordInterventionModalProps> = ({
  isOpen,
  onClose,
  onRecorded,
  initialGap,
}) => {
  const [studentId, setStudentId] = useState('1')
  const [availableGaps, setAvailableGaps] = useState<LearningGapSummary[]>([])
  const [selectedGapId, setSelectedGapId] = useState<number | null>(initialGap?.id || null)

  const [title, setTitle] = useState(
    initialGap ? `Remediation: ${initialGap.suggested_strategy}` : ''
  )
  const [strategyType, setStrategyType] = useState('visual_area_model')
  const [description, setDescription] = useState(
    initialGap
      ? `Conduct targeted remediation addressing: ${initialGap.evidence}`
      : ''
  )
  const [teacherApproved, setTeacherApproved] = useState(false)

  // AI suggestions state
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [aiResponse, setAiResponse] = useState<InterventionRecommendationResponse | null>(null)
  const [selectedProposalIndex, setSelectedProposalIndex] = useState<number | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [studentOptions, setStudentOptions] = useState<Array<{ id: number; label: string }>>([])

  useEffect(() => {
    apiService.getClasses().then((classes) => {
      const list: Array<{ id: number; label: string }> = []
      const seen = new Set<number>()
      classes.forEach((c) => {
        c.students?.forEach((st) => {
          if (!seen.has(st.id)) {
            seen.add(st.id)
            list.push({
              id: st.id,
              label: `${st.student_id_code} • ${st.full_name} (${st.semester || st.grade_level || 'Sem 5'} - Sec ${st.section || 'A'})`,
            })
          }
        })
      })
      if (list.length > 0) setStudentOptions(list)
    }).catch(console.error)
  }, [])

  // Load gaps if initialGap is not provided
  useEffect(() => {
    if (!initialGap) {
      apiService.getLearningGaps().then((gaps) => {
        setAvailableGaps(gaps)
        if (gaps.length > 0 && !selectedGapId) {
          setSelectedGapId(gaps[0].id)
        }
      }).catch(console.error)
    } else {
      setSelectedGapId(initialGap.id)
    }
  }, [initialGap])

  if (!isOpen) return null

  const handleFetchAiSuggestions = async () => {
    const targetGapId = selectedGapId || initialGap?.id
    if (!targetGapId) {
      setAiError('Please select a learning gap first to get targeted recommendations.')
      return
    }

    setLoadingSuggestions(true)
    setAiError(null)

    try {
      const resp = await apiService.recommendInterventions(targetGapId)
      setAiResponse(resp)
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate suggestions. Please ensure Gemini is configured.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSelectProposal = (proposal: InterventionProposal, idx: number) => {
    setSelectedProposalIndex(idx)
    setTitle(proposal.title)
    
    // Normalize or match strategy type
    const strat = proposal.strategy_type.toLowerCase()
    if (strat.includes('visual') || strat.includes('model')) {
      setStrategyType('visual_area_model')
    } else if (strat.includes('sim') || strat.includes('phet')) {
      setStrategyType('phet_simulation')
    } else if (strat.includes('peer')) {
      setStrategyType('peer_tutoring')
    } else if (strat.includes('worked') || strat.includes('guided')) {
      setStrategyType('worked_examples')
    } else if (strat.includes('lab') || strat.includes('hands-on')) {
      setStrategyType('bench_laboratory')
    } else {
      setStrategyType('concept_revisit')
    }

    const compiledDesc = [
      `Learning Objective: ${proposal.learning_objective}`,
      `Activity (${proposal.duration_minutes} min): ${proposal.classroom_activity}`,
      `Check for Understanding: ${proposal.check_understanding}`,
      proposal.materials_needed ? `Materials: ${proposal.materials_needed}` : null,
      proposal.limitations ? `Pedagogical Caution: ${proposal.limitations}` : null,
    ].filter(Boolean).join('\n\n')

    setDescription(compiledDesc)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Please provide both an intervention title and action description.')
      return
    }

    if (!teacherApproved) {
      setErrorMessage('Teacher review and explicit approval is required before recording this intervention.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const activeGap = initialGap || availableGaps.find(g => g.id === selectedGapId)

    try {
      await apiService.recordIntervention({
        student_id: parseInt(studentId, 10),
        topic_id: activeGap?.topic_id,
        learning_gap_id: activeGap?.id,
        title: title.trim(),
        strategy_type: strategyType,
        description: description.trim(),
        teacher_approved: teacherApproved,
      })
      onRecorded()
      onClose()
      setTitle('')
      setDescription('')
      setTeacherApproved(false)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record intervention')
    } finally {
      setSubmitting(false)
    }
  }

  const currentTopicName = initialGap?.topic_name || availableGaps.find(g => g.id === selectedGapId)?.topic_name

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200 my-8 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-2.5 rounded-xl bg-[#35D6D0]/10 text-[#35D6D0]">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#24223D]">
              Record Teacher Intervention
            </h2>
            <p className="text-xs text-[#77758D]">
              Connect assessment evidence to teacher-approved pedagogical action
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 shrink-0 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-1 space-y-5">
          {/* AI Strategy Generator Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#17152F] via-[#201E3D] to-[#17152F] text-white border border-white/10 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#35D6D0]">
                  <Sparkles className="w-3.5 h-3.5 text-[#35D6D0]" />
                  <span>Gemini Teacher Intelligence</span>
                </div>
                <p className="text-xs text-white/80 mt-0.5">
                  Generate classroom-ready intervention proposals tailored to {currentTopicName ? `"${currentTopicName}"` : 'this learning gap'}.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFetchAiSuggestions}
                disabled={loadingSuggestions}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#35D6D0] to-[#4388FF] text-[#080b18] hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 shrink-0 font-bold"
              >
                {loadingSuggestions ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Get AI Suggestions</span>
                  </>
                )}
              </button>
            </div>

            {aiError && (
              <p className="text-xs text-rose-300 mt-2 bg-rose-950/40 p-2 rounded-lg border border-rose-800">
                {aiError}
              </p>
            )}

            {/* AI Proposals List */}
            {aiResponse && aiResponse.proposals.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/15 space-y-2.5">
                <p className="text-[11px] font-semibold text-[#65E6AC] uppercase tracking-wider">
                  Select a Proposal to populate intervention form:
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {aiResponse.proposals.map((prop, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedProposalIndex === idx
                          ? 'bg-white/15 border-[#35D6D0] ring-1 ring-[#35D6D0]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">
                          {prop.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7657F6]/30 text-[#35D6D0] border border-[#35D6D0]/30">
                            {prop.duration_minutes} min
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectProposal(prop, idx)}
                            className="text-[11px] font-semibold text-[#35D6D0] hover:text-white px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>Adopt</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/70 mt-1 line-clamp-2">
                        {prop.classroom_activity}
                      </p>
                      <div className="mt-2 text-[10px] text-white/50 flex items-center gap-2">
                        <span>Check: {prop.check_understanding}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/60 italic mt-2">
                  {aiResponse.disclaimer}
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} id="intervention-form" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#24223D] mb-1">
                  Target Student
                </label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-sm text-[#24223D] focus:outline-hidden focus:border-[#7657F6] bg-white"
                >
                  {studentOptions.length > 0 ? (
                    studentOptions.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))
                  ) : (
                    <option value="">No enrolled students found</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24223D] mb-1">
                  Pedagogical Strategy Type
                </label>
                <select
                  value={strategyType}
                  onChange={(e) => setStrategyType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-sm text-[#24223D] focus:outline-hidden focus:border-[#7657F6] bg-white"
                >
                  <option value="interactive_simulation">Interactive Simulator & State Machine Walkthrough</option>
                  <option value="guided_worked_examples">Guided Algorithmic Worked Examples</option>
                  <option value="peer_tutoring">Structured Peer Code Review & Pair Debugging</option>
                  <option value="bench_laboratory">Hands-on Laboratory Verification & Profiling</option>
                  <option value="targeted_worksheet">Targeted Diagnostic Problem Set</option>
                  <option value="concept_revisit">Targeted Invariant & Complexity Revisit</option>
                </select>
              </div>
            </div>

            {/* Gap Selector if not initialGap */}
            {!initialGap && availableGaps.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#24223D] mb-1">
                  Linked Conceptual Gap
                </label>
                <select
                  value={selectedGapId || ''}
                  onChange={(e) => setSelectedGapId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-sm text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                >
                  {availableGaps.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.topic_name} ({g.subject} • {g.severity.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#24223D] mb-1">
                Intervention Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 15-Minute Geometric Area Model Remediation"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-sm text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24223D] mb-1">
                Action Description & Protocol *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the specific teaching move, instructional adjustments, and checks for understanding..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-sm text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            {/* Explicit Teacher Approval Checkbox (Required) */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherApproved}
                  onChange={(e) => setTeacherApproved(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-md border-gray-300 text-[#7657F6] focus:ring-[#7657F6] cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#24223D] block flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#7657F6]" />
                    <span>Teacher Approval & Professional Verification *</span>
                  </span>
                  <span className="text-[#77758D] block mt-0.5 leading-relaxed">
                    I have reviewed and approved this pedagogical intervention for my students. AI proposals are supportive suggestions; the teacher remains the final authority.
                  </span>
                </div>
              </label>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] text-[11px] text-[#77758D] leading-relaxed">
              <span className="font-semibold text-[#35D6D0]">Memory Engine Note:</span> This intervention will be permanently attached to the learner's evidence chain. A follow-up outcome evaluation will track recovery trajectory.
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E7E6F1] mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="intervention-form"
            disabled={submitting || !teacherApproved}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Recording...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Approve & Save Intervention</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
