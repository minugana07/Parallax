import React, { useState } from 'react'
import {
  LayoutDashboard,
  GraduationCap,
  FileCheck2,
  Compass,
  BrainCircuit,
  Settings,
  X,
  Database,
  Sparkles,
} from 'lucide-react'
import type { ConnectionState, NavTab } from '../../types'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  connectionState: ConnectionState
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  connectionState,
}) => {
  const [logoSrc, setLogoSrc] = useState('/images/parallax-logo.jpeg')
  const [logoLoadError, setLogoLoadError] = useState(false)

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'classes',
      label: 'My Classes',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: 'assessments',
      label: 'Assessments',
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      id: 'insights',
      label: 'Learning Insights',
      icon: <Compass className="w-4 h-4" />,
      badge: '5 Gaps',
    },
    {
      id: 'memory',
      label: 'Teacher Memory',
      icon: <BrainCircuit className="w-4 h-4" />,
      badge: 'Engine',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container: Midnight Indigo #17152F blending with logo navy background */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0d1021] text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header: Standalone Emblem + Typography in Compact Row */}
        <div className="p-4 px-5 border-b border-white/10 bg-[#080b18] flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            {/* Left: Standalone circular emblem */}
            <div className="w-11 h-11 shrink-0 flex items-center justify-center">
              {!logoLoadError ? (
                <img
                  src={logoSrc}
                  alt="parallax emblem"
                  className="w-11 h-11 object-contain rounded-xl"
                  onError={() => {
                    if (logoSrc === '/images/parallax-logo.jpeg') {
                      setLogoSrc('/images/parallax-logo.png')
                    } else {
                      setLogoLoadError(true)
                    }
                  }}
                />
              ) : (
                /* High-fidelity SVG approximation fallback */
                <div className="w-11 h-11 relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="swirlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#35D6D0" />
                        <stop offset="50%" stopColor="#4388FF" />
                        <stop offset="100%" stopColor="#7657F6" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="url(#swirlGrad)" />
                    <path
                      d="M 50 8 A 42 42 0 0 1 92 50 C 70 50 50 30 50 8 Z"
                      fill="#35D6D0"
                      opacity="0.9"
                    />
                    <path
                      d="M 50 92 A 42 42 0 0 1 8 50 C 30 50 50 70 50 92 Z"
                      fill="#080b18"
                    />
                    {/* 4-point sparkle */}
                    <polygon
                      points="80,12 83,20 91,23 83,26 80,34 77,26 69,23 77,20"
                      fill="#FFFFFF"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Right: Wordmark + Tagline */}
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-xl font-bold tracking-tight text-white lowercase leading-none">
                parallax
              </span>
              <span className="text-[9px] font-bold tracking-[0.2em] text-[#35D6D0] uppercase mt-1 leading-none select-none">
                SEE BEYOND THE SCORE
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 md:hidden transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-6 px-3 overflow-y-auto space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#77758D] mb-2">
              Workspace
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = currentTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id)
                      onClose()
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-md shadow-[#7657F6]/20'
                        : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'text-[#35D6D0]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#7657F6]/20 text-[#35D6D0] border border-[#35D6D0]/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Teacher Memory Engine Pillar Card */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#65E6AC]">
              <Sparkles className="w-3.5 h-3.5 text-[#35D6D0]" />
              <span>Teacher Memory Engine</span>
            </div>
            <p className="text-xs text-white/75 leading-relaxed">
              Connects assessment evidence to pedagogical interventions and tracks recovery over time.
            </p>
            <button
              onClick={() => onSelectTab('memory')}
              className="text-xs text-[#35D6D0] hover:text-white font-medium inline-flex items-center gap-1 cursor-pointer transition-colors pt-1"
            >
              View Active Memory Chains →
            </button>
          </div>
        </div>

        {/* Bottom System Status */}
        <div className="p-4 border-t border-white/10 bg-[#080b18]">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#35D6D0]" />
              <span>SQLite Engine</span>
            </span>
            <span className="font-mono text-[10px] text-[#65E6AC]">v0.2.0</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#77758D]">
            <span>Teacher Intelligence Mode</span>
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-[#65E6AC]'
                  : connectionState === 'checking'
                  ? 'bg-[#35D6D0] animate-pulse'
                  : 'bg-[#E9B45C]'
              }`}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
