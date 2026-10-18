import React, { useState } from 'react'
import { X, UserPlus, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { apiService } from '../../services/api'
import type { StudentSummary } from '../../types'

interface AddStudentModalProps {
  isOpen: boolean
  classId: number
  className: string
  onClose: () => void
  onAdded: (student: StudentSummary) => void
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  classId,
  className,
  onClose,
  onAdded,
}) => {
  const [usn, setUsn] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usn.trim() || !fullName.trim()) {
      setErrorMessage('Please provide both the student USN and full name.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const newStudent = await apiService.addStudentToClass(classId, {
        student_id_code: usn.trim().toUpperCase(),
        full_name: fullName.trim(),
        email: email.trim() || undefined,
      })
      onAdded(newStudent)
      onClose()
      setUsn('')
      setFullName('')
      setEmail('')
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add student to class')
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
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#24223D]">
              Add Student to Roster
            </h2>
            <p className="text-xs text-[#77758D]">
              Target: <span className="font-semibold text-[#7657F6]">{className}</span>
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
              placeholder="e.g. 1RV23CS045"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] uppercase font-mono"
              required
            />
            <span className="text-[10px] text-[#77758D] mt-1 block">
              RVCE format: <span className="font-mono">1RV[Year][Dept][Roll]</span> (e.g., 1RV23CS001)
            </span>
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
              placeholder="e.g. Aditi Sharma"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
              required
            />
          </div>

          {/* Institutional Email */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              College Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aditi.cs23@rvce.edu.in"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
            />
          </div>

          {/* Privacy note */}
          <div className="p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] text-[11px] text-[#77758D] flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#35D6D0] shrink-0" />
            <span>Parallax respects privacy: student rosters do not store unnecessary personal or biometric information.</span>
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
              <span>{submitting ? 'Enrolling...' : 'Enroll Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
