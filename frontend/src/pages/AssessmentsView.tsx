import React, { useState, useEffect } from 'react'
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Users,
  ChevronRight,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { apiService } from '../services/api'
import type { AssessmentResponse, AssessmentDetailResponse } from '../types'

interface AssessmentsViewProps {
  onCreateClick: () => void
  refreshKey: number
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({
  onCreateClick,
  refreshKey,
}) => {
  const [assessments, setAssessments] = useState<AssessmentResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedDetail, setSelectedDetail] = useState<AssessmentDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

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
    try {
      const detail = await apiService.getAssessmentDetail(id)
      setSelectedDetail(detail)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const filteredAssessments = assessments.filter((asm) => {
    const matchesSearch = asm.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubject === 'All' || asm.subject === selectedSubject
    return matchesSearch && matchesSubject
  })

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#24223D]">Assessments & Tests</h2>
          <p className="text-xs text-[#77758D]">
            Manage classroom diagnostics, review submission statistics, and examine student score distributions
          </p>
        </div>

        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E7E6F1]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#77758D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#77758D]" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
          >
            <option value="All">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="Physics">Physics</option>
            <option value="Biology">Biology</option>
          </select>
        </div>
      </div>

      {/* Assessment Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-[#7657F6] animate-spin" />
        </div>
      ) : filteredAssessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssessments.map((asm) => (
            <div
              key={asm.id}
              className="bg-white rounded-2xl p-5 border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                    {asm.subject}
                  </span>
                  <span className="text-xs text-[#77758D] font-medium">
                    {asm.grade_level}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#24223D] leading-snug">
                  {asm.title}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E7E6F1]/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#77758D]">Class Average</span>
                  <span className="font-bold text-[#24223D]">
                    {asm.average_percentage !== null && asm.average_percentage !== undefined
                      ? `${asm.average_percentage}% (${asm.average_score}/${asm.max_score})`
                      : 'Pending submissions'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#77758D]">Submissions</span>
                  <span className="font-medium text-[#24223D] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#4388FF]" />
                    <span>{asm.student_count} records</span>
                  </span>
                </div>

                <button
                  onClick={() => handleViewDetail(asm.id)}
                  disabled={loadingDetail}
                  className="w-full mt-2 py-2 rounded-xl text-xs font-semibold bg-[#F7F7FC] hover:bg-[#7657F6]/10 text-[#7657F6] transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {loadingDetail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>View Score Breakdown</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#E7E6F1]">
          <FileCheck2 className="w-8 h-8 text-[#77758D] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#24223D]">No assessments found</h3>
          <p className="text-xs text-[#77758D] mt-1 mb-4">
            Create an assessment to start gathering evidence for your students.
          </p>
          <button
            onClick={onCreateClick}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white cursor-pointer"
          >
            Create Assessment
          </button>
        </div>
      )}

      {/* Detail Slide-out / Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E6F1]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#7657F6]">
                  {selectedDetail.subject} • {selectedDetail.grade_level}
                </span>
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

            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-3 py-4 border-b border-[#E7E6F1]">
              <div className="p-3 rounded-xl bg-[#F7F7FC] text-center">
                <span className="text-[10px] text-[#77758D] block">Max Marks</span>
                <span className="text-sm font-bold text-[#24223D]">{selectedDetail.max_score}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FC] text-center">
                <span className="text-[10px] text-[#77758D] block">Class Average</span>
                <span className="text-sm font-bold text-[#7657F6]">{selectedDetail.average_percentage || 0}%</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FC] text-center">
                <span className="text-[10px] text-[#77758D] block">Submissions</span>
                <span className="text-sm font-bold text-[#24223D]">{selectedDetail.student_count}</span>
              </div>
            </div>

            {/* Score Roster */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              <p className="text-xs font-bold text-[#24223D] mb-2">Student Score Distribution</p>
              {selectedDetail.scores.length > 0 ? (
                selectedDetail.scores.map((sc) => (
                  <div
                    key={sc.student_id}
                    className="p-3 rounded-xl bg-[#F7F7FC] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#24223D]">{sc.student_name}</span>
                      <span className="font-mono text-[10px] text-[#77758D] ml-2">
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
                      <span className={`text-[10px] font-semibold ${sc.percentage >= 70 ? 'text-[#65E6AC]' : 'text-amber-600'}`}>
                        {sc.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#77758D] text-center py-4">No student scores submitted yet.</p>
              )}
            </div>

            <div className="pt-3 border-t border-[#E7E6F1] flex justify-end">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#7657F6] text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
