import React, { useState, useRef, useId } from 'react'
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { apiService } from '../../services/api'
import type { CSVImportResponse } from '../../types'

interface ImportStudentsCSVModalProps {
  isOpen: boolean
  classId: number
  className: string
  onClose: () => void
  onSuccess: (result: CSVImportResponse) => void
}

interface ParsedPreviewRow {
  usn: string
  name: string
  email?: string
}

export const ImportStudentsCSVModal: React.FC<ImportStudentsCSVModalProps> = ({
  isOpen,
  classId,
  className,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload')
  const [csvContent, setCsvContent] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<ParsedPreviewRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [result, setResult] = useState<CSVImportResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()

  if (!isOpen) return null

  const parseCsvPreview = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length < 2) {
      setParsedPreview([])
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
    const usnIdx = headers.findIndex((h) => ['usn', 'roll_no', 'rollno', 'student_id', 'id'].includes(h))
    const nameIdx = headers.findIndex((h) => ['name', 'full_name', 'fullname', 'student_name'].includes(h))
    const emailIdx = headers.findIndex((h) => ['email', 'email_address', 'mail'].includes(h))

    const preview: ParsedPreviewRow[] = []
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''))
      const usn = usnIdx >= 0 && parts[usnIdx] ? parts[usnIdx] : parts[0] || ''
      const name = nameIdx >= 0 && parts[nameIdx] ? parts[nameIdx] : parts[1] || ''
      const email = emailIdx >= 0 && parts[emailIdx] ? parts[emailIdx] : parts[2] || ''
      if (usn || name) {
        preview.push({ usn, name, email })
      }
    }
    setParsedPreview(preview)
  }

  const handleTextChange = (text: string) => {
    setCsvContent(text)
    parseCsvPreview(text)
    setErrorMessage(null)
  }

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setErrorMessage('Please upload a valid .csv file.')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        setCsvContent(text)
        parseCsvPreview(text)
        setErrorMessage(null)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const template = await apiService.getCSVTemplate(classId)
      const blob = new Blob([template.sample_content], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'rvce_students_roster_template.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      // Fallback direct template
      const fallback = `usn,full_name,email,department,semester,section\n1RV23CS001,Aditi Sharma,aditi.cs23@rvce.edu.in,Computer Science & Engineering,Semester 5,A\n1RV23CS002,Bhuvanesh Kumar,bhuvanesh.cs23@rvce.edu.in,Computer Science & Engineering,Semester 5,A\n1RV23CS003,Chandana Rao,chandana.cs23@rvce.edu.in,Computer Science & Engineering,Semester 5,A`
      const blob = new Blob([fallback], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', 'rvce_students_roster_template.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handleSubmit = async () => {
    if (!csvContent.trim()) {
      setErrorMessage('Please select a CSV file or paste CSV content.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await apiService.importStudentsCSV(classId, csvContent)
      setResult(res)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to import student CSV')
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = () => {
    if (result) {
      onSuccess(result)
    }
    onClose()
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

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#7657F6] to-[#4388FF] text-white shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#24223D]">
                Import Student Roster
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6]">
                CSV
              </span>
            </div>
            <p className="text-xs text-[#77758D]">
              Batch enroll students into <span className="font-semibold text-[#7657F6]">{className}</span>
            </p>
          </div>
        </div>

        {/* Import Results View */}
        {result ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#65E6AC]/10 border border-[#65E6AC]/30">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Roster Import Completed</span>
              </div>
              <p className="text-xs text-emerald-700">
                The uploaded records have been processed and enrolled into your class section.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1]">
                <span className="text-[10px] text-[#77758D] block uppercase font-semibold">Total Rows</span>
                <span className="text-base font-bold text-[#24223D]">{result.total_rows}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block uppercase font-semibold">New</span>
                <span className="text-base font-bold text-emerald-800">+{result.imported_count}</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-[10px] text-blue-700 block uppercase font-semibold">Updated</span>
                <span className="text-base font-bold text-blue-800">{result.updated_count}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] text-amber-700 block uppercase font-semibold">Skipped</span>
                <span className="text-base font-bold text-amber-800">{result.skipped_count}</span>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1 max-h-36 overflow-y-auto">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Validation Notices ({result.errors.length})</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#E7E6F1]">
              <button
                type="button"
                onClick={handleComplete}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#7657F6] text-white shadow-xs hover:brightness-105 transition-all cursor-pointer"
              >
                View Updated Class Roster
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Template Download Banner */}
            <div className="p-3.5 rounded-2xl bg-[#F7F7FC] border border-[#E7E6F1] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#24223D] block">
                  Need the RVCE Roster Template?
                </span>
                <span className="text-[11px] text-[#77758D]">
                  Standard headers: <code className="font-mono text-[#7657F6]">usn, full_name, email</code>
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="px-3 py-1.5 rounded-xl border border-[#7657F6]/30 bg-white text-[#7657F6] hover:bg-[#7657F6]/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingTemplate ? 'Downloading...' : 'Get Template'}</span>
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-[#F7F7FC] border border-[#E7E6F1] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-[#7657F6] shadow-xs'
                    : 'text-[#77758D] hover:text-[#24223D]'
                }`}
              >
                Upload File (.csv)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'paste'
                    ? 'bg-white text-[#7657F6] shadow-xs'
                    : 'text-[#77758D] hover:text-[#24223D]'
                }`}
              >
                Paste CSV Data
              </button>
            </div>

            {/* Upload Tab */}
            {activeTab === 'upload' ? (
              <div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#7657F6] bg-[#7657F6]/5'
                      : 'border-[#E7E6F1] hover:border-[#7657F6]/40 bg-white'
                  }`}
                >
                  <label htmlFor={fileInputId} className="sr-only">Upload CSV file</label>
                  <input
                    id={fileInputId}
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFile(e.target.files[0])
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-[#7657F6]/10 text-[#7657F6] flex items-center justify-center mx-auto mb-2">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  {fileName ? (
                    <div>
                      <span className="text-xs font-bold text-[#24223D] block">{fileName}</span>
                      <span className="text-[11px] text-[#65E6AC] font-semibold">Ready to import</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-[#24223D] block">
                        Drag & drop your CSV file here, or browse
                      </span>
                      <span className="text-[11px] text-[#77758D]">
                        Supports standard UTF-8 CSV exports from college portals
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  value={csvContent}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`usn,full_name,email\n1RV23CS001,Aditi Sharma,aditi.cs23@rvce.edu.in\n1RV23CS002,Bhuvanesh Kumar,bhuvanesh.cs23@rvce.edu.in`}
                  rows={6}
                  className="w-full p-3 rounded-2xl border border-[#E7E6F1] font-mono text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
                />
              </div>
            )}

            {/* Live Preview Table */}
            {parsedPreview.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#77758D]">
                  <span className="font-semibold text-[#24223D]">
                    Preview (First {parsedPreview.length} rows detected)
                  </span>
                  <span className="flex items-center gap-1 text-[#65E6AC] font-bold">
                    <FileText className="w-3 h-3" /> Auto-mapped headers
                  </span>
                </div>
                <div className="border border-[#E7E6F1] rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F7F7FC] border-b border-[#E7E6F1] text-[#77758D]">
                      <tr>
                        <th className="py-1.5 px-3">USN</th>
                        <th className="py-1.5 px-3">Full Name</th>
                        <th className="py-1.5 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E6F1]/50">
                      {parsedPreview.map((r, idx) => (
                        <tr key={idx} className="hover:bg-[#F7F7FC]">
                          <td className="py-1.5 px-3 font-mono font-bold text-[#7657F6]">{r.usn}</td>
                          <td className="py-1.5 px-3 font-medium text-[#24223D]">{r.name}</td>
                          <td className="py-1.5 px-3 text-[#77758D]">{r.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !csvContent.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Processing CSV...' : 'Confirm & Import Roster'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
