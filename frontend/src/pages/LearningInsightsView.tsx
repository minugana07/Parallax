import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Users,
  Filter,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { apiService } from '../services/api'
import { InspectGapModal } from '../components/modals/InspectGapModal'
import { RecordInterventionModal } from '../components/modals/RecordInterventionModal'
import type { LearningGapSummary } from '../types'

interface LearningInsightsViewProps {
  onRecordInterventionSuccess: () => void
}

export const LearningInsightsView: React.FC<LearningInsightsViewProps> = ({
  onRecordInterventionSuccess,
}) => {
  const [gaps, setGaps] = useState<LearningGapSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [inspectingGap, setInspectingGap] = useState<LearningGapSummary | null>(null)
  const [interventionGap, setInterventionGap] = useState<LearningGapSummary | null>(null)

  const fetchGaps = async () => {
    setLoading(true)
    try {
      const data = await apiService.getLearningGaps()
      setGaps(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGaps()
  }, [])

  const filteredGaps = gaps.filter((g) => {
    if (filterSeverity === 'All') return true
    return g.severity === filterSeverity.toLowerCase()
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#24223D]">
            Learning Gap Insights
          </h2>
          <p className="text-xs text-[#77758D]">
            Diagnostic detection of conceptual bottlenecks and prerequisite deficits requiring remediation
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#E7E6F1] self-start sm:self-auto">
          <Filter className="w-4 h-4 text-[#77758D]" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-xs font-semibold text-[#24223D] bg-transparent focus:outline-hidden"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical Priority</option>
            <option value="Moderate">Moderate Priority</option>
          </select>
        </div>
      </div>

      {/* Overview Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong className="font-bold">Pedagogical Philosophy:</strong> Parallax identifies possible learning gaps backed by assessment item evidence. Rather than automatically labeling students, it equips teachers with diagnostic context to choose and approve appropriate interventions.
        </p>
      </div>

      {/* Gaps List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-[#7657F6] animate-spin" />
        </div>
      ) : filteredGaps.length > 0 ? (
        <div className="space-y-4">
          {filteredGaps.map((gap) => (
            <div
              key={gap.id}
              className="bg-white rounded-2xl p-6 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      gap.severity === 'critical'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {gap.severity} Priority
                  </span>
                  <span className="text-xs text-[#77758D] font-medium">
                    {gap.subject} • {gap.grade_level}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#77758D]">
                  <Users className="w-3.5 h-3.5 text-[#7657F6]" />
                  <span>
                    <strong className="text-[#24223D]">{gap.affected_students_count}</strong> students affected ({gap.affected_percentage}% of class)
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#24223D]">
                  {gap.topic_name}
                </h3>
                <p className="text-xs text-[#24223D] mt-1.5 p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] leading-relaxed">
                  <span className="font-semibold text-[#7657F6]">Assessment Evidence: </span>
                  {gap.evidence}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E7E6F1]/60">
                <div className="flex items-center gap-2 text-xs">
                  <Lightbulb className="w-4 h-4 text-[#35D6D0] shrink-0" />
                  <span className="text-[#77758D]">
                    Recommended Strategy: <strong className="text-[#24223D]">{gap.suggested_strategy}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInspectingGap(gap)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F7F7FC] hover:bg-[#E7E6F1] text-[#24223D] transition-colors cursor-pointer"
                  >
                    Inspect Error Pattern
                  </button>
                  <button
                    onClick={() => setInterventionGap(gap)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Intervention</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E7E6F1]">
          <CheckCircle2 className="w-8 h-8 text-[#65E6AC] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#24223D]">No learning gaps match filter</h3>
          <p className="text-xs text-[#77758D] mt-1">
            All curriculum topics meet minimum competency thresholds under this filter.
          </p>
        </div>
      )}

      {/* Modals */}
      {inspectingGap && (
        <InspectGapModal
          gap={inspectingGap}
          onClose={() => setInspectingGap(null)}
          onTakeAction={(gap: LearningGapSummary) => setInterventionGap(gap)}
        />
      )}

      {interventionGap && (
        <RecordInterventionModal
          isOpen={true}
          initialGap={interventionGap}
          onClose={() => setInterventionGap(null)}
          onRecorded={() => {
            fetchGaps()
            onRecordInterventionSuccess()
          }}
        />
      )}
    </div>
  )
}
