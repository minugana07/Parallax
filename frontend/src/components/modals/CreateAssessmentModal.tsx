import React, { useState, useEffect } from 'react'
import { X, FileCheck2, Loader2, GraduationCap } from 'lucide-react'
import { apiService } from '../../services/api'
import type { AssessmentCreatePayload, ClassSectionResponse } from '../../types'

interface CreateAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  initialClassId?: number
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialClassId,
}) => {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Mathematics')
  const [gradeLevel, setGradeLevel] = useState('Grade 9')
  const [maxScore, setMaxScore] = useState('50')
  const [assessmentDate, setAssessmentDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [targetClassId, setTargetClassId] = useState<string>(
    initialClassId ? String(initialClassId) : ''
  )
  const [classes, setClasses] = useState<ClassSectionResponse[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (initialClassId) {
        setTargetClassId(String(initialClassId))
      }
      apiService
        .getClasses()
        .then((data) => setClasses(data))
        .catch((err) => console.error('Failed to load classes for assessment:', err))
    }
  }, [isOpen, initialClassId])

  if (!isOpen) return null

  const handleClassChange = (selectedId: string) => {
    setTargetClassId(selectedId)
    if (selectedId) {
      const cls = classes.find((c) => String(c.id) === selectedId)
      if (cls) {
        if (cls.subject) setSubject(cls.subject)
        if (cls.semester) setGradeLevel(cls.semester)
        else if (cls.grade_level) setGradeLevel(cls.grade_level)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMessage('Please provide an assessment title.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const payload: AssessmentCreatePayload = {
        title: title.trim(),
        subject,
        grade_level: gradeLevel,
        max_score: parseFloat(maxScore) || 50,
        assessment_date: assessmentDate ? new Date(assessmentDate).toISOString() : undefined,
        class_id: targetClassId ? parseInt(targetClassId, 10) : undefined,
      }
      await apiService.createAssessment(payload)
      onCreated()
      onClose()
      setTitle('')
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create assessment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#77758D] hover:text-[#24223D] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#4388FF] text-white shadow-xs">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#24223D]">
              Create New Assessment
            </h2>
            <p className="text-xs text-[#77758D]">
              Record a diagnostic test, quiz, or midterm evaluation
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Class Association */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Target Class / Section (Optional)
            </label>
            <div className="relative">
              <select
                value={targetClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              >
                <option value="">-- General Assessment (No specific class) --</option>
                {classes.map((cls) => (
                  <option key={cls.id || cls.class_name} value={cls.id ? String(cls.id) : ''}>
                    {cls.course_code ? `[${cls.course_code}] ` : ''}
                    {cls.class_name} — Section {cls.section} ({cls.department || 'RVCE'})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[10px] text-[#77758D] mt-1 block">
              Associating with a class automatically routes diagnostic outcomes to that section&apos;s roster.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Assessment Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CIE-1: Algorithm Complexity & Recurrence"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Subject / Course
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Academic Level / Semester
              </label>
              <input
                type="text"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                placeholder="e.g. Semester 5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Max Marks / Score
              </label>
              <input
                type="number"
                min="5"
                max="500"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Assessment Date
              </label>
              <input
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] text-[11px] text-[#77758D] leading-relaxed flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#7657F6] shrink-0" />
            <span>
              <strong className="text-[#24223D]">Teacher Memory Engine:</strong> Recording this assessment establishes diagnostic baseline evidence to detect student learning gaps.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E7E6F1]">
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
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Creating...' : 'Save Assessment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
