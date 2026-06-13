import type { EndpointMarker } from '../../types/playerAction'
import './EndpointMarkerSelector.css'

type EndpointMarkerSelectorProps = {
  value: EndpointMarker
  canEdit: boolean
  onChange: (marker: EndpointMarker) => void
}

const ENDPOINT_MARKER_OPTIONS: { id: EndpointMarker; label: string }[] = [
  { id: 'arrow', label: 'Route Arrow' },
  { id: 'filled-circle', label: 'Motion Circle' },
  { id: 'blocking-line', label: 'Block Marker' },
]

export function EndpointMarkerSelector({
  value,
  canEdit,
  onChange,
}: EndpointMarkerSelectorProps) {
  return (
    <div className="endpoint-marker-selector">
      <span className="endpoint-marker-selector-label">Endpoint marker</span>
      <div className="endpoint-marker-toggle" role="radiogroup" aria-label="Endpoint marker">
        {ENDPOINT_MARKER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={`endpoint-marker-toggle-btn ${
              value === option.id ? 'endpoint-marker-toggle-btn-active' : ''
            }`}
            onClick={() => onChange(option.id)}
            disabled={!canEdit}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
