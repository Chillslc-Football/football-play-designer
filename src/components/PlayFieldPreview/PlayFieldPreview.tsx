import { useId, useMemo, type ReactNode } from 'react'
import {
  ENDZONE_DEPTH_YARDS,
  FIELD_LENGTH,
  FIELD_PADDING_LEFT,
  FIELD_PLAY_AREA_Y,
  FIELD_WIDTH,
  LOS_VIEW_Y,
  PLAYBOOK_LABEL_OFFSET,
  PLAYBOOK_SYMBOL_SIZE,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from '../../constants/field'
import { FIELD_DISPLAY_THEME } from '../../constants/fieldDisplayTheme'
import type { Defender } from '../../types/defender'
import type { DefenderRoute } from '../../types/defenderRoute'
import type { MotionType } from '../../types/motion'
import type { Player, Position } from '../../types/player'
import type { Play } from '../../types/play'
import type { PlayerActionChains } from '../../types/playerAction'
import {
  getBlockEndBar,
  lastSegmentUsesArrowMarker,
  resolveEndpointMarker,
} from '../../utils/endpointMarker'
import {
  getFieldViewBounds,
  getHashMarks,
  getOpponentEndzoneRenderBounds,
  getOpponentGoalLineViewY,
  getOwnEndzoneRenderBounds,
  getOwnGoalLineViewY,
  getYardLines,
} from '../../utils/fieldView'
import {
  ensurePlayPlayerActions,
  getActionStartPosition,
  getSortedChain,
} from '../../utils/playerActionChains'
import { getRouteVertices } from '../../utils/routeEdit'
import './PlayFieldPreview.css'

type PlayFieldPreviewProps = {
  play: Play
}

function motionStroke(motionType: MotionType): string {
  return motionType === 'sprint' ? '#22c55e' : '#ffd700'
}

function renderPathSegments(
  vertices: Position[],
  options: {
    stroke: string
    strokeWidth?: number
    dashArray?: string
    arrowMarkerId?: string
    endpointMarker: ReturnType<typeof resolveEndpointMarker>
    variant: 'route' | 'motion' | 'block'
    motionType?: MotionType
  },
) {
  if (vertices.length < 2) return null

  const segmentCount = vertices.length - 1
  const elements: ReactNode[] = []

  for (let index = 0; index < segmentCount; index += 1) {
    const start = vertices[index]
    const end = vertices[index + 1]
    const isLast = index === segmentCount - 1

    elements.push(
      <line
        key={`segment-${index}`}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={options.stroke}
        strokeWidth={options.strokeWidth ?? 0.21}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={options.dashArray}
        markerEnd={
          isLast && options.arrowMarkerId && lastSegmentUsesArrowMarker(options.endpointMarker)
            ? `url(#${options.arrowMarkerId})`
            : undefined
        }
      />,
    )
  }

  if (options.endpointMarker === 'filled-circle') {
    const endpoint = vertices[vertices.length - 1]
    elements.push(
      <circle
        key="endpoint-circle"
        cx={endpoint.x}
        cy={endpoint.y}
        r={0.35}
        fill={options.variant === 'motion' ? motionStroke(options.motionType ?? 'jog') : options.stroke}
      />,
    )
  }

  if (options.endpointMarker === 'blocking-line') {
    const endBar = getBlockEndBar(vertices)
    if (endBar) {
      elements.push(
        <line
          key="endpoint-bar"
          x1={endBar.x1}
          y1={endBar.y1}
          x2={endBar.x2}
          y2={endBar.y2}
          stroke="#c45c00"
          strokeWidth={0.21}
          strokeLinecap="round"
        />,
      )
    }
  }

  return <g className="play-field-preview-path">{elements}</g>
}

function renderOffenseActions(players: Player[], playerActions: PlayerActionChains, arrowMarkerId: string) {
  return players.flatMap((player) => {
    const chain = getSortedChain(playerActions, player.id)

    return chain.flatMap((action, actionIndex) => {
      if (action.points.length === 0) return []

      const startPosition = getActionStartPosition(player.position, chain, actionIndex)
      const vertices = getRouteVertices(startPosition, {
        playerId: player.id,
        points: action.points,
      })
      const endpointMarker = resolveEndpointMarker(action)

      if (action.type === 'block') {
        return [
          renderPathSegments(vertices, {
            stroke: '#c45c00',
            endpointMarker,
            variant: 'block',
          }),
        ]
      }

      if (action.type === 'motion') {
        const motionType = action.motionType ?? 'jog'
        return [
          renderPathSegments(vertices, {
            stroke: motionStroke(motionType),
            strokeWidth: 0.18,
            dashArray: '0.5 0.45',
            endpointMarker,
            variant: 'motion',
            motionType,
          }),
        ]
      }

      return [
        renderPathSegments(vertices, {
          stroke: 'var(--field-route-stroke, #111)',
          arrowMarkerId,
          endpointMarker,
          variant: 'route',
        }),
      ]
    })
  })
}

function renderDefenderRoutes(
  defenders: Defender[],
  defenderRoutes: DefenderRoute[],
  arrowMarkerId: string,
) {
  return defenderRoutes.flatMap((route) => {
    if (route.points.length === 0) return []

    const defender = defenders.find((entry) => entry.id === route.defenderId)
    if (!defender) return []

    const vertices = getRouteVertices(defender.position, {
      playerId: route.defenderId as Player['id'],
      points: route.points,
    })

    return [
      renderPathSegments(vertices, {
        stroke: 'var(--field-route-stroke, #111)',
        arrowMarkerId,
        endpointMarker: 'arrow',
        variant: 'route',
      }),
    ]
  })
}

function renderPlayerMarker(player: Player) {
  const { x, y } = player.position

  return (
    <g key={player.id} className="player-marker player-marker-locked" transform={`translate(${x}, ${y})`}>
      <text className="player-symbol" fontSize={PLAYBOOK_SYMBOL_SIZE}>
        O
      </text>
      {player.label ? (
        <text className="player-label" y={PLAYBOOK_LABEL_OFFSET}>
          {player.label}
        </text>
      ) : null}
    </g>
  )
}

function renderDefenderMarker(defender: Defender) {
  const { x, y } = defender.position

  return (
    <g
      key={defender.id}
      className="defender-marker defender-marker-locked"
      transform={`translate(${x}, ${y})`}
    >
      <text className="defender-symbol" fontSize={PLAYBOOK_SYMBOL_SIZE}>
        X
      </text>
      {defender.label ? (
        <text className="defender-label" y={PLAYBOOK_LABEL_OFFSET}>
          {defender.label}
        </text>
      ) : null}
    </g>
  )
}

export function PlayFieldPreview({ play }: PlayFieldPreviewProps) {
  const previewId = useId().replace(/:/g, '')
  const arrowMarkerId = `${previewId}-route-arrow`

  const previewPlay = useMemo(() => ensurePlayPlayerActions(play), [play])

  const viewBounds = useMemo(
    () => getFieldViewBounds(previewPlay.driveStartYardLine),
    [previewPlay.driveStartYardLine],
  )

  const yardLines = useMemo(() => getYardLines(viewBounds), [viewBounds])
  const hashMarks = useMemo(() => getHashMarks(), [])
  const opponentEndzoneBounds = useMemo(
    () => getOpponentEndzoneRenderBounds(viewBounds),
    [viewBounds],
  )
  const ownEndzoneBounds = useMemo(() => getOwnEndzoneRenderBounds(viewBounds), [viewBounds])
  const opponentGoalLineViewY = useMemo(
    () => getOpponentGoalLineViewY(viewBounds),
    [viewBounds],
  )
  const ownGoalLineViewY = useMemo(() => getOwnGoalLineViewY(viewBounds), [viewBounds])

  const turfStripes = useMemo(() => {
    const stripes: { y: number; light: boolean }[] = []
    for (let y = 0; y < FIELD_LENGTH; y += 5) {
      stripes.push({ y, light: Math.floor(y / 5) % 2 === 0 })
    }
    return stripes
  }, [])

  return (
    <div className={`play-field-preview field-container field-display-${FIELD_DISPLAY_THEME}`}>
      <svg
        className="play-field-preview-svg"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <marker
            id={arrowMarkerId}
            markerWidth="0.76"
            markerHeight="0.76"
            refX="0.65"
            refY="0.38"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon
              points="0 0, 0.76 0.38, 0 0.76"
              className="route-arrow-head-filled"
            />
          </marker>
        </defs>

        <rect x={0} y={0} width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} className="field-viewbox-bg" />

        <g className="field-play-area" transform={`translate(${FIELD_PADDING_LEFT}, ${FIELD_PLAY_AREA_Y})`}>
          <g className="field-turf-surface">
            <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_LENGTH} className="field-turf" />
            {turfStripes.map((stripe) => (
              <rect
                key={`stripe-${stripe.y}`}
                x={0}
                y={stripe.y}
                width={FIELD_WIDTH}
                height={5}
                className={stripe.light ? 'turf-stripe turf-stripe-light' : 'turf-stripe turf-stripe-dark'}
              />
            ))}
          </g>

          {opponentEndzoneBounds && (
            <rect
              x={0}
              y={opponentEndzoneBounds.topY}
              width={FIELD_WIDTH}
              height={opponentEndzoneBounds.bottomY - opponentEndzoneBounds.topY}
              className="field-endzone field-endzone-opponent"
            />
          )}

          {ownEndzoneBounds && (
            <rect
              x={0}
              y={ownEndzoneBounds.topY}
              width={FIELD_WIDTH}
              height={ownEndzoneBounds.bottomY - ownEndzoneBounds.topY}
              className="field-endzone field-endzone-own"
            />
          )}

          <rect x={0} y={0} width={FIELD_WIDTH} height={FIELD_LENGTH} className="field-boundary" />

          {yardLines.map((line) => (
            <line
              key={line.viewY}
              x1={0}
              y1={line.viewY}
              x2={FIELD_WIDTH}
              y2={line.viewY}
              className={line.isMajor ? 'yard-line yard-line-major' : 'yard-line yard-line-minor'}
            />
          ))}

          {opponentEndzoneBounds && opponentGoalLineViewY < FIELD_LENGTH && (
            <line
              x1={0}
              y1={opponentGoalLineViewY}
              x2={FIELD_WIDTH}
              y2={opponentGoalLineViewY}
              className="goal-line"
            />
          )}

          {ownEndzoneBounds &&
            ownGoalLineViewY > 0 &&
            ownGoalLineViewY < FIELD_LENGTH + ENDZONE_DEPTH_YARDS && (
              <line
                x1={0}
                y1={ownGoalLineViewY}
                x2={FIELD_WIDTH}
                y2={ownGoalLineViewY}
                className="goal-line"
              />
            )}

          {hashMarks.map((mark) => (
            <line
              key={`hash-${mark.viewY}-${mark.x}`}
              x1={mark.x}
              y1={mark.viewY - 0.4}
              x2={mark.x}
              y2={mark.viewY + 0.4}
              className="hash-mark"
            />
          ))}

          <line
            x1={0}
            y1={viewBounds.losViewY}
            x2={FIELD_WIDTH}
            y2={viewBounds.losViewY}
            className="los-line"
          />

          {previewPlay.playType === 'offensive' && (
            <rect
              x={0}
              y={0}
              width={FIELD_WIDTH}
              height={LOS_VIEW_Y}
              className="field-side-locked field-side-defense"
            />
          )}

          {previewPlay.playType === 'defensive' && (
            <rect
              x={0}
              y={LOS_VIEW_Y}
              width={FIELD_WIDTH}
              height={FIELD_LENGTH - LOS_VIEW_Y}
              className="field-side-locked field-side-offense"
            />
          )}

          {renderOffenseActions(
            previewPlay.players,
            previewPlay.playerActions ?? {},
            arrowMarkerId,
          )}

          {renderDefenderRoutes(
            previewPlay.defenders,
            previewPlay.defenderRoutes,
            arrowMarkerId,
          )}

          {previewPlay.defenders.map(renderDefenderMarker)}
          {previewPlay.players.map(renderPlayerMarker)}
        </g>
      </svg>
    </div>
  )
}
