import { BlockLine } from '../BlockLine/BlockLine'
import { MotionLine } from '../MotionLine/MotionLine'
import { RouteLine } from '../RouteLine/RouteLine'
import type { Player, PlayerLabel, Position } from '../../types/player'
import type { PlayerActionChains, PlayerActionType } from '../../types/playerAction'
import { resolveEndpointMarker } from '../../utils/endpointMarker'
import type { RouteEditSelection } from '../../utils/routeEdit'
import {
  getActionEndpoint,
  getActionStartPosition,
  getSortedChain,
  NEW_ACTION_ID,
} from '../../utils/playerActionChains'

type PlayerActionChainLinesProps = {
  players: Player[]
  playerActions: PlayerActionChains
  routesEditable: boolean
  motionsEditable: boolean
  blocksEditable: boolean
  routeEditSelection: RouteEditSelection | null
  motionEditSelection: RouteEditSelection | null
  blockEditSelection: RouteEditSelection | null
  onRouteSegmentSelect: (playerId: PlayerLabel, actionId: string, segmentIndex: number) => void
  onRouteVertexSelect: (playerId: PlayerLabel, actionId: string, vertexIndex: number) => void
  onMotionSegmentSelect: (playerId: PlayerLabel, actionId: string, segmentIndex: number) => void
  onMotionVertexSelect: (playerId: PlayerLabel, actionId: string, vertexIndex: number) => void
  onBlockSegmentSelect: (playerId: PlayerLabel, actionId: string, segmentIndex: number) => void
  onBlockVertexSelect: (playerId: PlayerLabel, actionId: string, vertexIndex: number) => void
  onActionEndpointPointerDown: (
    playerId: PlayerLabel,
    actionId: string,
    actionType: PlayerActionType,
    event: React.MouseEvent,
  ) => void
  onActionContextMenu?: (
    playerId: PlayerLabel,
    actionId: string,
    event: React.MouseEvent,
  ) => void
}

export function PlayerActionChainLines({
  players,
  playerActions,
  routesEditable,
  motionsEditable,
  blocksEditable,
  routeEditSelection,
  motionEditSelection,
  blockEditSelection,
  onRouteSegmentSelect,
  onRouteVertexSelect,
  onMotionSegmentSelect,
  onMotionVertexSelect,
  onBlockSegmentSelect,
  onBlockVertexSelect,
  onActionEndpointPointerDown,
  onActionContextMenu,
}: PlayerActionChainLinesProps) {
  return (
    <>
      {players.flatMap((player) => {
        const chain = getSortedChain(playerActions, player.id)

        return chain.map((action, actionIndex) => {
          const startPosition = getActionStartPosition(player.position, chain, actionIndex)
          const endpointMarker = resolveEndpointMarker(action)
          const key = `${player.id}-${action.id}`

          if (action.type === 'block') {
            return (
              <BlockLine
                key={key}
                playerPosition={startPosition}
                block={{ playerId: player.id, points: action.points }}
                endpointMarker={endpointMarker}
                readOnly={!blocksEditable}
                showIntermediateVertices={
                  blockEditSelection?.playerId === player.id &&
                  blockEditSelection.actionId === action.id
                }
                selectedSegmentIndex={
                  blockEditSelection?.playerId === player.id &&
                  blockEditSelection.actionId === action.id &&
                  blockEditSelection.kind === 'segment'
                    ? blockEditSelection.segmentIndex
                    : null
                }
                selectedVertexIndex={
                  blockEditSelection?.playerId === player.id &&
                  blockEditSelection.actionId === action.id &&
                  blockEditSelection.kind === 'vertex'
                    ? blockEditSelection.vertexIndex
                    : null
                }
                onSegmentSelect={(segmentIndex) =>
                  onBlockSegmentSelect(player.id, action.id, segmentIndex)
                }
                onVertexSelect={(vertexIndex) =>
                  onBlockVertexSelect(player.id, action.id, vertexIndex)
                }
                onEndpointPointerDown={(event) =>
                  onActionEndpointPointerDown(player.id, action.id, 'block', event)
                }
                onContextMenu={(event) => onActionContextMenu?.(player.id, action.id, event)}
              />
            )
          }

          if (action.type === 'motion') {
            return (
              <MotionLine
                key={key}
                playerPosition={startPosition}
                motion={{
                  playerId: player.id,
                  motionType: action.motionType ?? 'jog',
                  points: action.points,
                }}
                endpointMarker={endpointMarker}
                readOnly={!motionsEditable}
                showIntermediateVertices={
                  motionEditSelection?.playerId === player.id &&
                  motionEditSelection.actionId === action.id
                }
                selectedSegmentIndex={
                  motionEditSelection?.playerId === player.id &&
                  motionEditSelection.actionId === action.id &&
                  motionEditSelection.kind === 'segment'
                    ? motionEditSelection.segmentIndex
                    : null
                }
                selectedVertexIndex={
                  motionEditSelection?.playerId === player.id &&
                  motionEditSelection.actionId === action.id &&
                  motionEditSelection.kind === 'vertex'
                    ? motionEditSelection.vertexIndex
                    : null
                }
                onSegmentSelect={(segmentIndex) =>
                  onMotionSegmentSelect(player.id, action.id, segmentIndex)
                }
                onVertexSelect={(vertexIndex) =>
                  onMotionVertexSelect(player.id, action.id, vertexIndex)
                }
                onEndpointPointerDown={(event) =>
                  onActionEndpointPointerDown(player.id, action.id, 'motion', event)
                }
                onContextMenu={(event) => onActionContextMenu?.(player.id, action.id, event)}
              />
            )
          }

          return (
            <RouteLine
              key={key}
              playerPosition={startPosition}
              route={{ playerId: player.id, points: action.points }}
              endpointMarker={endpointMarker}
              readOnly={!routesEditable}
              showIntermediateVertices={
                routeEditSelection?.playerId === player.id &&
                routeEditSelection.actionId === action.id
              }
              selectedSegmentIndex={
                routeEditSelection?.playerId === player.id &&
                routeEditSelection.actionId === action.id &&
                routeEditSelection.kind === 'segment'
                  ? routeEditSelection.segmentIndex
                  : null
              }
              selectedVertexIndex={
                routeEditSelection?.playerId === player.id &&
                routeEditSelection.actionId === action.id &&
                routeEditSelection.kind === 'vertex'
                  ? routeEditSelection.vertexIndex
                  : null
              }
              onSegmentSelect={(segmentIndex) =>
                onRouteSegmentSelect(player.id, action.id, segmentIndex)
              }
              onVertexSelect={(vertexIndex) =>
                onRouteVertexSelect(player.id, action.id, vertexIndex)
              }
              onEndpointPointerDown={(event) =>
                onActionEndpointPointerDown(player.id, action.id, 'route', event)
              }
              onContextMenu={(event) => onActionContextMenu?.(player.id, action.id, event)}
            />
          )
        })
      })}
    </>
  )
}

export function getDraftStartPosition(
  playerPosition: Position,
  playerActions: PlayerActionChains,
  playerId: PlayerLabel,
  actionId: string,
): Position {
  const chain = getSortedChain(playerActions, playerId)

  if (actionId === NEW_ACTION_ID) {
    if (chain.length === 0) {
      return playerPosition
    }
    return getActionEndpoint(playerPosition, chain, chain.length - 1)
  }

  const actionIndex = chain.findIndex((action) => action.id === actionId)
  if (actionIndex < 0) {
    return playerPosition
  }

  return getActionStartPosition(playerPosition, chain, actionIndex)
}
