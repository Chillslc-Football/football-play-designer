import type { MotionType } from '../../types/motion'
import type { Position } from '../../types/player'
import type { EndpointMarker } from '../../types/playerAction'
import { getBlockEndBar } from '../../utils/endpointMarker'
import './ActionEndpointMarker.css'

type ActionLineVariant = 'route' | 'motion' | 'block'

type ActionEndpointMarkerProps = {
  vertices: Position[]
  endpointMarker: EndpointMarker
  variant: ActionLineVariant
  motionType?: MotionType
}

function circleClassName(variant: ActionLineVariant, motionType: MotionType): string {
  if (variant === 'route') return 'route-endpoint-marker'
  if (variant === 'block') return 'block-endpoint-marker'
  return `motion-endpoint-marker motion-endpoint-marker-${motionType}`
}

export function ActionEndpointMarker({
  vertices,
  endpointMarker,
  variant,
  motionType = 'jog',
}: ActionEndpointMarkerProps) {
  if (vertices.length < 2 || endpointMarker === 'arrow') return null

  if (endpointMarker === 'filled-circle') {
    const endpoint = vertices[vertices.length - 1]
    return (
      <circle
        cx={endpoint.x}
        cy={endpoint.y}
        r={0.35}
        className={circleClassName(variant, motionType)}
      />
    )
  }

  const endBar = getBlockEndBar(vertices)
  if (!endBar) return null

  return (
    <line
      x1={endBar.x1}
      y1={endBar.y1}
      x2={endBar.x2}
      y2={endBar.y2}
      className="block-end-bar"
    />
  )
}
