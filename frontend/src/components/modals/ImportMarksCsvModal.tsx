import React, { useState } from 'react'
import { X, UploadCloud, FileSpreadsheet, Copy, Check, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import type { AssessmentDetailResponse } from '../../types'

interface ImportMarksCsvModalProps {
  isOpen: boolean
  assessment: AssessmentDetailResponse
  onClose: () => void
  onImported: (updated: AssessmentDetailResponse) => void
}

export const ImportMarksCsvModal: React.FC<ImportMarksCsvModalProps> = ({
  isOpen,
  assessment,
  onClose,
  onImported,
}) => {
  const [csvText, setCsvText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState(false)

  if (!isOpen) return null

  const sampleCsv = `USN,Score,Feedback
1RV23CS001,45.0,Excellent solution on recursive tree traversal
1RV23CS002,32.0,Review AVL double rotations
1RV23CS003,48.5,Flawless implementation and time complexity analysis
1RV23CS004,28.0,Needs clarification on balance factor calculations`

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(sampleCsv)
    setCopiedTemplate(true)
    setTimeout(() => setCopiedTemplate(false), 2000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setCsvText(content)
      }
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvText.trim()) {
      setErrorMessage('Please provide CSV content or upload a CSV file.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const updated = await apiService.importAssessmentScoresCsv(assessment.id, csvText.trim())
      onImported(updated)
      onClose()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import CSV scores')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E7E6F1] relative animate-in fade-in zoom-in-95 duration-200 my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E7E6F1]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#4388FF] text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#24223D]">
                Import Student Marks via CSV
              </h2>
              <p className="text-xs text-[#77758D]">
                Bulk import marks using student USNs for {assessment.title} (Max Marks: {assessment.max_score})
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
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Format Explanation & Template */}
          <div className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#24223D] flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#7657F6]" />
                <span>Supported CSV Format</span>
              </span>
              <button
                type="button"
                onClick={handleCopyTemplate}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white border border-[#E7E6F1] hover:bg-[#F7F7FC] text-[#7657F6] transition-colors cursor-pointer"
              >
                {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTemplate ? 'Copied' : 'Copy Template'}</span>
              </button>
            </div>

            <p className="text-[11px] text-[#77758D] leading-relaxed">
              Include columns for <strong>USN</strong>, <strong>Score</strong>, and optional <strong>Feedback</strong>. Header row is optional.
            </p>

            <pre className="font-mono text-[11px] text-[#24223D] bg-white p-2.5 rounded-xl border border-[#E7E6F1] overflow-x-auto">
              {sampleCsv}
            </pre>
          </div>

          {/* File Upload Zone */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Upload .CSV File
            </label>
            <div className="border-2 border-dashed border-[#E7E6F1] hover:border-[#7657F6]/50 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#F7F7FC]/50 relative">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-6 h-6 text-[#7657F6] mx-auto mb-1" />
              <p className="text-xs font-semibold text-[#24223D]">
                Drop CSV file here or click to browse
              </p>
              <p className="text-[10px] text-[#77758D] mt-0.5">
                Accepts comma-separated values (.csv)
              </p>
            </div>
          </div>

          {/* Direct Text Area */}
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Or Paste CSV Data Directly
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste your CSV content here (USN, Score, Feedback)..."
              className="w-full font-mono text-xs p-3 rounded-xl border border-[#E7E6F1] text-[#24223D] bg-white focus:outline-hidden focus:border-[#7657F6]"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-[#E7E6F1] flex items-center justify-end gap-3">
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
              disabled={submitting || !csvText.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Import & Record Marks</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
