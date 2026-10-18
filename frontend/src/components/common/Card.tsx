import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  badge?: React.ReactNode
  icon?: React.ReactNode
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  badge,
  icon,
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#E7E6F1] shadow-xs hover:shadow-md transition-shadow duration-200 p-6 ${className}`}
    >
      {(title || subtitle || icon || badge) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-[#E7E6F1]/60">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 rounded-xl bg-[#F7F7FC] text-[#7657F6] border border-[#E7E6F1]">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-base font-semibold text-[#24223D]">{title}</h3>}
              {subtitle && <p className="text-xs text-[#77758D] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
