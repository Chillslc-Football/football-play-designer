import {
  MAX_BEAUTIFY_INTENSITY,
  MIN_BEAUTIFY_INTENSITY,
} from '../../utils/routeBeautify'
import './BeautifyRouteControl.css'

type BeautifyRouteControlProps = {
  title: string
  intensity: number
  onIntensityChange: (intensity: number) => void
  onApply: () => void
  onCancel: () => void
}

export function BeautifyRouteControl({
  title,
  intensity,
  onIntensityChange,
  onApply,
  onCancel,
}: BeautifyRouteControlProps) {
  return (
    <div className="beautify-route-control">
      <span className="beautify-route-control-title">{title}</span>
      <label className="beautify-route-control-slider-label">
        <span className="beautify-route-control-label">Intensity</span>
        <input
          type="range"
          className="beautify-route-control-slider"
          min={MIN_BEAUTIFY_INTENSITY}
          max={MAX_BEAUTIFY_INTENSITY}
          step={1}
          value={intensity}
          onChange={(event) => onIntensityChange(Number(event.target.value))}
          aria-valuemin={MIN_BEAUTIFY_INTENSITY}
          aria-valuemax={MAX_BEAUTIFY_INTENSITY}
          aria-valuenow={intensity}
          aria-valuetext={`${intensity}`}
        />
        <span className="beautify-route-control-value" aria-hidden="true">
          {intensity}
        </span>
      </label>
      <div className="beautify-route-control-actions">
        <button type="button" className="btn btn-primary" onClick={onApply}>
          Apply
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
