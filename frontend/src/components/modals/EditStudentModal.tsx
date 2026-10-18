import React, { useState, useEffect } from 'react'
import { X, UserCheck, Loader2, AlertCircle } from 'lucide-react'
import { apiService } from '../../services/api'
import type { StudentSummary, StudentUpdate } from '../../types'

interface EditStudentModalProps {
  isOpen: boolean
  student: StudentSummary | null
  onClose: () => void
  onUpdated: (student: StudentSummary) => void
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onUpdated,
}) => {
  const [usn, setUsn] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (student) {
      setUsn(student.student_id_code || '')
      setFullName(student.full_name || '')
      setEmail(student.email || '')
    }
  }, [student])

  if (!isOpen || !student) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usn.trim() || !fullName.trim()) {
      setErrorMessage('Please provide both the student USN and full name.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const payload: StudentUpdate = {
      student_id_code: usn.trim().toUpperCase(),
      full_name: fullName.trim(),
      email: email.trim() || undefined,
    }

    try {
      const updated = await apiService.updateStudent(student.id, payload)
      onUpdated(updated)
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update student profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200">
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
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#24223D]">
              Edit Student Details
            </h2>
            <p className="text-xs text-[#77758D]">
              Updating records for <span className="font-mono font-bold text-[#7657F6]">{student.student_id_code}</span>
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
          {/* Institutional USN */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              University Seat Number (USN) *
            </label>
            <input
              type="text"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] uppercase font-mono"
              required
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              required
            />
          </div>

          {/* Institutional Email */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              College Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
            />
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
              <span>{submitting ? 'Saving...' : 'Save Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
