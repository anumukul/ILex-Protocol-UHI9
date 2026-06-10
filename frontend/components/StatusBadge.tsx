"use client";

import { PositionStatus, STATUS_LABELS } from "@/lib/contracts";

const colors: Record<PositionStatus, string> = {
  [PositionStatus.NONE]: "bg-gray-500/20 text-gray-300",
  [PositionStatus.ACTIVE]: "bg-emerald-500/20 text-emerald-300",
  [PositionStatus.EXITING]: "bg-amber-500/20 text-amber-300",
  [PositionStatus.EXITED]: "bg-blue-500/20 text-blue-300",
  [PositionStatus.REENTERING]: "bg-purple-500/20 text-purple-300",
};

interface Props {
  status: PositionStatus;
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
