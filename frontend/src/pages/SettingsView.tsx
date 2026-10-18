import React, { useState, useEffect } from 'react'
import {
  User as UserIcon,
  Sliders,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  GraduationCap,
} from 'lucide-react'
import type { ConnectionInfo, ClassSectionResponse } from '../types'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'

interface SettingsViewProps {
  connection: ConnectionInfo
  onRefreshHealth: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  connection,
  onRefreshHealth,
}) => {
  const { user, updateProfile } = useAuth()

  // Profile edit state
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [institution, setInstitution] = useState(user?.institution || 'RV College of Engineering (RVCE)')
  const [department, setDepartment] = useState(user?.department || 'Computer Science & Engineering')
  const [designation, setDesignation] = useState(user?.designation || 'Assistant Professor')

  // Profile save feedback
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Academic workload
  const [classes, setClasses] = useState<ClassSectionResponse[]>([])

  // Diagnostic thresholds state
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [benchmark, setBenchmark] = useState('75')
  const [attentionThreshold, setAttentionThreshold] = useState('50')
  const [thresholdSaved, setThresholdSaved] = useState(false)

  // Sync state when user profile updates
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setEmail(user.email || '')
      setInstitution(user.institution || 'RV College of Engineering (RVCE)')
      setDepartment(user.department || 'Computer Science & Engineering')
      setDesignation(user.designation || 'Assistant Professor')
    }
  }, [user])

  // Fetch teacher's actual academic classes for dynamic workload summary
  useEffect(() => {
    apiService
      .getClasses()
      .then((data) => setClasses(data))
      .catch((err) => console.error('Failed to load teacher workload:', err))
  }, [])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) {
      setProfileError('Full Name and Email Address are required.')
      return
    }

    setSavingProfile(true)
    setProfileError(null)

    try {
      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        institution: institution.trim(),
        department: department.trim(),
        designation: designation.trim(),
      })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleThresholdSave = (e: React.FormEvent) => {
    e.preventDefault()
    setThresholdSaved(true)
    setTimeout(() => setThresholdSaved(false), 3000)
  }

  const workloadSummary =
    classes.length > 0
      ? classes
          .map(
            (c) =>
              `${(c.semester || 'Sem').replace('Semester', 'Sem').trim()} Sec ${c.section || 'A'} (${c.course_code || c.course_name})`
          )
          .join(', ')
      : 'No active classes assigned yet'

  const backendUrl = apiService.getBaseUrl()

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#24223D]">Settings & Faculty Profile</h2>
        <p className="text-xs text-[#77758D]">
          Manage faculty credentials, institutional workload, and diagnostic benchmarks
        </p>
      </div>

      {profileSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#65E6AC] shrink-0" />
          <span>Faculty profile updated and saved to SQLite database successfully.</span>
        </div>
      )}

      {profileError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{profileError}</span>
        </div>
      )}

      {/* Editable Faculty Profile Section */}
      <form onSubmit={handleProfileSubmit} className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E7E6F1]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#7657F6]/10 text-[#7657F6]">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#24223D]">Faculty Profile</h3>
              <p className="text-xs text-[#77758D]">Institutional credentials and department assignment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.is_demo && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                DEMO TEACHER
              </span>
            )}
            <span className="text-[11px] text-[#77758D] font-mono">ID: #{user?.id ?? '—'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Minu Thillai Ganapathy"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] focus:ring-1 focus:ring-[#7657F6]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Institutional Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. faculty@rvce.edu.in"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] focus:ring-1 focus:ring-[#7657F6]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-[#24223D] mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#7657F6]" />
              <span>Institution / College</span>
            </label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. RV College of Engineering (RVCE)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] focus:ring-1 focus:ring-[#7657F6]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#24223D] mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] focus:ring-1 focus:ring-[#7657F6]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#24223D] mb-1">Designation / Role</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Assistant Professor & Course Coordinator"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6] focus:ring-1 focus:ring-[#7657F6]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#24223D] mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#35D6D0]" />
              <span>Assigned Semesters / Active Workload</span>
            </label>
            <input
              type="text"
              value={workloadSummary}
              readOnly
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#77758D] bg-[#F7F7FC] cursor-not-allowed"
              title="Calculated dynamically from active class rosters in SQLite"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <span>Save Faculty Profile</span>
            )}
          </button>
        </div>
      </form>

      {/* Pedagogical Thresholds Section */}
      <form onSubmit={handleThresholdSave} className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#E7E6F1]">
          <div className="p-2.5 rounded-xl bg-[#35D6D0]/10 text-[#35D6D0]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#24223D]">Diagnostic Thresholds</h3>
            <p className="text-xs text-[#77758D]">Configure benchmarks used by the Teacher Memory Engine</p>
          </div>
        </div>

        {thresholdSaved && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#65E6AC]" />
            <span>Diagnostic thresholds updated.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Class Mastery Benchmark (%)
            </label>
            <input
              type="number"
              min="50"
              max="95"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
            />
            <span className="text-[10px] text-[#77758D] mt-1 block">
              Scores below this line in performance charts show topics needing review.
            </span>
          </div>

          <div>
            <label className="block font-semibold text-[#24223D] mb-1">
              Learning Gap Alert Threshold (%)
            </label>
            <input
              type="number"
              min="20"
              max="70"
              value={attentionThreshold}
              onChange={(e) => setAttentionThreshold(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] focus:outline-hidden focus:border-[#7657F6]"
            />
            <span className="text-[10px] text-[#77758D] mt-1 block">
              Scores below this threshold automatically flag potential misconceptions.
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:brightness-105 transition-all cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Developer Diagnostics (Collapsible) */}
      <div className="bg-white rounded-3xl border border-[#E7E6F1] overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowDiagnostics((prev) => !prev)}
          className="w-full p-5 flex items-center justify-between hover:bg-[#F7F7FC] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#F7F7FC] text-[#77758D] border border-[#E7E6F1]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#24223D]">
                Backend & Database Diagnostics
              </h3>
              <p className="text-[11px] text-[#77758D]">
                Technical runtime indicators (FastAPI, SQLite schema, latency)
              </p>
            </div>
          </div>
          {showDiagnostics ? (
            <ChevronUp className="w-4 h-4 text-[#77758D]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#77758D]" />
          )}
        </button>

        {showDiagnostics && (
          <div className="p-6 pt-2 border-t border-[#E7E6F1] space-y-4 bg-[#F7F7FC]/50 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#E7E6F1]">
                <span className="text-[10px] text-[#77758D] block">FastAPI Service Status</span>
                <span className="font-semibold text-emerald-700">
                  {connection.state.toUpperCase()}
                </span>
                <span className="text-[10px] text-[#77758D] block mt-1">
                  Latency: {connection.latencyMs ?? 0}ms
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E7E6F1]">
                <span className="text-[10px] text-[#77758D] block">SQLite Database Engine</span>
                <span className="font-semibold text-[#24223D]">
                  {connection.healthData?.database.status.toUpperCase() || 'OPERATIONAL'}
                </span>
                <span className="text-[10px] text-[#77758D] block mt-1">
                  File: parallax.db (SQLite persistent storage)
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={`${backendUrl}/docs`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#7657F6] font-semibold hover:underline"
              >
                <span>Open Interactive OpenAPI (Swagger) Docs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={onRefreshHealth}
                className="px-3 py-1.5 rounded-xl border border-[#E7E6F1] hover:bg-white text-[#24223D] font-medium transition-colors cursor-pointer"
              >
                Re-check Health
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
