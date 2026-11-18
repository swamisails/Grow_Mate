import type { CourseProgress } from '../../api/types/progress'
import { copy } from '../../app/copy'

const words = {
  not_yet_started: copy.progress.notYetStarted,
  in_progress: copy.progress.inProgress,
} as const

/**
 * The plain Progress bar (AD-16): grey when not yet started, half blue when in progress.
 * The state word sits beside the bar. No numbers.
 */
export function ProgressBar({ status }: { status: NonNullable<CourseProgress['status']> }) {
  const word = words[status]

  return (
    <div className="progress" role="img" aria-label={copy.progress.label(word)}>
      <div className="progress__track">
        <div className={`progress__fill progress__fill--${status === 'not_yet_started' ? 'not-yet-started' : 'in-progress'}`} />
      </div>
      <span className="meta">{word}</span>
    </div>
  )
}
