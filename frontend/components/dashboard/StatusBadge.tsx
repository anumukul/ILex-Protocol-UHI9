import { PositionStatus, STATUS_LABELS } from '@/lib/contracts'

const BADGE_COLORS: Record<number, string> = {
  [PositionStatus.NONE]: 'text-gray-400 bg-gray-500/20',
  [PositionStatus.ACTIVE]: 'text-emerald-400 bg-emerald-500/20',
  [PositionStatus.EXITING]: 'text-amber-400 bg-amber-500/20',
  [PositionStatus.EXITED]: 'text-blue-400 bg-blue-500/20',
  [PositionStatus.REENTERING]: 'text-purple-400 bg-purple-500/20',
}

const DOT_COLORS: Record<number, string> = {
  [PositionStatus.NONE]: 'bg-gray-500',
  [PositionStatus.ACTIVE]: 'bg-emerald-500',
  [PositionStatus.EXITING]: 'bg-amber-500',
  [PositionStatus.EXITED]: 'bg-blue-500',
  [PositionStatus.REENTERING]: 'bg-purple-500',
}

interface StatusBadgeProps {
  status: number
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status as PositionStatus] ?? 'Unknown'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${BADGE_COLORS[status] ?? 'text-gray-400 bg-gray-500/20'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[status] ?? 'bg-gray-500'}`} />
      {label}
    </span>
  )
}
