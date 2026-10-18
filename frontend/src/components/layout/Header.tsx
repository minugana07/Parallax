import React from 'react'
import { Menu, Plus, LogIn, LogOut, Bot } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { ConnectionInfo, NavTab } from '../../types'

interface HeaderProps {
  onMenuToggle: () => void
  connection: ConnectionInfo
  onRefresh: () => void
  currentTab: NavTab
  onCreateAssessmentClick: () => void
  onOpenTeacherAssistant?: () => void
  onOpenAuthModal?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  connection: _connection,
  currentTab,
  onCreateAssessmentClick,
  onOpenTeacherAssistant,
  onOpenAuthModal,
}) => {
  const { user, isAuthenticated, logout } = useAuth()

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Teacher Intelligence Dashboard',
      subtitle: 'Overview & Diagnostic Decision Center',
    },
    classes: {
      title: 'My Classes & Student Rosters',
      subtitle: 'Comprehension benchmarks across enrolled sections',
    },
    assessments: {
      title: 'Classroom Assessments',
      subtitle: 'Diagnostic evaluations, score records & distribution',
    },
    insights: {
      title: 'Learning Gap Insights',
      subtitle: 'Targeted conceptual misconceptions needing remediation',
    },
    memory: {
      title: 'Teacher Memory Engine',
      subtitle: 'Longitudinal record connecting evidence, interventions & outcomes',
    },
    settings: {
      title: 'Settings & System Preferences',
      subtitle: 'Teacher profile, grading thresholds & engine parameters',
    },
  }

  const currentInfo = tabTitles[currentTab]

  const getInitials = (name?: string) => {
    if (!name) return 'PS'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E7E6F1] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-2 rounded-xl text-[#24223D] hover:bg-[#F7F7FC] md:hidden transition-colors cursor-pointer shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-[#24223D] leading-tight truncate">
              {currentInfo.title}
            </h1>
            <span className="hidden lg:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#7657F6]/10 text-[#7657F6] shrink-0">
              Parallax AI
            </span>
          </div>
          <p className="text-xs text-[#77758D] hidden sm:block truncate">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Quick Action, Teacher Assistant, Profile & Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Parallax Teacher Assistant Button */}
        {onOpenTeacherAssistant && (
          <button
            onClick={onOpenTeacherAssistant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0d1021] text-white hover:bg-[#17152F] border border-white/10 shadow-xs transition-all cursor-pointer"
            title="Open Teacher Assistant"
          >
            <Bot className="w-3.5 h-3.5 text-[#35D6D0]" />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        )}

        {/* Create Assessment Button */}
        <button
          onClick={onCreateAssessmentClick}
          className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-xs hover:shadow-md hover:brightness-105 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
        </button>

        {/* Teacher Profile / Auth status */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#E7E6F1]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7657F6] to-[#35D6D0] flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
              {getInitials(user.full_name)}
            </div>
            <div className="hidden xl:block text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-[#24223D] leading-none truncate max-w-[130px]">
                  {user.full_name}
                </p>
                {user.is_demo && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                    DEMO
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#77758D] mt-0.5 leading-none truncate max-w-[130px]">
                {user.email}
              </p>
            </div>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[#77758D] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="pl-2 border-l border-[#E7E6F1]">
            <button
              onClick={onOpenAuthModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#7657F6] text-white hover:brightness-105 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
