import React, { useState } from 'react'
import { Sparkles, Lock, Mail, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  allowClose?: boolean
  onSuccess?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  allowClose = true,
  onSuccess,
}) => {
  const { login, register, demoLogin, error, clearError, user } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localValidation, setLocalValidation] = useState<string | null>(null)

  if (!isOpen && user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalValidation(null)

    if (!email.trim() || !password.trim()) {
      setLocalValidation('Please fill in all required fields.')
      return
    }

    if (password.length < 8) {
      setLocalValidation('Password must be at least 8 characters.')
      return
    }

    if (mode === 'register' && !fullName.trim()) {
      setLocalValidation('Please enter your full name.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(fullName.trim(), email.trim(), password)
      }
      onSuccess?.()
      onClose()
    } catch {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDemoMode = async () => {
    clearError()
    setLocalValidation(null)
    setIsSubmitting(true)
    try {
      await demoLogin()
      onSuccess?.()
      onClose()
    } catch {
      // Handled in context
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0d1021] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        {/* Parallax Branding Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/images/parallax-logo.jpeg"
              alt="parallax emblem"
              className="w-12 h-12 object-contain rounded-xl shadow-lg shadow-[#7657F6]/20"
              onError={(e) => {
                const target = e.currentTarget
                if (!target.src.endsWith('.png')) {
                  target.src = '/images/parallax-logo.png'
                }
              }}
            />
            <div className="flex flex-col items-start leading-none">
              <span className="text-2xl font-bold tracking-tight text-white lowercase">parallax</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#35D6D0] uppercase mt-1 select-none">
                SEE BEYOND THE SCORE
              </span>
            </div>
          </div>
          <p className="text-xs text-[#77758D] mt-2 max-w-xs">
            Teacher Intelligence Platform for evidence-backed interventions and continuous student recovery.
          </p>
        </div>

        {/* 1-Click Demo Mode Banner */}
        <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-[#7657F6]/15 via-[#4388FF]/15 to-[#35D6D0]/15 border border-[#35D6D0]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-5 h-5 text-[#35D6D0] shrink-0" />
            <div className="text-left leading-tight">
              <p className="text-xs font-semibold text-white">Hackathon Jury & Demo Access</p>
              <p className="text-[11px] text-white/60 truncate">Explore pre-seeded classroom & gaps</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDemoMode}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-xl bg-[#35D6D0] text-[#080b18] text-xs font-bold hover:bg-[#65E6AC] transition-all shrink-0 cursor-pointer shadow-sm hover:shadow-[#35D6D0]/30 disabled:opacity-50"
          >
            Try Demo
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              clearError()
              setLocalValidation(null)
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Teacher Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              clearError()
              setLocalValidation(null)
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Display */}
        {(error || localValidation) && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error || localValidation}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Maya Angelou"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#35D6D0] transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-white/80 mb-1.5">School or Personal Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                required
                placeholder="teacher@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#35D6D0] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/80 mb-1.5">
              Password {mode === 'register' && <span className="text-white/40">(min 8 characters)</span>}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#35D6D0] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#7657F6] to-[#4388FF] text-white hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-[#7657F6]/25 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Teacher Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Assurance footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#77758D]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#65E6AC]" />
            <span>Argon2id Encrypted & HttpOnly Session</span>
          </span>
          {allowClose && user && (
            <button
              onClick={onClose}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
