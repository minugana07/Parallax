import React, { useState, useEffect } from 'react'
import { X, FileCheck2, Loader2, GraduationCap, Clock, Award } from 'lucide-react'
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
  const [subject, setSubject] = useState('Data Structures & Algorithms')
  const [gradeLevel, setGradeLevel] = useState('Semester 5')
  const [courseCode, setCourseCode] = useState('22CS52')
  const [assessmentType, setAssessmentType] = useState('cie_exam')
  const [maxScore, setMaxScore] = useState('50')
  const [passingScore, setPassingScore] = useState('20')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [description, setDescription] = useState('')
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
        .then((data) => {
          setClasses(data)
          const targetId = initialClassId || (data.length > 0 ? data[0].id : null)
          if (targetId) {
            setTargetClassId(String(targetId))
            const cls = data.find((c) => c.id === targetId)
            if (cls) {
              if (cls.subject || cls.course_name) setSubject(cls.subject || cls.course_name || '')
              if (cls.course_code) setCourseCode(cls.course_code)
              if (cls.semester) setGradeLevel(cls.semester)
            }
          }
        })
        .catch((err) => console.error('Failed to load classes for assessment:', err))
    }
  }, [isOpen, initialClassId])

  if (!isOpen) return null

  const handleClassChange = (selectedId: string) => {
    setTargetClassId(selectedId)
    if (selectedId) {
      const cls = classes.find((c) => String(c.id) === selectedId)
      if (cls) {
        if (cls.subject || cls.course_name) setSubject(cls.subject || cls.course_name || '')
        if (cls.course_code) setCourseCode(cls.course_code)
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
      const parsedMax = parseFloat(maxScore) || 50
      const parsedPass = parseFloat(passingScore) || parsedMax * 0.4
      const payload: AssessmentCreatePayload = {
        title: title.trim(),
        subject: subject.trim(),
        grade_level: gradeLevel,
        semester: gradeLevel,
        course_code: courseCode.trim() || undefined,
        assessment_type: assessmentType,
        status: 'draft',
        max_score: parsedMax,
        passing_score: parsedPass,
        duration_minutes: parseInt(durationMinutes, 10) || 60,
        description: description.trim() || undefined,
        assessment_date: assessmentDate ? new Date(assessmentDate).toISOString() : undefined,
        class_id: targetClassId ? parseInt(targetClassId, 10) : undefined,
      }
      await apiService.createAssessment(payload)
      onCreated()
      onClose()
      setTitle('')
      setDescription('')
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create assessment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200 my-8">
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
              Create Academic Assessment
            </h2>
            <p className="text-xs text-[#77758D]">
              Author a college evaluation (CIE exam, lab practical, midterm, or course assignment)
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
              Course Section
            </label>
            <div className="relative">
              <select
                value={targetClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] bg-white"
              >
                <option value="">-- General Assessment (All Enrolled Cohorts) --</option>
                {classes.map((cls) => (
                  <option key={cls.id || cls.class_name} value={cls.id ? String(cls.id) : ''}>
                    {cls.course_code ? `[${cls.course_code}] ` : ''}
                    {cls.class_name || cls.course_name} — Section {cls.section} ({cls.semester || 'College Level'})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[10px] text-[#77758D] mt-1 block">
              Associating with a course section routes diagnostic evidence directly to that section&apos;s students.
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
                Assessment Type
              </label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] bg-white"
              >
                <option value="cie_exam">CIE Examination (Continuous Evaluation)</option>
                <option value="lab_test">Lab Practical / Test</option>
                <option value="assignment">Course Assignment</option>
                <option value="midterm">Midterm Examination</option>
                <option value="project">Project Review / Evaluation</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Course Code (e.g. 22CS52)
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. 22CS52"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Subject / Course Name *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Semester / Academic Level *
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#24223D] mb-1 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#7657F6]" />
                <span>Max Marks *</span>
              </label>
              <input
                type="number"
                min="5"
                max="500"
                value={maxScore}
                onChange={(e) => {
                  setMaxScore(e.target.value)
                  const p = parseFloat(e.target.value)
                  if (!isNaN(p)) setPassingScore(String(Math.round(p * 0.4)))
                }}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Passing Marks (40%)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#4388FF]" />
                <span>Duration (Min)</span>
              </label>
              <input
                type="number"
                min="10"
                max="360"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>
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

          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Description / Evaluation Guidelines (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Focus on graph traversal, minimum spanning trees, and asymptotic analysis."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] text-[11px] text-[#77758D] leading-relaxed flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#7657F6] shrink-0" />
            <span>
              <strong className="text-[#24223D]">Teacher Memory Engine:</strong> Recording marks for this assessment establishes empirical evidence to detect learning gaps and recommend interventions.
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
              <span>{submitting ? 'Creating...' : 'Create Assessment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
