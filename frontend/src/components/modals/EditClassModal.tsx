import React, { useState, useEffect } from 'react'
import { X, Edit3, Loader2, AlertCircle } from 'lucide-react'
import { apiService } from '../../services/api'
import type { AcademicClassUpdate, ClassSectionResponse, ClassDetailResponse } from '../../types'

interface EditClassModalProps {
  isOpen: boolean
  classData: ClassDetailResponse | ClassSectionResponse | null
  onClose: () => void
  onUpdated: (updated: ClassSectionResponse | ClassDetailResponse) => void
}

const RVCE_DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Aerospace Engineering',
  'Chemical Engineering',
  'Biotechnology',
]

const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8',
]

export const EditClassModal: React.FC<EditClassModalProps> = ({
  isOpen,
  classData,
  onClose,
  onUpdated,
}) => {
  const [institution, setInstitution] = useState('RV College of Engineering (RVCE)')
  const [department, setDepartment] = useState('Computer Science & Engineering')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  const [semester, setSemester] = useState('Semester 5')
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [section, setSection] = useState('A')
  const [timetableNotes, setTimetableNotes] = useState('')
  const [isArchived, setIsArchived] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (classData) {
      setInstitution(classData.institution || 'RV College of Engineering (RVCE)')
      setDepartment(classData.department || 'Computer Science & Engineering')
      setAcademicYear(classData.academic_year || '2025-2026')
      setSemester(classData.semester || 'Semester 5')
      setCourseCode(classData.course_code || '')
      setCourseName(classData.course_name || classData.class_name || '')
      setSection(classData.section || 'A')
      setTimetableNotes(classData.timetable_notes || '')
      setIsArchived(Boolean(classData.is_archived))
    }
  }, [classData])

  if (!isOpen || !classData) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classData.id) return

    setSubmitting(true)
    setErrorMessage(null)

    const payload: AcademicClassUpdate = {
      institution: institution.trim(),
      department: department.trim(),
      academic_year: academicYear.trim(),
      semester: semester.trim(),
      course_code: courseCode.trim() ? courseCode.trim().toUpperCase() : undefined,
      course_name: courseName.trim(),
      section: section.trim(),
      timetable_notes: timetableNotes.trim() || undefined,
      is_archived: isArchived,
    }

    try {
      const updated = await apiService.updateClass(classData.id, payload)
      onUpdated(updated)
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update academic class')
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

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#4388FF] text-white shadow-xs">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#24223D]">
                Edit Academic Class
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                {classData.course_code || 'RVCE'}
              </span>
            </div>
            <p className="text-xs text-[#77758D]">
              Update class metadata, timetable notes, and active status
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Institution */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Institution
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              required
            />
          </div>

          {/* Department & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Department / Branch *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              >
                {RVCE_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Semester *
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course Name & Course Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#24223D] mb-1">
                Course Title *
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] uppercase font-mono"
              />
            </div>
          </div>

          {/* Section & Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Section / Class Group *
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[#24223D] mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              />
            </div>
          </div>

          {/* Timetable Notes */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Timetable & Room Notes
            </label>
            <input
              type="text"
              value={timetableNotes}
              onChange={(e) => setTimetableNotes(e.target.value)}
              placeholder="e.g. Mon, Wed, Fri 09:00 AM - 10:00 AM @ CSE Lab 3"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
            />
          </div>

          {/* Archive Status Toggle */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1]">
            <input
              type="checkbox"
              id="is_archived_checkbox"
              checked={isArchived}
              onChange={(e) => setIsArchived(e.target.checked)}
              className="rounded text-[#7657F6] focus:ring-[#7657F6] cursor-pointer"
            />
            <label htmlFor="is_archived_checkbox" className="text-xs text-[#24223D] font-medium cursor-pointer">
              Archive this class (Hides from active views, preserves all history and assessment records)
            </label>
          </div>

          {/* Actions */}
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
              <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
