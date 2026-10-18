import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { OverviewView } from './pages/OverviewView'
import { ClassesView } from './pages/ClassesView'
import { AssessmentsView } from './pages/AssessmentsView'
import { LearningInsightsView } from './pages/LearningInsightsView'
import { TeacherMemoryView } from './pages/TeacherMemoryView'
import { SettingsView } from './pages/SettingsView'
import { CreateAssessmentModal } from './components/modals/CreateAssessmentModal'
import { AuthModal } from './components/auth/AuthModal'
import { TeacherAssistantDrawer } from './components/ai/TeacherAssistantDrawer'
import { AuthProvider, useAuth } from './context/AuthContext'
import type { ConnectionInfo, NavTab, DashboardOverviewResponse } from './types'
import { apiService } from './services/api'

function AppContent() {
  const { user, isLoading: authLoading } = useAuth()
  const [currentTab, setCurrentTab] = useState<NavTab>('overview')
  const [dashboardData, setDashboardData] = useState<DashboardOverviewResponse | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [createAssessmentOpen, setCreateAssessmentOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [connection, setConnection] = useState<ConnectionInfo>({
    state: 'checking',
  })

  // Check backend health
  const checkHealth = useCallback(async () => {
    setConnection((prev) => ({ ...prev, state: 'checking' }))
    try {
      const { data, latencyMs } = await apiService.checkHealth()
      setConnection({
        state: data.status === 'healthy' ? 'connected' : 'degraded',
        healthData: data,
        latencyMs,
        lastChecked: new Date(),
        errorMessage: undefined,
      })
    } catch (err: unknown) {
      setConnection({
        state: 'offline',
        latencyMs: undefined,
        lastChecked: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Backend unreachable',
      })
    }
  }, [])

  // Fetch dashboard overview data
  const fetchDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const data = await apiService.getDashboardOverview()
      setDashboardData(data)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setDashboardLoading(false)
    }
  }, [])

  // Refetch when auth changes or component mounts
  useEffect(() => {
    checkHealth()
    if (!authLoading) {
      fetchDashboard()
    }

    const interval = setInterval(() => {
      checkHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [checkHealth, fetchDashboard, user, authLoading])

  const handleAssessmentCreated = () => {
    fetchDashboard()
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleInterventionRecorded = () => {
    fetchDashboard()
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <AppLayout
      connection={connection}
      onRefreshHealth={checkHealth}
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onCreateAssessmentClick={() => setCreateAssessmentOpen(true)}
      onOpenTeacherAssistant={() => setAssistantOpen(true)}
      onOpenAuthModal={() => setAuthModalOpen(true)}
    >
      {currentTab === 'overview' && (
        <OverviewView
          data={dashboardData}
          loading={dashboardLoading}
          onRefresh={fetchDashboard}
          onNavigateTab={setCurrentTab}
          onCreateAssessment={() => setCreateAssessmentOpen(true)}
        />
      )}

      {currentTab === 'classes' && <ClassesView />}

      {currentTab === 'assessments' && (
        <AssessmentsView
          onCreateClick={() => setCreateAssessmentOpen(true)}
          refreshKey={refreshTrigger}
        />
      )}

      {currentTab === 'insights' && (
        <LearningInsightsView
          onRecordInterventionSuccess={handleInterventionRecorded}
        />
      )}

      {currentTab === 'memory' && (
        <TeacherMemoryView refreshKey={refreshTrigger} />
      )}

      {currentTab === 'settings' && (
        <SettingsView
          connection={connection}
          onRefreshHealth={checkHealth}
        />
      )}

      {/* Global Create Assessment Modal */}
      <CreateAssessmentModal
        isOpen={createAssessmentOpen}
        onClose={() => setCreateAssessmentOpen(false)}
        onCreated={handleAssessmentCreated}
      />

      {/* Teacher Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          fetchDashboard()
          setRefreshTrigger((prev) => prev + 1)
        }}
      />

      {/* Contextual Teacher Assistant Drawer */}
      <TeacherAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </AppLayout>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
