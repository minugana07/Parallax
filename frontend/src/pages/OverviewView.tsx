import React, { useState } from 'react'
import {
  Sparkles,
  Plus,
  Compass,
  FileCheck2,
  Users,
  GraduationCap,
  BrainCircuit,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Card } from '../components/common/Card'
import { InspectGapModal } from '../components/modals/InspectGapModal'
import type {
  DashboardOverviewResponse,
  LearningGapSummary,
  NavTab,
} from '../types'

interface OverviewViewProps {
  data: DashboardOverviewResponse | null
  loading: boolean
  onRefresh: () => void
  onNavigateTab: (tab: NavTab) => void
  onCreateAssessment: () => void
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  loading,
  onRefresh,
  onNavigateTab,
  onCreateAssessment,
}) => {
  const [inspectingGap, setInspectingGap] = useState<LearningGapSummary | null>(null)

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RefreshCw className="w-8 h-8 text-[#7657F6] animate-spin" />
        <p className="text-sm font-semibold text-[#24223D]">
          Loading Teacher Intelligence Dashboard...
        </p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-[#E7E6F1]">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-[#24223D]">Unable to load dashboard data</h3>
        <p className="text-xs text-[#77758D] mt-1 mb-4">
          The backend service may be starting or offline.
        </p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:brightness-105 cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  const {
    metrics,
    class_performance,
    learning_gaps,
    students_needing_support,
    recent_assessments,
    memory_engine_preview,
    teaching_recommendation,
  } = data

  return (
    <div className="space-y-8">
      {/* A. Welcome Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#17152F] via-[#201E3D] to-[#17152F] text-white p-7 sm:p-9 border border-white/10 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-[#7657F6]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-10 w-60 h-60 bg-[#4388FF]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-[#35D6D0]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Teacher Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            See beyond <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#35D6D0] via-[#4388FF] to-[#8E74F8]">the score.</span>
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal">
            Understand your students' progress, uncover learning gaps, and plan your next teaching move.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={onCreateAssessment}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-md hover:brightness-105 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment</span>
            </button>

            <button
              onClick={() => onNavigateTab('assessments')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-[#35D6D0]" />
              <span>Assessments & Quizzes</span>
            </button>

            <button
              onClick={() => onNavigateTab('insights')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/20 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#35D6D0]" />
              <span>Learning Insights</span>
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#65E6AC] pl-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Engineering Curricula Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* B. Overview Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#77758D]">Course Sections</span>
            <div className="p-2 rounded-xl bg-[#7657F6]/10 text-[#7657F6]">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#24223D]">
            {metrics.classes_count}
          </div>
          <p className="text-[11px] text-[#77758D] mt-1">
            {metrics.active_semesters_summary || 'Enrolled Course Sections'}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#77758D]">Students Tracked</span>
            <div className="p-2 rounded-xl bg-[#4388FF]/10 text-[#4388FF]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#24223D]">
            {metrics.students_count}
          </div>
          <p className="text-[11px] text-[#77758D] mt-1">
            Enrolled across active classes
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#77758D]">Assessments Completed</span>
            <div className="p-2 rounded-xl bg-[#35D6D0]/10 text-[#35D6D0]">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#24223D]">
            {metrics.assessments_count}
          </div>
          <p className="text-[11px] text-[#77758D] mt-1">
            Diagnostic & mastery evaluations
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#77758D]">Areas Needing Attention</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {metrics.learning_gaps_count}
          </div>
          <p className="text-[11px] text-[#77758D] mt-1">
            Identified priority conceptual gaps
          </p>
        </div>
      </section>

      {/* C. Class Performance Chart + H. Teaching Recommendation */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Performance Chart */}
        <Card
          title="Class Performance & Benchmark Trajectory"
          subtitle="Recent diagnostic evaluations compared against 75% mastery benchmark"
          icon={<TrendingUp className="w-5 h-5" />}
          className="lg:col-span-2"
        >
          <div className="h-72 w-full mt-3">
            {class_performance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={class_performance}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E6F1" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 11, fill: '#77758D' }}
                    tickFormatter={(val: string) => {
                      if (val.length > 18) return val.substring(0, 16) + '...'
                      return val
                    }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#77758D' }}
                    unit="%"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="bg-white p-3.5 rounded-xl shadow-xl border border-[#E7E6F1] text-xs space-y-1">
                            <p className="font-bold text-[#24223D]">{item.title}</p>
                            <p className="text-[#77758D]">{item.subject} • {item.class_name}</p>
                            <div className="pt-1.5 space-y-0.5 border-t border-[#E7E6F1]">
                              <p className="text-[#7657F6] font-semibold">
                                Average Score: {item.average_score}%
                              </p>
                              <p className="text-[#65E6AC] font-semibold">
                                Benchmark: {item.benchmark_score}%
                              </p>
                              <p className="text-[#77758D]">
                                Pass Rate: {item.pass_rate}% ({item.total_students} students)
                              </p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="average_score"
                    name="Class Average (%)"
                    fill="#7657F6"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark_score"
                    name="Target Benchmark (75%)"
                    stroke="#35D6D0"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#77758D]">
                No assessment performance records found.
              </div>
            )}
          </div>
        </Card>

        {/* H. Teaching Recommendation Card */}
        <div className="bg-gradient-to-br from-white to-[#F7F7FC] rounded-2xl border border-[#7657F6]/30 shadow-xs p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7657F6]/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#7657F6]/10 text-[#7657F6] text-xs font-bold">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Next Class Recommendation</span>
              </span>
              <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase font-bold">
                High Priority
              </span>
            </div>

            <h3 className="text-base font-bold text-[#24223D]">
              {teaching_recommendation.topic_name}
            </h3>
            <p className="text-xs text-[#77758D] mt-0.5">
              {teaching_recommendation.subject} • {teaching_recommendation.grade_level}
            </p>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-white border border-[#E7E6F1] text-xs">
                <span className="font-semibold text-[#24223D] block mb-1">
                  Evidence Basis:
                </span>
                <p className="text-[#77758D] leading-relaxed">
                  {teaching_recommendation.reason_evidence}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#7657F6]/5 border border-[#7657F6]/20 text-xs">
                <span className="font-semibold text-[#7657F6] block mb-1">
                  Suggested Action ({teaching_recommendation.estimated_time_minutes} min):
                </span>
                <p className="text-[#24223D] leading-relaxed">
                  {teaching_recommendation.suggested_action}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E7E6F1] flex items-center justify-between text-[11px] text-[#77758D]">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Source: {teaching_recommendation.source_assessment}</span>
            </span>
          </div>
        </div>
      </section>

      {/* G. Teacher Memory Engine Preview (Visually Distinctive) */}
      <section className="rounded-3xl bg-gradient-to-br from-[#0d1021] to-[#17152F] border border-white/10 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#35D6D0] flex items-center justify-center text-white shadow-md">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Teacher Memory Engine</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#65E6AC]/20 text-[#65E6AC] border border-[#65E6AC]/30">
                  Differentiator
                </span>
              </div>
              <p className="text-xs text-white/70">
                Connecting assessment evidence → learning gap → approved intervention → follow-up outcome
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('memory')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <span>Open Dedicated Memory View</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#35D6D0]" />
          </button>
        </div>

        {/* 4-Step Chain Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {memory_engine_preview.length > 0 ? (
            (() => {
              const chain = memory_engine_preview[0]
              const steps = [
                {
                  number: '01',
                  label: 'Assessment Evidence',
                  title: `${chain.student_name} (${chain.student_id_code})`,
                  detail: chain.assessment_evidence,
                  badge: `Initial: ${chain.before_score_percent}%`,
                  color: 'border-l-[#4388FF]',
                },
                {
                  number: '02',
                  label: 'Identified Learning Gap',
                  title: chain.topic_name,
                  detail: chain.learning_gap,
                  badge: `${chain.gap_severity} priority`,
                  color: 'border-l-[#7657F6]',
                },
                {
                  number: '03',
                  label: 'Teacher Intervention',
                  title: chain.intervention_title,
                  detail: `Approved strategy: ${chain.strategy_type.replace(/_/g, ' ')}`,
                  badge: chain.teacher_approved ? 'Teacher Approved' : 'Proposed',
                  color: 'border-l-[#35D6D0]',
                },
                {
                  number: '04',
                  label: 'Follow-Up Outcome',
                  title: `Status: ${chain.outcome_status.toUpperCase()}`,
                  detail: chain.observation_notes || 'Follow-up pending',
                  badge: chain.after_score_percent ? `Retest: ${chain.after_score_percent}%` : 'Pending re-eval',
                  color: 'border-l-[#65E6AC]',
                },
              ]

              return steps.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl bg-white/[0.05] border border-white/10 border-l-4 ${s.color} space-y-2`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#35D6D0]">
                    <span>STEP {s.number}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-white font-sans">
                      {s.badge}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white/90 uppercase tracking-wide">
                    {s.label}
                  </h4>
                  <p className="text-xs font-semibold text-white truncate">
                    {s.title}
                  </p>
                  <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3">
                    {s.detail}
                  </p>
                </div>
              ))
            })()
          ) : (
            <div className="col-span-4 p-4 text-center text-xs text-white/60">
              No memory chains recorded yet.
            </div>
          )}
        </div>
      </section>

      {/* D. Learning Gaps & E. Students Needing Support */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* D. Learning Gaps */}
        <Card
          title="Priority Learning Gaps"
          subtitle="Ranked topics identified through assessment evidence"
          icon={<Compass className="w-5 h-5" />}
          badge={
            <button
              onClick={() => onNavigateTab('insights')}
              className="text-xs text-[#7657F6] hover:underline font-semibold cursor-pointer"
            >
              View All ({learning_gaps.length})
            </button>
          }
        >
          <div className="space-y-3 mt-2">
            {learning_gaps.length > 0 ? (
              learning_gaps.slice(0, 3).map((gap) => (
                <div
                  key={gap.id}
                  className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] hover:border-[#7657F6]/40 transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-[#24223D]">
                        {gap.topic_name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                          gap.severity === 'critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[#77758D] line-clamp-2 leading-relaxed">
                      Evidence: {gap.evidence}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E7E6F1]/60 text-xs">
                    <span className="text-[#77758D]">
                      <strong className="text-[#24223D]">{gap.affected_students_count}</strong> students ({gap.affected_percentage}%)
                    </span>
                    <button
                      onClick={() => setInspectingGap(gap)}
                      className="text-xs font-semibold text-[#7657F6] hover:text-[#4388FF] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect Evidence</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#77758D] bg-[#F7F7FC] rounded-2xl border border-dashed border-[#E7E6F1]">
                No active conceptual learning gaps detected yet.
              </div>
            )}
          </div>
        </Card>

        {/* E. Students Needing Support */}
        <Card
          title="Students Needing Targeted Support"
          subtitle="Non-judgmental diagnostic evidence for personalized attention"
          icon={<Users className="w-5 h-5" />}
          badge={
            <button
              onClick={() => onNavigateTab('classes')}
              className="text-xs text-[#7657F6] hover:underline font-semibold cursor-pointer"
            >
              Class Rosters
            </button>
          }
        >
          <div className="space-y-3 mt-2">
            {students_needing_support.length > 0 ? (
              students_needing_support.slice(0, 3).map((stu) => (
                <div
                  key={stu.student_id}
                  className="p-4 rounded-2xl bg-white border border-[#E7E6F1] shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#24223D] truncate">
                        {stu.full_name}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-[#F7F7FC] text-[#77758D] border border-[#E7E6F1]">
                        {stu.student_id_code}
                      </span>
                    </div>
                    <p className="text-xs text-[#77758D] truncate">
                      {stu.topic_name} ({stu.grade_level}-{stu.section})
                    </p>
                    <p className="text-[11px] text-[#77758D]/80 line-clamp-1">
                      {stu.evidence}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-amber-600 block">
                      {stu.recent_score_percent}%
                    </span>
                    <span className="text-[10px] font-semibold text-[#7657F6]">
                      {stu.support_status === 'intervention_active' ? 'Intervention Active' : 'Review Needed'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#77758D] bg-[#F7F7FC] rounded-2xl border border-dashed border-[#E7E6F1]">
                All tracked students are currently performing above threshold.
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* F. Recent Assessments */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#24223D]">
              Recent Classroom Assessments
            </h2>
            <p className="text-xs text-[#77758D]">
              Scores, completion statistics, and evaluation dates
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('assessments')}
            className="text-xs text-[#7657F6] hover:underline font-semibold cursor-pointer"
          >
            View All Assessments ({recent_assessments.length})
          </button>
        </div>

        {recent_assessments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recent_assessments.map((asm) => (
              <div
                key={asm.id}
                className="bg-white rounded-2xl p-5 border border-[#E7E6F1] shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#77758D]">
                    {asm.subject} • {asm.grade_level}
                  </span>
                  <h3 className="text-sm font-bold text-[#24223D] mt-1 line-clamp-2">
                    {asm.title}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E7E6F1]/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#77758D] block text-[10px]">Avg Score</span>
                    <span className="font-bold text-[#24223D]">
                      {asm.average_percent}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#77758D] block text-[10px]">Submissions</span>
                    <span className="font-medium text-[#24223D]">
                      {asm.submission_count} / {asm.total_enrolled}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#E7E6F1] text-xs text-[#77758D]">
            No assessments recorded yet. Click "Create Assessment" above to record your first class evaluation.
          </div>
        )}
      </section>

      {/* Inspection Modal */}
      {inspectingGap && (
        <InspectGapModal
          gap={inspectingGap}
          onClose={() => setInspectingGap(null)}
          onTakeAction={() => {
            onNavigateTab('memory')
          }}
        />
      )}
    </div>
  )
}
