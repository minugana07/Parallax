import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import type { ConnectionInfo, NavTab } from '../../types'

interface AppLayoutProps {
  children: React.ReactNode
  connection: ConnectionInfo
  onRefreshHealth: () => void
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  onCreateAssessmentClick: () => void
  onOpenTeacherAssistant?: () => void
  onOpenAuthModal?: () => void
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  connection,
  onRefreshHealth,
  currentTab,
  onSelectTab,
  onCreateAssessmentClick,
  onOpenTeacherAssistant,
  onOpenAuthModal,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-dvh flex bg-[#F7F7FC] text-[#24223D]">
      {/* Dark Sidebar with Official Parallax Logo */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        connectionState={connection.state}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          connection={connection}
          onRefresh={onRefreshHealth}
          currentTab={currentTab}
          onCreateAssessmentClick={onCreateAssessmentClick}
          onOpenTeacherAssistant={onOpenTeacherAssistant}
          onOpenAuthModal={onOpenAuthModal}
        />

        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
