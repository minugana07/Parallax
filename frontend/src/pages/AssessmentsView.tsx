import React, { useState, useEffect } from 'react'
import {
  FileCheck2,
  Plus,
  Search,
  Users,
  ChevronRight,
  RefreshCw,
  Loader2,
  Sparkles,
  Award,
  FileSpreadsheet,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  BookOpen,
} from 'lucide-react'
import { apiService } from '../services/api'
import type {
  AssessmentResponse,
  AssessmentDetailResponse,
  AssessmentAIAnalysisResponse,
} from '../types'
import { CreateAssessmentModal } from '../components/modals/CreateAssessmentModal'
import { CreateQuizModal } from '../components/modals/CreateQuizModal'
import { RecordMarksModal } from '../components/modals/RecordMarksModal'
import { ImportMarksCsvModal } from '../components/modals/ImportMarksCsvModal'

interface AssessmentsViewProps {
  onCreateClick?: () => void
  refreshKey: number
}

type AssessmentFilterType = 'all' | 'cie_exam' | 'quiz' | 'lab_test' | 'assignment'

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  refreshKey,
}) => {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<AssessmentFilterType>('all')

  // Modals state
  const [showCreateAssessment, setShowCreateAssessment] = useState(false)
  const [showCreateQuiz, setShowCreateQuiz] = useState(false)
  const [showRecordMarks, setShowRecordMarks] = useState(false)
  const [showImportCsv, setShowImportCsv] = useState(false)

  // Detail Modal state
  const [selectedDetail, setSelectedDetail] = useState<AssessmentDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<'roster' | 'questions' | 'ai'>('roster')

  // AI Diagnostic Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AssessmentAIAnalysisResponse | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const data = await apiService.getAssessments()
      setAssessments(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssessments()
  }, [refreshKey])

  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true)
    setAiAnalysis(null)
    setAiError(null)
    setDetailTab('roster')
    try {
      const detail = await apiService.getAssessmentDetail(id)
      setSelectedDetail(detail)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleRunAiAnalysis = async (assessmentId: number) => {
    setLoadingAi(true)
    setAiError(null)
    try {
      const result = await apiService.analyzeAssessmentAI(assessmentId)
      setAiAnalysis(result)
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI assessment analysis failed')
    } finally {
      setLoadingAi(false)
    }
  }

  const filteredAssessments = assessments.filter((asm) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      asm.title.toLowerCase().includes(q) ||
      asm.subject.toLowerCase().includes(q) ||
      (asm.course_code && asm.course_code.toLowerCase().includes(q)) ||
      (asm.semester && asm.semester.toLowerCase().includes(q))

    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'cie_exam' && asm.assessment_type === 'cie_exam') ||
      (activeFilter === 'quiz' && asm.assessment_type === 'quiz') ||
      (activeFilter === 'lab_test' && asm.assessment_type === 'lab_test') ||
      (activeFilter === 'assignment' &&
        (asm.assessment_type === 'assignment' || asm.assessment_type === 'project'))

    return matchesSearch && matchesFilter
  })

  const quizCount = assessments.filter((a) => a.assessment_type === 'quiz').length
  const cieCount = assessments.filter((a) => a.assessment_type === 'cie_exam').length
  const labCount = assessments.filter((a) => a.assessment_type === 'lab_test').length

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#24223D]">
            Assessments & Quizzes Workspace
          </h2>
          <p className="text-xs text-[#77758D]">
            Author college evaluations, design diagnostic quizzes with Gemini AI, and examine cohort mastery
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowCreateQuiz(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#F7F7FC] hover:bg-[#7657F6]/10 text-[#7657F6] border border-[#7657F6]/30 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#7657F6]" />
            <span>Author Quiz / Diagnostic</span>
          </button>

          <button
            onClick={() => setShowCreateAssessment(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E7E6F1]">
        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-[#7657F6] text-white shadow-xs'
                : 'bg-[#F7F7FC] text-[#77758D] hover:text-[#24223D]'
            }`}
          >
            All Evaluations ({assessments.length})
          </button>

          <button
            onClick={() => setActiveFilter('cie_exam')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'cie_exam'
                ? 'bg-[#7657F6] text-white shadow-xs'
                : 'bg-[#F7F7FC] text-[#77758D] hover:text-[#24223D]'
            }`}
          >
            CIE Exams ({cieCount})
          </button>

          <button
            onClick={() => setActiveFilter('quiz')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter === 'quiz'
                ? 'bg-[#7657F6] text-white shadow-xs'
                : 'bg-[#F7F7FC] text-[#77758D] hover:text-[#24223D]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Quizzes & Diagnostics ({quizCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('lab_test')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'lab_test'
                ? 'bg-[#7657F6] text-white shadow-xs'
                : 'bg-[#F7F7FC] text-[#77758D] hover:text-[#24223D]'
            }`}
          >
            Lab Practicals ({labCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#77758D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, course code, semester..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
          />
        </div>
      </div>

      {/* Assessment Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-[#7657F6] animate-spin" />
        </div>
      ) : filteredAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssessments.map((asm) => {
            const isQuiz = asm.assessment_type === 'quiz'
            const isLab = asm.assessment_type === 'lab_test'
            const badgeColor = isQuiz
              ? 'bg-[#7657F6]/10 text-[#7657F6]'
              : isLab
              ? 'bg-[#4388FF]/10 text-[#4388FF]'
              : 'bg-emerald-50 text-emerald-700'

            const typeLabel = isQuiz
              ? 'Diagnostic Quiz'
              : isLab
              ? 'Lab Practical'
              : 'CIE Examination'

            return (
              <div
                key={asm.id}
                className="bg-white rounded-2xl p-5 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeColor}`}>
                      {typeLabel}
                    </span>
                    <span className="text-xs text-[#77758D] font-medium">
                      {asm.course_code ? `${asm.course_code} • ` : ''}
                      {asm.semester || asm.grade_level}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#24223D] leading-snug mb-1">
                    {asm.title}
                  </h3>

                  <p className="text-xs text-[#77758D] font-medium">
                    {asm.subject}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E7E6F1]/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#77758D]">Cohort Average</span>
                    <span className="font-bold text-[#24223D]">
                      {asm.average_percentage !== null && asm.average_percentage !== undefined
                        ? `${asm.average_percentage}% (${asm.average_score}/${asm.max_score})`
                        : 'Awaiting submissions'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#77758D]">Submissions</span>
                    <span className="font-medium text-[#24223D] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#4388FF]" />
                      <span>{asm.student_count} graded</span>
                    </span>
                  </div>

                  {isQuiz && (asm.total_questions ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#77758D]">Questions</span>
                      <span className="font-medium text-[#7657F6] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{asm.total_questions} MCQs authored</span>
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => handleViewDetail(asm.id)}
                    disabled={loadingDetail}
                    className="w-full mt-2 py-2 rounded-xl text-xs font-semibold bg-[#F7F7FC] hover:bg-[#7657F6]/10 text-[#7657F6] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {loadingDetail ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Inspect Evaluation & Marks</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E7E6F1]">
          <FileCheck2 className="w-8 h-8 text-[#77758D] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#24223D]">No assessments found</h3>
          <p className="text-xs text-[#77758D] mt-1 mb-4">
            Create an academic assessment or author a diagnostic quiz to collect student learning evidence.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowCreateQuiz(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F7F7FC] text-[#7657F6] border border-[#7657F6]/30 cursor-pointer"
            >
              Author Quiz
            </button>
            <button
              onClick={() => setShowCreateAssessment(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white cursor-pointer"
            >
              Create Assessment
            </button>
          </div>
        </div>
      )}

      {/* Comprehensive Assessment Detail Modal / Drawer */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E6F1] shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                    {selectedDetail.assessment_type}
                  </span>
                  <span className="text-xs text-[#77758D]">
                    {selectedDetail.course_code ? `${selectedDetail.course_code} • ` : ''}
                    {selectedDetail.semester || selectedDetail.grade_level}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#24223D]">
                  {selectedDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-xl text-[#77758D] hover:bg-[#F7F7FC] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Score Summary Metrics Bar */}
            <div className="grid grid-cols-4 gap-3 py-3 border-b border-[#E7E6F1] shrink-0">
              <div className="p-3 rounded-xl bg-[#F7F7FC] text-center">
                <span className="text-[10px] text-[#77758D] block">Max Marks</span>
                <span className="text-sm font-bold text-[#24223D]">{selectedDetail.max_score}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FC] text-center">
                <span className="text-[10px] text-[#77758D] block">Class Average</span>
                <span className="text-sm font-bold text-[#7657F6]">{selectedDetail.average_percentage || 0}%</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FC] text-center">
                <span className="text-[10px] text-[#77758D] block">Pass Rate</span>
                <span className="text-sm font-bold text-emerald-600">
                  {selectedDetail.scores.length > 0
                    ? `${Math.round(
                        (selectedDetail.scores.filter(
                          (s) => (s.percentage || 0) >= (selectedDetail.passing_score || 40)
                        ).length /
                          selectedDetail.scores.length) *
                          100
                      )}%`
                    : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FC] text-center">
                <span className="text-[10px] text-[#77758D] block">Graded Students</span>
                <span className="text-sm font-bold text-[#24223D]">{selectedDetail.student_count}</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center justify-between pt-3 pb-2 border-b border-[#E7E6F1] shrink-0">
              <div className="flex items-center gap-1 bg-[#F7F7FC] p-1 rounded-xl border border-[#E7E6F1]">
                <button
                  type="button"
                  onClick={() => setDetailTab('roster')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    detailTab === 'roster'
                      ? 'bg-white text-[#7657F6] shadow-xs'
                      : 'text-[#77758D] hover:text-[#24223D]'
                  }`}
                >
                  Student Roster ({selectedDetail.scores.length})
                </button>

                {selectedDetail.quiz_questions && selectedDetail.quiz_questions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDetailTab('questions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                      detailTab === 'questions'
                        ? 'bg-white text-[#7657F6] shadow-xs'
                        : 'text-[#77758D] hover:text-[#24223D]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Authored Questions ({selectedDetail.quiz_questions.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDetailTab('ai')
                    if (!aiAnalysis) {
                      handleRunAiAnalysis(selectedDetail.id)
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                    detailTab === 'ai'
                      ? 'bg-white text-[#7657F6] shadow-xs'
                      : 'text-[#77758D] hover:text-[#24223D]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#7657F6]" />
                  <span>AI Diagnostic Intelligence</span>
                </button>
              </div>

              {detailTab === 'roster' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowImportCsv(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F7F7FC] hover:bg-[#E7E6F1] text-[#24223D] transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#7657F6]" />
                    <span>Import CSV</span>
                  </button>
                  <button
                    onClick={() => setShowRecordMarks(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:brightness-105 transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Record / Edit Marks</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tab 1: Student Roster */}
            {detailTab === 'roster' && (
              <div className="flex-1 overflow-y-auto py-3 space-y-2">
                {selectedDetail.scores.length > 0 ? (
                  selectedDetail.scores.map((sc) => {
                    const pass = (sc.percentage || 0) >= (selectedDetail.passing_score || 40)
                    return (
                      <div
                        key={sc.student_id}
                        className="p-3 rounded-xl bg-[#F7F7FC] flex items-center justify-between text-xs border border-[#E7E6F1]"
                      >
                        <div>
                          <span className="font-semibold text-[#24223D]">{sc.student_name}</span>
                          <span className="font-mono text-[11px] font-semibold text-[#7657F6] ml-2">
                            {sc.student_id_code}
                          </span>
                          {sc.feedback && (
                            <p className="text-[11px] text-[#77758D] mt-0.5">{sc.feedback}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#24223D] block">
                            {sc.score} / {selectedDetail.max_score}
                          </span>
                          <span className={`text-[10px] font-semibold ${pass ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {sc.percentage}% ({pass ? 'Passed' : 'Needs Support'})
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-[#77758D] mb-3">No student scores submitted yet for this evaluation.</p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setShowImportCsv(true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F7F7FC] text-[#7657F6] border border-[#7657F6]/30 cursor-pointer"
                      >
                        Import CSV Marks
                      </button>
                      <button
                        onClick={() => setShowRecordMarks(true)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#7657F6] text-white cursor-pointer"
                      >
                        Enter Marks Manually
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Authored Questions */}
            {detailTab === 'questions' && selectedDetail.quiz_questions && (
              <div className="flex-1 overflow-y-auto py-3 space-y-4">
                {selectedDetail.quiz_questions.map((q, qIdx) => (
                  <div
                    key={q.id || qIdx}
                    className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#24223D]">
                        Question {qIdx + 1}
                      </span>
                      <span className="font-semibold text-[#7657F6]">
                        {q.marks} Marks
                      </span>
                    </div>

                    <p className="text-[#24223D] font-medium leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="space-y-1.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correct_answer === optIdx
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-xl border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-white border-[#E7E6F1] text-[#24223D]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border border-current text-[10px] font-bold flex items-center justify-center">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </div>
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-white border border-[#E7E6F1] text-[11px] text-[#77758D] leading-relaxed">
                        <strong className="text-[#24223D] block mb-0.5">Faculty Explanation:</strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: AI Diagnostic Intelligence */}
            {detailTab === 'ai' && (
              <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
                {loadingAi ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <Loader2 className="w-6 h-6 text-[#7657F6] animate-spin" />
                    <p className="text-xs text-[#77758D]">Gemini is analyzing cohort performance and question bottlenecks...</p>
                  </div>
                ) : aiError ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 space-y-2">
                    <p className="font-semibold">Unable to generate AI analysis: {aiError}</p>
                    <button
                      onClick={() => handleRunAiAnalysis(selectedDetail.id)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-xs font-semibold cursor-pointer"
                    >
                      Retry Analysis
                    </button>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-4">
                    {/* Performance Summary */}
                    <div className="p-4 rounded-2xl bg-[#7657F6]/5 border border-[#7657F6]/20 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#7657F6]" />
                        <span className="font-bold text-[#24223D]">Cohort Performance Synthesis</span>
                        <span className="text-[10px] text-[#77758D] ml-auto">Model: {aiAnalysis.model_used}</span>
                      </div>
                      <p className="text-xs text-[#24223D] leading-relaxed">
                        {aiAnalysis.overall_performance_summary}
                      </p>
                    </div>

                    {/* Strengths & Misconceptions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <span>Demonstrated Strengths</span>
                        </span>
                        <ul className="space-y-1.5 text-[11px] text-emerald-900 list-disc list-inside">
                          {aiAnalysis.strengths_identified.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Critical Misconceptions</span>
                        </span>
                        <ul className="space-y-1.5 text-[11px] text-amber-900 list-disc list-inside">
                          {aiAnalysis.critical_misconceptions.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Question Difficulty Breakdown */}
                    {aiAnalysis.question_difficulty_breakdown &&
                      aiAnalysis.question_difficulty_breakdown.length > 0 && (
                        <div className="p-4 rounded-2xl bg-white border border-[#E7E6F1] space-y-2">
                          <span className="font-bold text-[#24223D]">Question Difficulty & Error Analysis</span>
                          <div className="space-y-2">
                            {aiAnalysis.question_difficulty_breakdown.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#7657F6]">
                                      {item.question_id.toUpperCase()}
                                    </span>
                                    <span className="text-[#24223D] font-medium">{item.question_text}</span>
                                  </div>
                                  <p className="text-[11px] text-[#77758D] mt-0.5">
                                    <strong className="text-[#24223D]">Common Pitfall:</strong> {item.common_pitfall}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                      item.difficulty_rating === 'high'
                                        ? 'bg-rose-100 text-rose-700'
                                        : item.difficulty_rating === 'medium'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {item.difficulty_rating} difficulty
                                  </span>
                                  <span className="text-[10px] text-[#77758D] block mt-0.5">
                                    ~{Math.round(item.estimated_success_rate)}% success
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Recommended Pedagogical Actions */}
                    <div className="p-4 rounded-2xl bg-[#4388FF]/5 border border-[#4388FF]/20 space-y-2">
                      <span className="font-bold text-[#24223D] flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-[#4388FF]" />
                        <span>Recommended Instructional Next Steps</span>
                      </span>
                      <div className="space-y-1.5">
                        {aiAnalysis.recommended_pedagogical_actions.map((act, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-white border border-[#E7E6F1] flex items-center gap-2 text-xs text-[#24223D]"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-[#4388FF] shrink-0" />
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scientific Causality Caveat */}
                    <div className="p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] text-[11px] text-[#77758D] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#7657F6] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#24223D] block">Assessment Evidence Caveat:</strong>
                        <span>{aiAnalysis.causality_caveat}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#E7E6F1] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-[#77758D]">
                Assessment ID #{selectedDetail.id} • Registered in SQLite
              </span>
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      <CreateAssessmentModal
        isOpen={showCreateAssessment}
        onClose={() => setShowCreateAssessment(false)}
        onCreated={() => {
          fetchAssessments()
        }}
      />

      <CreateQuizModal
        isOpen={showCreateQuiz}
        onClose={() => setShowCreateQuiz(false)}
        onCreated={() => {
          fetchAssessments()
        }}
      />

      {selectedDetail && (
        <>
          <RecordMarksModal
            isOpen={showRecordMarks}
            assessment={selectedDetail}
            onClose={() => setShowRecordMarks(false)}
            onRecorded={(updated) => {
              setSelectedDetail(updated)
              fetchAssessments()
            }}
          />

          <ImportMarksCsvModal
            isOpen={showImportCsv}
            assessment={selectedDetail}
            onClose={() => setShowImportCsv(false)}
            onImported={(updated) => {
              setSelectedDetail(updated)
              fetchAssessments()
            }}
          />
        </>
      )}
    </div>
  )
}
