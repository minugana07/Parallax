import React from 'react'
import type { ConnectionState } from '../../types'

interface StatusBadgeProps {
  state: ConnectionState
  label?: string
  latencyMs?: number
  showPing?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  state,
  label,
  latencyMs,
  showPing = true,
}) => {
  const configs: Record<ConnectionState, {
    bg: string
    border: string
    text: string
    dot: string
    defaultLabel: string
    animate: boolean
  }> = {
    connected: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-[#65E6AC]',
      defaultLabel: 'Backend Connected',
      animate: false,
    },
    checking: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-[#4388FF]',
      dot: 'bg-[#35D6D0]',
      defaultLabel: 'Checking Status...',
      animate: true,
    },
    degraded: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-[#E9B45C]',
      defaultLabel: 'Degraded',
      animate: false,
    },
    offline: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      dot: 'bg-[#D96C83]',
      defaultLabel: 'Backend Offline',
      animate: false,
    },
  }

  const current = configs[state]

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${current.bg} ${current.border} ${current.text}`}
      title={latencyMs !== undefined ? `Response time: ${latencyMs}ms` : undefined}
    >
      <span className="relative flex h-2 w-2">
        {showPing && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${current.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
      </span>
      <span>{label || current.defaultLabel}</span>
      {latencyMs !== undefined && state === 'connected' && (
        <span className="text-[10px] opacity-75 font-mono">({latencyMs}ms)</span>
      )}
    </span>
  )
}
