import {
  formatFieldZoomPercent,
  stepFieldZoom,
  type FieldZoomValue,
} from '../../utils/fieldZoom'
import './FieldZoomControl.css'

type FieldZoomControlProps = {
  value: FieldZoomValue
  onChange: (zoom: FieldZoomValue) => void
}

export function FieldZoomControl({ value, onChange }: FieldZoomControlProps) {
  const zoomOut = stepFieldZoom(value, -1)
  const zoomIn = stepFieldZoom(value, 1)

  return (
    <div className="field-zoom-control" role="group" aria-label="Field zoom">
      <button
        type="button"
        className="field-zoom-control-btn"
        onClick={() => zoomOut && onChange(zoomOut)}
        disabled={zoomOut === null}
        aria-label="Zoom out"
      >
        −
      </button>
      <span className="field-zoom-control-value" aria-live="polite">
        {formatFieldZoomPercent(value)}
      </span>
      <button
        type="button"
        className="field-zoom-control-btn"
        onClick={() => zoomIn && onChange(zoomIn)}
        disabled={zoomIn === null}
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  )
}
