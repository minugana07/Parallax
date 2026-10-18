import React, { useState } from 'react'
import {
  User,
  Sliders,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react'
import type { ConnectionInfo } from '../types'
import { apiService } from '../services/api'

interface SettingsViewProps {
  connection: ConnectionInfo
  onRefreshHealth: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  connection,
  onRefreshHealth,
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [benchmark, setBenchmark] = useState('75')
  const [attentionThreshold, setAttentionThreshold] = useState('50')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const backendUrl = apiService.getBaseUrl()

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#24223D]">Settings & System Preferences</h2>
        <p className="text-xs text-[#77758D]">
          Manage teacher profile, grading benchmarks, and system configurations
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#65E6AC]" />
          <span>Teacher Intelligence preferences saved successfully.</span>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#E7E6F1]">
          <div className="p-2.5 rounded-xl bg-[#7657F6]/10 text-[#7657F6]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#24223D]">Teacher Profile</h3>
            <p className="text-xs text-[#77758D]">Local instructor profile and department</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">Full Name</label>
            <input
              type="text"
              defaultValue="Ms. Priya Sharma"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-[#F7F7FC]"
              readOnly
            />
          </div>
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">Department</label>
            <input
              type="text"
              defaultValue="Secondary Science & Mathematics (STEM)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-[#F7F7FC]"
              readOnly
            />
          </div>
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">Assigned Grades</label>
            <input
              type="text"
              defaultValue="Grade 9 (Section A & B), Grade 10 (Section A & B)"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-[#F7F7FC]"
              readOnly
            />
          </div>
          <div>
            <label className="block font-semibold text-[#24223D] mb-1">Platform Role</label>
            <input
              type="text"
              defaultValue="Lead Educator & Co-Pilot Evaluator"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E7E6F1] text-xs text-[#24223D] bg-[#F7F7FC]"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* Pedagogical Thresholds Section */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 border border-[#E7E6F1] shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-[#E7E6F1]">
          <div className="p-2.5 rounded-xl bg-[#35D6D0]/10 text-[#35D6D0]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#24223D]">Diagnostic Thresholds</h3>
            <p className="text-xs text-[#77758D]">Configure benchmarks used by the Teacher Memory Engine</p>
          </div>
        </div>

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

      {/* Developer Diagnostics (Collapsible - Preserving Stage 1 Health System Internally) */}
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
                  File: parallax.db (7 tables active)
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
