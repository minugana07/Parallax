import React, { useState, useEffect } from 'react'
import { X, Award, Loader2, Users } from 'lucide-react'
import { apiService } from '../../services/api'
import type { AssessmentDetailResponse, StudentSummary } from '../../types'

interface RecordMarksModalProps {
  isOpen: boolean
  assessment: AssessmentDetailResponse
  onClose: () => void
  onRecorded: (updated: AssessmentDetailResponse) => void
}

interface ScoreRow {
  student_id: number
  student_id_code: string
  student_name: string
  score: string
  feedback: string
}

export const RecordMarksModal: React.FC<RecordMarksModalProps> = ({
  isOpen,
  assessment,
  onClose,
  onRecorded,
}) => {
  const [rows, setRows] = useState<ScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    // Fetch students from classes or roster
    apiService
      .getClasses()
      .then((classes) => {
        let students: StudentSummary[] = []
        if (assessment.class_id) {
          const matched = classes.find((c) => c.id === assessment.class_id)
          if (matched && matched.students) {
            students = matched.students
          }
        }
        if (students.length === 0) {
          // Flatten all students
          const seen = new Set<number>()
          classes.forEach((c) => {
            c.students?.forEach((st) => {
              if (!seen.has(st.id)) {
                seen.add(st.id)
                students.push(st)
              }
            })
          })
        }

        // Map with existing scores from assessment.scores
        const existingMap = new Map(assessment.scores.map((s) => [s.student_id, s]))
        const mappedRows: ScoreRow[] = students.map((st) => {
          const existing = existingMap.get(st.id)
          return {
            student_id: st.id,
            student_id_code: st.student_id_code,
            student_name: st.full_name,
            score: existing ? String(existing.score) : '',
            feedback: existing?.feedback || '',
          }
        })

        // Also add any student in assessment.scores who wasn't in class list
        assessment.scores.forEach((sc) => {
          if (!mappedRows.some((r) => r.student_id === sc.student_id)) {
            mappedRows.push({
              student_id: sc.student_id,
              student_id_code: sc.student_id_code,
              student_name: sc.student_name,
              score: String(sc.score),
              feedback: sc.feedback || '',
            })
          }
        })

        setRows(mappedRows)
      })
      .catch((err) => {
        console.error('Failed to load students for marks:', err)
        setErrorMessage('Failed to load student roster.')
      })
      .finally(() => setLoading(false))
  }, [isOpen, assessment])

  if (!isOpen) return null

  const handleScoreChange = (index: number, val: string) => {
    const updated = [...rows]
    updated[index].score = val
    setRows(updated)
  }

  const handleFeedbackChange = (index: number, val: string) => {
    const updated = [...rows]
    updated[index].feedback = val
    setRows(updated)
  }

  const handleSave = async () => {
    const validScores = rows
      .filter((r) => r.score.trim() !== '')
      .map((r) => ({
        student_id: r.student_id,
        score: parseFloat(r.score) || 0,
        feedback: r.feedback.trim() || undefined,
      }))

    if (validScores.length === 0) {
      setErrorMessage('Please enter at least one student score.')
      return
    }

    setSaving(true)
    setErrorMessage(null)

    try {
      const updated = await apiService.recordAssessmentScores(assessment.id, {
        scores: validScores,
      })
      onRecorded(updated)
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record scores')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E7E6F1] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#4388FF] text-white shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#24223D]">
                Record Student Marks
              </h2>
              <p className="text-xs text-[#77758D]">
                {assessment.title} • Max Marks: {assessment.max_score} • Passing: {assessment.passing_score || 40}%
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 shrink-0">
            {errorMessage}
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#7657F6] animate-spin" />
            </div>
          ) : rows.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-[#77758D] px-3 pb-2 uppercase tracking-wider">
                <span className="col-span-2">USN</span>
                <span className="col-span-4">Student Name</span>
                <span className="col-span-2 text-center">Score (/{assessment.max_score})</span>
                <span className="col-span-4">Feedback / Diagnostic Note</span>
              </div>

              {rows.map((row, idx) => (
                <div
                  key={row.student_id}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] text-xs hover:border-[#7657F6]/40 transition-colors"
                >
                  <span className="col-span-2 font-mono text-[11px] font-semibold text-[#7657F6]">
                    {row.student_id_code}
                  </span>
                  <span className="col-span-4 font-semibold text-[#24223D] truncate">
                    {row.student_name}
                  </span>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      max={assessment.max_score}
                      step="0.5"
                      placeholder="Score"
                      value={row.score}
                      onChange={(e) => handleScoreChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E7E6F1] text-xs text-center font-bold text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="e.g. Mastered BST, review AVL rotation"
                      value={row.feedback}
                      onChange={(e) => handleFeedbackChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E7E6F1] text-xs text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-[#77758D] mx-auto mb-2" />
              <p className="text-xs text-[#77758D]">No enrolled students found in this course section.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E7E6F1] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#77758D]">
            {rows.filter((r) => r.score.trim() !== '').length} of {rows.length} students graded
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || rows.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Compute Grades</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
