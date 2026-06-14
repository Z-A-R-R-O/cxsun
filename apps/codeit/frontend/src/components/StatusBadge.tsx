import type { RunStatus } from '../types.js'

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      {status}
    </span>
  )
}
