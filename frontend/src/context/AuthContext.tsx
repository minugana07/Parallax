import React, { createContext, useContext, useState, useEffect } from 'react'
import type { TeacherUser } from '../types'
import { apiService } from '../services/api'

interface AuthContextType {
  user: TeacherUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isAuthModalOpen: boolean
  openAuthModal: () => void
  closeAuthModal: () => void
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string) => Promise<void>
  demoLogin: () => Promise<void>
  logout: () => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<TeacherUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Verify session on app load
  useEffect(() => {
    let mounted = true
    const checkSession = async () => {
      try {
        const currentUser = await apiService.getCurrentUser()
        if (mounted) {
          setUser(currentUser)
        }
      } catch {
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkSession()
    return () => {
      mounted = false
    }
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const loggedInUser = await apiService.login({ email, password })
      setUser(loggedInUser)
      setIsAuthModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      setError(msg)
      throw err
    }
  }

  const register = async (fullName: string, email: string, password: string) => {
    setError(null)
    try {
      const registeredUser = await apiService.register({ full_name: fullName, email, password })
      setUser(registeredUser)
      setIsAuthModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(msg)
      throw err
    }
  }

  const demoLogin = async () => {
    setError(null)
    try {
      const demoUser = await apiService.demoLogin()
      setUser(demoUser)
      setIsAuthModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not access Demo Mode.'
      setError(msg)
      throw err
    }
  }

  const logout = async () => {
    try {
      await apiService.logout()
    } finally {
      setUser(null)
      setIsAuthModalOpen(true)
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        register,
        demoLogin,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
