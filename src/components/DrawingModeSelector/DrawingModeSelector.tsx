import type { MotionType } from '../../types/motion'
import type { PlayType } from '../../types/playType'
import './DrawingModeSelector.css'

export type DrawingMode = 'position' | 'route' | 'block' | 'motion'

type DrawingModeSelectorProps = {
  mode: DrawingMode
  playType?: PlayType
  canEdit?: boolean
  motionType?: MotionType
  onMotionTypeChange?: (motionType: MotionType) => void
  onChange: (mode: DrawingMode) => void
}

type ModeOption = {
  id: DrawingMode
  label: string
  className?: string
  offensiveOnly?: boolean
}

export function DrawingModeSelector({
  mode,
  playType = 'offensive',
  canEdit = true,
  motionType = 'jog',
  onMotionTypeChange,
  onChange,
}: DrawingModeSelectorProps) {
  const routeLabel = playType === 'defensive' ? 'Movement' : 'Route'

  const modeOptions: ModeOption[] = [
    { id: 'position', label: 'Position' },
    { id: 'route', label: routeLabel },
    { id: 'block', label: 'Blocking', className: 'drawing-mode-toggle-btn-block', offensiveOnly: true },
    { id: 'motion', label: 'Motion', className: 'drawing-mode-toggle-btn-motion', offensiveOnly: true },
  ]

  const visibleModes = modeOptions.filter(
    (option) => playType === 'offensive' || !option.offensiveOnly,
  )

  return (
    <div className="drawing-mode-selector">
      <div
        className={`drawing-mode-toggle ${
          visibleModes.length > 3
            ? 'drawing-mode-toggle-four'
            : visibleModes.length > 2
              ? 'drawing-mode-toggle-three'
              : ''
        }`}
        role="radiogroup"
        aria-label="Drawing mode"
      >
        {visibleModes.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={mode === option.id}
            className={`drawing-mode-toggle-btn ${option.className ?? ''} ${
              mode === option.id ? 'drawing-mode-toggle-btn-active' : ''
            }`}
            onClick={() => onChange(option.id)}
            disabled={!canEdit}
          >
            {option.label}
          </button>
        ))}
      </div>
      {playType === 'offensive' && mode === 'motion' && (
        <div
          className="motion-type-toggle"
          role="radiogroup"
          aria-label="Motion type"
        >
          <button
            type="button"
            role="radio"
            aria-checked={motionType === 'jog'}
            className={`motion-type-toggle-btn motion-type-toggle-btn-jog ${
              motionType === 'jog' ? 'motion-type-toggle-btn-active' : ''
            }`}
            onClick={() => onMotionTypeChange?.('jog')}
            disabled={!canEdit}
          >
            Jog
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={motionType === 'sprint'}
            className={`motion-type-toggle-btn motion-type-toggle-btn-sprint ${
              motionType === 'sprint' ? 'motion-type-toggle-btn-active' : ''
            }`}
            onClick={() => onMotionTypeChange?.('sprint')}
            disabled={!canEdit}
          >
            Sprint
          </button>
        </div>
      )}
    </div>
  )
}
