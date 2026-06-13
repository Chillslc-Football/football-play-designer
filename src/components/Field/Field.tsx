import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ENDZONE_DEPTH_YARDS,
  FIELD_LENGTH,
  FIELD_PADDING_LEFT,
  FIELD_PLAY_AREA_Y,
  FIELD_WIDTH,
  PLAYBOOK_HIT_SIZE,
  PLAYBOOK_LABEL_OFFSET,
  PLAYBOOK_SYMBOL_SIZE,
  PLAYER_SELECTION_RADIUS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  YARD_NUMBER_SIDELINE_INSET,
} from '../../constants/field'
import { LOS_VIEW_Y } from '../../constants/field'
import type { MotionType } from '../../types/motion'
import type { Defender, DefenderLabel } from '../../types/defender'
import type { DefenderRoute } from '../../types/defenderRoute'
import type { DriveStartYardLine } from '../../types/driveStart'
import type { Player, PlayerLabel, Position } from '../../types/player'
import { clampPosition } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import { playerHasNotes } from '../../types/playerNotes'
import type {
  EndpointMarker,
  PlayerAction,
  PlayerActionChains,
  PlayerActionType,
} from '../../types/playerAction'
import type { PlayType } from '../../types/playType'
import {
  canDeleteDefenderRouteSegmentSelection,
  deleteDefenderRouteSegment,
  deleteEntireDefenderRoute,
  extendDefenderRouteFromAnchor,
  getDefenderAnchorVertexIndex,
  getDeletableDefenderRouteSegmentIndex,
  type DefenderRouteEditSelection,
} from '../../utils/defenderRouteEdit'
import { canDeleteBlockSegmentSelection, type BlockEditSelection } from '../../utils/blockEdit'
import {
  getFieldViewBounds,
  getHashMarks,
  getMajorYardLabels,
  getOpponentEndzoneRenderBounds,
  getOpponentGoalLineViewY,
  getOwnEndzoneRenderBounds,
  getOwnGoalLineViewY,
  getYardLines,
} from '../../utils/fieldView'
import { appendPathPoint } from '../../utils/pathUtils'
import { resolveEndpointMarker } from '../../utils/endpointMarker'
import {
  createPlayerAction,
  findActionInChain,
  getActionStartPosition,
  getSortedChain,
  NEW_ACTION_ID,
} from '../../utils/playerActionChains'
import {
  canDeleteRouteSegmentSelection,
  deleteRouteSegment,
  extendRouteFromAnchor,
  getAnchorVertexIndex,
  getDeletableRouteSegmentIndex,
  type RouteEditSelection,
  reshapeActionPointsFromEndpointDrag,
} from '../../utils/routeEdit'
import { EndpointMarkerSelector } from '../EndpointMarkerSelector/EndpointMarkerSelector'
import { FieldAlignmentGrid } from '../FieldAlignmentGrid/FieldAlignmentGrid'
import { BlockLine } from '../BlockLine/BlockLine'
import { MotionLine } from '../MotionLine/MotionLine'
import {
  getDraftStartPosition,
  PlayerActionChainLines,
} from '../PlayerActionChainLines/PlayerActionChainLines'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import type { DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import { PlayerMarker } from '../PlayerMarker/PlayerMarker'
import { PlayerAlignmentGuides } from '../PlayerAlignmentGuides/PlayerAlignmentGuides'
import { RouteLine } from '../RouteLine/RouteLine'
import { findNearestByPosition } from '../../utils/playerSelection'
import { getPlayerAlignmentGuides } from '../../utils/playerAlignmentGuides'
import { FIELD_DISPLAY_THEME } from '../../constants/fieldDisplayTheme'
import './Field.css'

const DRAG_THRESHOLD = 5
const CLICK_MIN_DISTANCE = 0.25

type DragTarget =
  | { kind: 'offense'; id: PlayerLabel }
  | { kind: 'defense'; id: DefenderLabel }

type FieldProps = {
  playType: PlayType
  viewOnly?: boolean
  /** When true, only player/defender positions can be edited (no routes/motions/blocks). */
  schemePositionsOnly?: boolean
  /** Visual alignment grid overlay — does not affect coordinates or interaction. */
  showAlignmentGrid?: boolean
  players: Player[]
  defenders: Defender[]
  defenderRoutes: DefenderRoute[]
  playerActions: PlayerActionChains
  playerNotes: PlayerNotes
  drawingMode: DrawingMode
  motionType: MotionType
  driveStartYardLine: DriveStartYardLine
  selectedPlayerId: PlayerLabel | null
  selectedDefenderId: DefenderLabel | null
  onSelectPlayer: (playerId: PlayerLabel) => void
  onSelectDefender: (defenderId: DefenderLabel) => void
  onPlayerMove: (playerId: PlayerLabel, position: Position) => void
  onDefenderMove: (defenderId: DefenderLabel, position: Position) => void
  onPlayerActionComplete: (playerId: PlayerLabel, action: PlayerAction) => void
  onDefenderRouteComplete: (route: DefenderRoute) => void
  /** Portal target for route/action edit controls in the bottom workspace toolbar. */
  toolbarPortalTarget?: HTMLElement | null
}

type RouteDragState = {
  playerId: PlayerLabel
  actionId: string
  anchorVertexIndex: number
  dragPoints: Position[]
  screenX: number
  screenY: number
  startedDrag: boolean
}

type FreehandDraft = {
  playerId: PlayerLabel
  actionId: string
  anchorVertexIndex: number
  points: Position[]
}

type DefenderRouteDragState = {
  defenderId: DefenderLabel
  anchorVertexIndex: number
  dragPoints: Position[]
  screenX: number
  screenY: number
  startedDrag: boolean
}

type DefenderFreehandDraft = {
  defenderId: DefenderLabel
  anchorVertexIndex: number
  points: Position[]
}

type EndpointDragState = {
  playerId: PlayerLabel
  actionId: string
  actionType: PlayerActionType
}

export function Field({
  playType,
  viewOnly = false,
  schemePositionsOnly = false,
  showAlignmentGrid = false,
  players,
  defenders,
  defenderRoutes,
  playerActions,
  playerNotes,
  drawingMode,
  motionType,
  driveStartYardLine,
  selectedPlayerId,
  selectedDefenderId,
  onSelectPlayer,
  onSelectDefender,
  onPlayerMove,
  onDefenderMove,
  onPlayerActionComplete,
  onDefenderRouteComplete,
  toolbarPortalTarget = null,
}: FieldProps) {
  const offenseEditable = !viewOnly && playType === 'offensive'
  const defenseEditable = !viewOnly && playType === 'defensive'
  const routesEditable = offenseEditable && !schemePositionsOnly
  const motionsEditable = offenseEditable && !schemePositionsOnly
  const blocksEditable = offenseEditable && !schemePositionsOnly
  const defenderRoutesEditable = defenseEditable && !schemePositionsOnly

  const orderedPlayers = useMemo(() => {
    if (!selectedPlayerId) return players
    return [
      ...players.filter((player) => player.id !== selectedPlayerId),
      ...players.filter((player) => player.id === selectedPlayerId),
    ]
  }, [players, selectedPlayerId])

  const orderedDefenders = useMemo(() => {
    if (!selectedDefenderId) return defenders
    return [
      ...defenders.filter((defender) => defender.id !== selectedDefenderId),
      ...defenders.filter((defender) => defender.id === selectedDefenderId),
    ]
  }, [defenders, selectedDefenderId])
  const [draggingOffensePlayerId, setDraggingOffensePlayerId] = useState<PlayerLabel | null>(null)
  const [pointerOffensePlayerId, setPointerOffensePlayerId] = useState<PlayerLabel | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingTargetRef = useRef<DragTarget | null>(null)
  const drawingModeRef = useRef<DrawingMode>(drawingMode)
  const pointerStartRef = useRef<(DragTarget & { x: number; y: number }) | null>(null)
  const routeDragRef = useRef<RouteDragState | null>(null)
  const routeEditSelectionRef = useRef<RouteEditSelection | null>(null)
  const motionDragRef = useRef<RouteDragState | null>(null)
  const motionEditSelectionRef = useRef<RouteEditSelection | null>(null)
  const motionTypeRef = useRef<MotionType>(motionType)
  const blockDragRef = useRef<RouteDragState | null>(null)
  const blockEditSelectionRef = useRef<BlockEditSelection | null>(null)
  const defenderRouteDragRef = useRef<DefenderRouteDragState | null>(null)
  const defenderRouteEditSelectionRef = useRef<DefenderRouteEditSelection | null>(null)
  const endpointDragRef = useRef<EndpointDragState | null>(null)

  const activeOffensePlayerId =
    draggingOffensePlayerId ?? pointerOffensePlayerId ?? selectedPlayerId

  const playerAlignmentGuides = useMemo(() => {
    if (!activeOffensePlayerId || !offenseEditable) return []
    return getPlayerAlignmentGuides(activeOffensePlayerId, players)
  }, [activeOffensePlayerId, offenseEditable, players])

  const [freehandDraft, setFreehandDraft] = useState<FreehandDraft | null>(null)
  const [blockFreehandDraft, setBlockFreehandDraft] = useState<FreehandDraft | null>(null)
  const [blockEditSelection, setBlockEditSelection] = useState<BlockEditSelection | null>(null)
  const [routeEditSelection, setRouteEditSelection] = useState<RouteEditSelection | null>(null)
  const [motionFreehandDraft, setMotionFreehandDraft] = useState<FreehandDraft | null>(null)
  const [motionEditSelection, setMotionEditSelection] = useState<RouteEditSelection | null>(null)
  const [defenderFreehandDraft, setDefenderFreehandDraft] = useState<DefenderFreehandDraft | null>(
    null,
  )
  const [defenderRouteEditSelection, setDefenderRouteEditSelection] =
    useState<DefenderRouteEditSelection | null>(null)
  const [deleteEntireMotionOpen, setDeleteEntireMotionOpen] = useState(false)
  const [deleteEntireBlockOpen, setDeleteEntireBlockOpen] = useState(false)
  const [deleteEntireDefenderRouteOpen, setDeleteEntireDefenderRouteOpen] = useState(false)

  routeEditSelectionRef.current = routeEditSelection
  motionEditSelectionRef.current = motionEditSelection
  blockEditSelectionRef.current = blockEditSelection
  defenderRouteEditSelectionRef.current = defenderRouteEditSelection
  motionTypeRef.current = motionType

  drawingModeRef.current = drawingMode

  const viewBounds = useMemo(
    () => getFieldViewBounds(driveStartYardLine),
    [driveStartYardLine],
  )
  const yardLines = useMemo(() => getYardLines(viewBounds), [viewBounds])
  const hashMarks = useMemo(() => getHashMarks(), [])
  const yardLabels = useMemo(
    () => getMajorYardLabels(viewBounds),
    [viewBounds],
  )
  const opponentEndzoneBounds = useMemo(
    () => getOpponentEndzoneRenderBounds(viewBounds),
    [viewBounds],
  )
  const ownEndzoneBounds = useMemo(
    () => getOwnEndzoneRenderBounds(viewBounds),
    [viewBounds],
  )
  const opponentGoalLineViewY = useMemo(
    () => getOpponentGoalLineViewY(viewBounds),
    [viewBounds],
  )
  const ownGoalLineViewY = useMemo(
    () => getOwnGoalLineViewY(viewBounds),
    [viewBounds],
  )

  const turfStripes = useMemo(() => {
    const stripes: { y: number; light: boolean }[] = []
    for (let y = 0; y < FIELD_LENGTH; y += 5) {
      stripes.push({ y, light: Math.floor(y / 5) % 2 === 0 })
    }
    return stripes
  }, [])

  function yardArrowPoints(
    viewY: number,
    x: number,
    absoluteYard: number,
  ): string | null {
    if (absoluteYard === 50) return null
    if (absoluteYard < 50) {
      return `${x},${viewY - 0.55} ${x - 0.22},${viewY - 0.95} ${x + 0.22},${viewY - 0.95}`
    }
    return `${x},${viewY + 0.55} ${x - 0.22},${viewY + 0.95} ${x + 0.22},${viewY + 0.95}`
  }

  function getSvgPosition(clientX: number, clientY: number): Position {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }

    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const svgPoint = point.matrixTransform(svg.getScreenCTM()!.inverse())

    return clampPosition({
      x: svgPoint.x - FIELD_PADDING_LEFT,
      y: svgPoint.y - FIELD_PLAY_AREA_Y,
    })
  }

  function getPlayerPosition(playerId: PlayerLabel): Position {
    const player = players.find((p) => p.id === playerId)
    return player?.position ?? { x: 0, y: 0 }
  }

  function getDefenderPosition(defenderId: DefenderLabel): Position {
    const defender = defenders.find((entry) => entry.id === defenderId)
    return defender?.position ?? { x: 0, y: 0 }
  }

  const clearRouteDrag = useCallback(() => {
    routeDragRef.current = null
    setFreehandDraft(null)
  }, [])

  const clearDefenderRouteDrag = useCallback(() => {
    defenderRouteDragRef.current = null
    setDefenderFreehandDraft(null)
  }, [])

  const clearRouteEditSelection = useCallback(() => {
    setRouteEditSelection(null)
  }, [])

  const clearMotionDrag = useCallback(() => {
    motionDragRef.current = null
    setMotionFreehandDraft(null)
  }, [])

  const clearMotionEditSelection = useCallback(() => {
    setMotionEditSelection(null)
  }, [])

  const clearBlockDrag = useCallback(() => {
    blockDragRef.current = null
    setBlockFreehandDraft(null)
  }, [])

  const clearBlockEditSelection = useCallback(() => {
    setBlockEditSelection(null)
  }, [])

  const clearDefenderRouteEditSelection = useCallback(() => {
    setDefenderRouteEditSelection(null)
  }, [])

  const clearEndpointDrag = useCallback(() => {
    endpointDragRef.current = null
  }, [])

  const getSelectedAction = useCallback(
    (
      playerId: PlayerLabel,
      actionId: string | undefined,
      type: PlayerActionType,
    ): PlayerAction | null => {
      if (actionId) {
        return findActionInChain(playerActions, playerId, actionId)
      }

      return (
        getSortedChain(playerActions, playerId).find(
          (entry) => entry.type === type && entry.points.length > 0,
        ) ?? null
      )
    },
    [playerActions],
  )

  const resolveDrawAnchor = useCallback((): {
    playerId: PlayerLabel
    actionId: string
    anchorVertexIndex: number
  } | null => {
    if (!routesEditable || drawingModeRef.current !== 'route') return null

    if (routeEditSelectionRef.current) {
      return {
        playerId: routeEditSelectionRef.current.playerId,
        actionId: routeEditSelectionRef.current.actionId,
        anchorVertexIndex: getAnchorVertexIndex(routeEditSelectionRef.current),
      }
    }

    if (!selectedPlayerId) return null

    return { playerId: selectedPlayerId, actionId: NEW_ACTION_ID, anchorVertexIndex: 0 }
  }, [selectedPlayerId, routesEditable])

  const resolveBlockDrawAnchor = useCallback((): {
    playerId: PlayerLabel
    actionId: string
    anchorVertexIndex: number
  } | null => {
    if (!blocksEditable || drawingModeRef.current !== 'block') return null

    if (blockEditSelectionRef.current) {
      return {
        playerId: blockEditSelectionRef.current.playerId,
        actionId: blockEditSelectionRef.current.actionId,
        anchorVertexIndex: getAnchorVertexIndex(blockEditSelectionRef.current),
      }
    }

    if (!selectedPlayerId) return null

    return { playerId: selectedPlayerId, actionId: NEW_ACTION_ID, anchorVertexIndex: 0 }
  }, [selectedPlayerId, blocksEditable])

  const resolveMotionDrawAnchor = useCallback((): {
    playerId: PlayerLabel
    actionId: string
    anchorVertexIndex: number
  } | null => {
    if (!motionsEditable || drawingModeRef.current !== 'motion') return null

    if (motionEditSelectionRef.current) {
      return {
        playerId: motionEditSelectionRef.current.playerId,
        actionId: motionEditSelectionRef.current.actionId,
        anchorVertexIndex: getAnchorVertexIndex(motionEditSelectionRef.current),
      }
    }

    if (!selectedPlayerId) return null

    return { playerId: selectedPlayerId, actionId: NEW_ACTION_ID, anchorVertexIndex: 0 }
  }, [selectedPlayerId, motionsEditable])

  const getDefenderRouteForDefender = useCallback(
    (defenderId: DefenderLabel): DefenderRoute => {
      return (
        defenderRoutes.find((entry) => entry.defenderId === defenderId) ?? {
          defenderId,
          points: [],
        }
      )
    },
    [defenderRoutes],
  )

  const resolveDefenderDrawAnchor = useCallback((): {
    defenderId: DefenderLabel
    vertexIndex: number
  } | null => {
    if (!defenderRoutesEditable || drawingModeRef.current !== 'route') return null

    if (defenderRouteEditSelectionRef.current) {
      return {
        defenderId: defenderRouteEditSelectionRef.current.defenderId,
        vertexIndex: getDefenderAnchorVertexIndex(defenderRouteEditSelectionRef.current),
      }
    }

    if (!selectedDefenderId) return null

    const existing = getDefenderRouteForDefender(selectedDefenderId)
    if (existing.points.length > 0) return null

    return { defenderId: selectedDefenderId, vertexIndex: 0 }
  }, [selectedDefenderId, getDefenderRouteForDefender, defenderRoutesEditable])

  const commitActionExtension = useCallback(
    (
      type: PlayerActionType,
      playerId: PlayerLabel,
      actionId: string,
      anchorVertexIndex: number,
      newPoints: Position[],
    ) => {
      if (newPoints.length === 0) return

      let action: PlayerAction
      if (actionId === NEW_ACTION_ID) {
        const chain = getSortedChain(playerActions, playerId)
        action = createPlayerAction(type, chain.length, motionTypeRef.current)
      } else {
        const existing = findActionInChain(playerActions, playerId, actionId)
        if (!existing) return
        action = existing
      }

      const updatedRoute = extendRouteFromAnchor(
        { playerId, points: action.points },
        anchorVertexIndex,
        newPoints,
      )
      const updatedAction: PlayerAction = {
        ...action,
        points: updatedRoute.points,
        ...(type === 'motion' ? { motionType: motionTypeRef.current } : {}),
      }

      onPlayerActionComplete(playerId, updatedAction)

      const selection: RouteEditSelection = {
        playerId,
        actionId: updatedAction.id,
        kind: 'vertex',
        vertexIndex: updatedAction.points.length,
      }

      if (type === 'route') {
        setRouteEditSelection(selection)
      } else if (type === 'motion') {
        setMotionEditSelection(selection)
      } else {
        setBlockEditSelection(selection)
      }
    },
    [playerActions, onPlayerActionComplete],
  )

  const commitRouteExtension = useCallback(
    (
      playerId: PlayerLabel,
      actionId: string,
      anchorVertexIndex: number,
      newPoints: Position[],
    ) => {
      commitActionExtension('route', playerId, actionId, anchorVertexIndex, newPoints)
    },
    [commitActionExtension],
  )

  const commitMotionExtension = useCallback(
    (
      playerId: PlayerLabel,
      actionId: string,
      anchorVertexIndex: number,
      newPoints: Position[],
    ) => {
      commitActionExtension('motion', playerId, actionId, anchorVertexIndex, newPoints)
    },
    [commitActionExtension],
  )

  const commitBlockExtension = useCallback(
    (
      playerId: PlayerLabel,
      actionId: string,
      anchorVertexIndex: number,
      newPoints: Position[],
    ) => {
      commitActionExtension('block', playerId, actionId, anchorVertexIndex, newPoints)
    },
    [commitActionExtension],
  )

  const commitDefenderRouteExtension = useCallback(
    (defenderId: DefenderLabel, anchorVertexIndex: number, newPoints: Position[]) => {
      if (newPoints.length === 0) return

      const existing = getDefenderRouteForDefender(defenderId)
      const updated = extendDefenderRouteFromAnchor(existing, anchorVertexIndex, newPoints)
      onDefenderRouteComplete(updated)

      setDefenderRouteEditSelection({
        defenderId,
        kind: 'vertex',
        vertexIndex: updated.points.length,
      })
    },
    [getDefenderRouteForDefender, onDefenderRouteComplete],
  )

  const deleteSelectedRouteSegment = useCallback(() => {
    const selected = routeEditSelectionRef.current
    if (!selected || routeDragRef.current) return

    const segmentIndex = getDeletableRouteSegmentIndex(selected)
    if (segmentIndex === null) return

    const action = findActionInChain(playerActions, selected.playerId, selected.actionId)
    if (!action) {
      clearRouteEditSelection()
      return
    }

    const updatedRoute = deleteRouteSegment(
      { playerId: selected.playerId, points: action.points },
      segmentIndex,
    )
    const updatedAction = { ...action, points: updatedRoute.points }
    onPlayerActionComplete(selected.playerId, updatedAction)

    if (updatedAction.points.length === 0) {
      clearRouteEditSelection()
      return
    }

    if (selected.kind === 'vertex') {
      const nextVertexIndex = Math.min(selected.vertexIndex, updatedAction.points.length)
      setRouteEditSelection({
        playerId: selected.playerId,
        actionId: selected.actionId,
        kind: 'vertex',
        vertexIndex: nextVertexIndex,
      })
      return
    }

    const nextSegmentIndex = Math.min(segmentIndex, updatedAction.points.length - 1)
    setRouteEditSelection({
      playerId: selected.playerId,
      actionId: selected.actionId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [playerActions, onPlayerActionComplete, clearRouteEditSelection])

  const deleteEntireSelectedRoute = useCallback(() => {
    const selected = routeEditSelectionRef.current
    if (!selected || routeDragRef.current || !routesEditable) return

    const action = findActionInChain(playerActions, selected.playerId, selected.actionId)
    if (!action) {
      clearRouteEditSelection()
      return
    }

    onPlayerActionComplete(selected.playerId, { ...action, points: [] })
    clearRouteEditSelection()
  }, [playerActions, routesEditable, onPlayerActionComplete, clearRouteEditSelection])

  const deleteSelectedMotionSegment = useCallback(() => {
    const selected = motionEditSelectionRef.current
    if (!selected || motionDragRef.current) return

    const segmentIndex = getDeletableRouteSegmentIndex(selected)
    if (segmentIndex === null) return

    const action = findActionInChain(playerActions, selected.playerId, selected.actionId)
    if (!action) {
      clearMotionEditSelection()
      return
    }

    const updatedRoute = deleteRouteSegment(
      { playerId: selected.playerId, points: action.points },
      segmentIndex,
    )
    const updatedAction = { ...action, points: updatedRoute.points }
    onPlayerActionComplete(selected.playerId, updatedAction)

    if (updatedAction.points.length === 0) {
      clearMotionEditSelection()
      return
    }

    if (selected.kind === 'vertex') {
      const nextVertexIndex = Math.min(selected.vertexIndex, updatedAction.points.length)
      setMotionEditSelection({
        playerId: selected.playerId,
        actionId: selected.actionId,
        kind: 'vertex',
        vertexIndex: nextVertexIndex,
      })
      return
    }

    const nextSegmentIndex = Math.min(segmentIndex, updatedAction.points.length - 1)
    setMotionEditSelection({
      playerId: selected.playerId,
      actionId: selected.actionId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [playerActions, onPlayerActionComplete, clearMotionEditSelection])

  const executeDeleteEntireMotion = useCallback(() => {
    const selection = motionEditSelectionRef.current
    const playerId = selection?.playerId ?? selectedPlayerId
    if (!playerId || !motionsEditable) return

    const action = getSelectedAction(playerId, selection?.actionId, 'motion')
    if (!action || action.points.length === 0) return

    onPlayerActionComplete(playerId, { ...action, points: [] })
    clearMotionEditSelection()
    setDeleteEntireMotionOpen(false)
  }, [
    selectedPlayerId,
    motionsEditable,
    getSelectedAction,
    onPlayerActionComplete,
    clearMotionEditSelection,
  ])

  const requestDeleteEntireMotion = useCallback(() => {
    const selection = motionEditSelectionRef.current
    const playerId = selection?.playerId ?? selectedPlayerId
    if (!playerId || !motionsEditable) return

    const action = getSelectedAction(playerId, selection?.actionId, 'motion')
    if (!action || action.points.length === 0) return

    setDeleteEntireMotionOpen(true)
  }, [selectedPlayerId, motionsEditable, getSelectedAction])

  const deleteSelectedBlockSegment = useCallback(() => {
    const selected = blockEditSelectionRef.current
    if (!selected || blockDragRef.current) return

    const segmentIndex = getDeletableRouteSegmentIndex(selected)
    if (segmentIndex === null) return

    const action = findActionInChain(playerActions, selected.playerId, selected.actionId)
    if (!action) {
      clearBlockEditSelection()
      return
    }

    const updatedRoute = deleteRouteSegment(
      { playerId: selected.playerId, points: action.points },
      segmentIndex,
    )
    const updatedAction = { ...action, points: updatedRoute.points }
    onPlayerActionComplete(selected.playerId, updatedAction)

    if (updatedAction.points.length === 0) {
      clearBlockEditSelection()
      return
    }

    if (selected.kind === 'vertex') {
      const nextVertexIndex = Math.min(selected.vertexIndex, updatedAction.points.length)
      setBlockEditSelection({
        playerId: selected.playerId,
        actionId: selected.actionId,
        kind: 'vertex',
        vertexIndex: nextVertexIndex,
      })
      return
    }

    const nextSegmentIndex = Math.min(segmentIndex, updatedAction.points.length - 1)
    setBlockEditSelection({
      playerId: selected.playerId,
      actionId: selected.actionId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [playerActions, onPlayerActionComplete, clearBlockEditSelection])

  const executeDeleteEntireBlock = useCallback(() => {
    const selection = blockEditSelectionRef.current
    const playerId = selection?.playerId ?? selectedPlayerId
    if (!playerId || !blocksEditable) return

    const action = getSelectedAction(playerId, selection?.actionId, 'block')
    if (!action || action.points.length === 0) return

    onPlayerActionComplete(playerId, { ...action, points: [] })
    clearBlockEditSelection()
    setDeleteEntireBlockOpen(false)
  }, [
    selectedPlayerId,
    blocksEditable,
    getSelectedAction,
    onPlayerActionComplete,
    clearBlockEditSelection,
  ])

  const requestDeleteEntireBlock = useCallback(() => {
    const selection = blockEditSelectionRef.current
    const playerId = selection?.playerId ?? selectedPlayerId
    if (!playerId || !blocksEditable) return

    const action = getSelectedAction(playerId, selection?.actionId, 'block')
    if (!action || action.points.length === 0) return

    setDeleteEntireBlockOpen(true)
  }, [selectedPlayerId, blocksEditable, getSelectedAction])

  const deleteSelectedDefenderRouteSegment = useCallback(() => {
    const selected = defenderRouteEditSelectionRef.current
    if (!selected || defenderRouteDragRef.current) return

    const segmentIndex = getDeletableDefenderRouteSegmentIndex(selected)
    if (segmentIndex === null) return

    const route = defenderRoutes.find((entry) => entry.defenderId === selected.defenderId)
    if (!route) {
      clearDefenderRouteEditSelection()
      return
    }

    const updated = deleteDefenderRouteSegment(route, segmentIndex)
    onDefenderRouteComplete(updated)

    if (updated.points.length === 0) {
      clearDefenderRouteEditSelection()
      return
    }

    if (selected.kind === 'vertex') {
      const nextVertexIndex = Math.min(selected.vertexIndex, updated.points.length)
      setDefenderRouteEditSelection({
        defenderId: selected.defenderId,
        kind: 'vertex',
        vertexIndex: nextVertexIndex,
      })
      return
    }

    const nextSegmentIndex = Math.min(segmentIndex, updated.points.length - 1)
    setDefenderRouteEditSelection({
      defenderId: selected.defenderId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [defenderRoutes, onDefenderRouteComplete, clearDefenderRouteEditSelection])

  const executeDeleteEntireDefenderRoute = useCallback(() => {
    const defenderId = defenderRouteEditSelectionRef.current?.defenderId ?? selectedDefenderId
    if (!defenderId || !defenderRoutesEditable) return

    const route = defenderRoutes.find((entry) => entry.defenderId === defenderId)
    if (!route || route.points.length === 0) return

    onDefenderRouteComplete(deleteEntireDefenderRoute(route))
    clearDefenderRouteEditSelection()
    setDeleteEntireDefenderRouteOpen(false)
  }, [
    selectedDefenderId,
    defenderRoutes,
    defenderRoutesEditable,
    onDefenderRouteComplete,
    clearDefenderRouteEditSelection,
  ])

  const requestDeleteEntireDefenderRoute = useCallback(() => {
    const defenderId = defenderRouteEditSelectionRef.current?.defenderId ?? selectedDefenderId
    if (!defenderId || !defenderRoutesEditable) return

    const route = defenderRoutes.find((entry) => entry.defenderId === defenderId)
    if (!route || route.points.length === 0) return

    setDeleteEntireDefenderRouteOpen(true)
  }, [selectedDefenderId, defenderRoutes, defenderRoutesEditable])

  const toggleBlockSegmentSelection = useCallback(
    (playerId: PlayerLabel, actionId: string, segmentIndex: number) => {
      setBlockEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.actionId === actionId &&
          current.kind === 'segment' &&
          current.segmentIndex === segmentIndex
        ) {
          return null
        }
        return { playerId, actionId, kind: 'segment', segmentIndex }
      })
    },
    [],
  )

  const toggleBlockVertexSelection = useCallback(
    (playerId: PlayerLabel, actionId: string, vertexIndex: number) => {
      setBlockEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.actionId === actionId &&
          current.kind === 'vertex' &&
          current.vertexIndex === vertexIndex
        ) {
          return null
        }
        return { playerId, actionId, kind: 'vertex', vertexIndex }
      })
    },
    [],
  )

  const toggleSegmentSelection = useCallback(
    (playerId: PlayerLabel, actionId: string, segmentIndex: number) => {
      setRouteEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.actionId === actionId &&
          current.kind === 'segment' &&
          current.segmentIndex === segmentIndex
        ) {
          return null
        }
        return { playerId, actionId, kind: 'segment', segmentIndex }
      })
    },
    [],
  )

  const toggleVertexSelection = useCallback(
    (playerId: PlayerLabel, actionId: string, vertexIndex: number) => {
      setRouteEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.actionId === actionId &&
          current.kind === 'vertex' &&
          current.vertexIndex === vertexIndex
        ) {
          return null
        }
        return { playerId, actionId, kind: 'vertex', vertexIndex }
      })
    },
    [],
  )

  const toggleMotionSegmentSelection = useCallback(
    (playerId: PlayerLabel, actionId: string, segmentIndex: number) => {
      setMotionEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.actionId === actionId &&
          current.kind === 'segment' &&
          current.segmentIndex === segmentIndex
        ) {
          return null
        }
        return { playerId, actionId, kind: 'segment', segmentIndex }
      })
    },
    [],
  )

  const toggleMotionVertexSelection = useCallback(
    (playerId: PlayerLabel, actionId: string, vertexIndex: number) => {
      setMotionEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.actionId === actionId &&
          current.kind === 'vertex' &&
          current.vertexIndex === vertexIndex
        ) {
          return null
        }
        return { playerId, actionId, kind: 'vertex', vertexIndex }
      })
    },
    [],
  )

  const toggleDefenderSegmentSelection = useCallback(
    (defenderId: DefenderLabel, segmentIndex: number) => {
      setDefenderRouteEditSelection((current) => {
        if (
          current?.defenderId === defenderId &&
          current.kind === 'segment' &&
          current.segmentIndex === segmentIndex
        ) {
          return null
        }
        return { defenderId, kind: 'segment', segmentIndex }
      })
    },
    [],
  )

  const toggleDefenderVertexSelection = useCallback(
    (defenderId: DefenderLabel, vertexIndex: number) => {
      setDefenderRouteEditSelection((current) => {
        if (
          current?.defenderId === defenderId &&
          current.kind === 'vertex' &&
          current.vertexIndex === vertexIndex
        ) {
          return null
        }
        return { defenderId, kind: 'vertex', vertexIndex }
      })
    },
    [],
  )

  function beginOffensePointerSelection(event: React.MouseEvent, playerId: PlayerLabel) {
    if (!offenseEditable) return
    event.stopPropagation()
    event.preventDefault()
    const clickPosition = getSvgPosition(event.clientX, event.clientY)
    const nearest = findNearestByPosition(clickPosition, players, PLAYER_SELECTION_RADIUS)
    pointerStartRef.current = {
      kind: 'offense',
      id: nearest?.id ?? playerId,
      x: event.clientX,
      y: event.clientY,
    }
    setPointerOffensePlayerId(nearest?.id ?? playerId)
  }

  function beginDefensePointerSelection(event: React.MouseEvent, defenderId: DefenderLabel) {
    if (!defenseEditable) return
    event.stopPropagation()
    event.preventDefault()
    const clickPosition = getSvgPosition(event.clientX, event.clientY)
    const nearest = findNearestByPosition(clickPosition, defenders, PLAYER_SELECTION_RADIUS)
    pointerStartRef.current = {
      kind: 'defense',
      id: nearest?.id ?? defenderId,
      x: event.clientX,
      y: event.clientY,
    }
  }

  function tryBeginNearestOffenseSelection(event: React.MouseEvent): boolean {
    if (!offenseEditable) return false
    const clickPosition = getSvgPosition(event.clientX, event.clientY)
    const nearest = findNearestByPosition(clickPosition, players, PLAYER_SELECTION_RADIUS)
    if (!nearest) return false
    pointerStartRef.current = {
      kind: 'offense',
      id: nearest.id,
      x: event.clientX,
      y: event.clientY,
    }
    event.preventDefault()
    return true
  }

  function tryBeginNearestDefenseSelection(event: React.MouseEvent): boolean {
    if (!defenseEditable) return false
    const clickPosition = getSvgPosition(event.clientX, event.clientY)
    const nearest = findNearestByPosition(clickPosition, defenders, PLAYER_SELECTION_RADIUS)
    if (!nearest) return false
    pointerStartRef.current = {
      kind: 'defense',
      id: nearest.id,
      x: event.clientX,
      y: event.clientY,
    }
    event.preventDefault()
    return true
  }

  function startRouteDrag(
    event: React.MouseEvent,
    anchor: { playerId: PlayerLabel; actionId: string; anchorVertexIndex: number },
  ) {
    event.preventDefault()
    routeDragRef.current = {
      playerId: anchor.playerId,
      actionId: anchor.actionId,
      anchorVertexIndex: anchor.anchorVertexIndex,
      dragPoints: [],
      screenX: event.clientX,
      screenY: event.clientY,
      startedDrag: false,
    }
  }

  function startMotionDrag(
    event: React.MouseEvent,
    anchor: { playerId: PlayerLabel; actionId: string; anchorVertexIndex: number },
  ) {
    event.preventDefault()
    motionDragRef.current = {
      playerId: anchor.playerId,
      actionId: anchor.actionId,
      anchorVertexIndex: anchor.anchorVertexIndex,
      dragPoints: [],
      screenX: event.clientX,
      screenY: event.clientY,
      startedDrag: false,
    }
  }

  function startBlockDrag(
    event: React.MouseEvent,
    anchor: { playerId: PlayerLabel; actionId: string; anchorVertexIndex: number },
  ) {
    event.preventDefault()
    blockDragRef.current = {
      playerId: anchor.playerId,
      actionId: anchor.actionId,
      anchorVertexIndex: anchor.anchorVertexIndex,
      dragPoints: [],
      screenX: event.clientX,
      screenY: event.clientY,
      startedDrag: false,
    }
  }

  /** Start route/motion/block drag from the selected player marker (same flow as field mousedown). */
  function tryBeginSelectedPlayerActionDrag(
    event: React.MouseEvent,
    playerId: PlayerLabel,
  ): boolean {
    if (playType !== 'offensive' || playerId !== selectedPlayerId || drawingMode === 'position') {
      return false
    }

    if (drawingMode === 'route' && routesEditable) {
      const anchor = resolveDrawAnchor()
      if (anchor?.playerId === playerId) {
        event.stopPropagation()
        startRouteDrag(event, anchor)
        return true
      }
    }

    if (drawingMode === 'motion' && motionsEditable) {
      const anchor = resolveMotionDrawAnchor()
      if (anchor?.playerId === playerId) {
        event.stopPropagation()
        startMotionDrag(event, anchor)
        return true
      }
    }

    if (drawingMode === 'block' && blocksEditable) {
      const anchor = resolveBlockDrawAnchor()
      if (anchor?.playerId === playerId) {
        event.stopPropagation()
        startBlockDrag(event, anchor)
        return true
      }
    }

    return false
  }

  function handleActionEndpointPointerDown(
    playerId: PlayerLabel,
    actionId: string,
    actionType: PlayerActionType,
    event: React.MouseEvent,
  ) {
    const editable =
      actionType === 'route'
        ? routesEditable
        : actionType === 'motion'
          ? motionsEditable
          : blocksEditable
    if (!editable) return

    event.stopPropagation()
    event.preventDefault()
    endpointDragRef.current = { playerId, actionId, actionType }
  }

  function handlePlayerPointerDown(playerId: PlayerLabel, event: React.MouseEvent) {
    if (tryBeginSelectedPlayerActionDrag(event, playerId)) return
    beginOffensePointerSelection(event, playerId)
  }

  function handleDefenderPointerDown(defenderId: DefenderLabel, event: React.MouseEvent) {
    beginDefensePointerSelection(event, defenderId)
  }

  function handleFieldMouseDown(event: React.MouseEvent) {
    const target = event.target as Element
    if (target.closest('.player-marker') || target.closest('.defender-marker')) return
    if (
      target.closest('.route-segment') ||
      target.closest('.route-segment-group') ||
      target.closest('.route-vertex-handle-hit') ||
      target.closest('.route-path-hit') ||
      target.closest('.motion-segment') ||
      target.closest('.motion-segment-group') ||
      target.closest('.motion-vertex-handle-hit') ||
      target.closest('.motion-path-hit') ||
      target.closest('.block-segment') ||
      target.closest('.block-segment-group') ||
      target.closest('.block-vertex-handle-hit') ||
      target.closest('.block-path-hit') ||
      target.closest('.route-endpoint-handle-hit') ||
      target.closest('.motion-endpoint-handle-hit') ||
      target.closest('.block-endpoint-handle-hit')
    ) {
      return
    }

    if (drawingMode === 'position') {
      if (playType === 'offensive' && tryBeginNearestOffenseSelection(event)) {
        return
      }
      if (playType === 'defensive' && tryBeginNearestDefenseSelection(event)) {
        return
      }
      return
    }

    if (drawingMode === 'route' && playType === 'offensive') {
      const anchor = resolveDrawAnchor()
      if (!anchor) {
        clearRouteEditSelection()
        if (tryBeginNearestOffenseSelection(event)) return
        return
      }

      event.preventDefault()
      startRouteDrag(event, anchor)
      return
    }

    if (drawingMode === 'motion' && playType === 'offensive') {
      const anchor = resolveMotionDrawAnchor()
      if (!anchor) {
        clearMotionEditSelection()
        if (tryBeginNearestOffenseSelection(event)) return
        return
      }

      event.preventDefault()
      startMotionDrag(event, anchor)
      return
    }

    if (drawingMode === 'route' && playType === 'defensive') {
      const anchor = resolveDefenderDrawAnchor()
      if (!anchor) {
        clearDefenderRouteEditSelection()
        if (tryBeginNearestDefenseSelection(event)) return
        return
      }

      event.preventDefault()
      defenderRouteDragRef.current = {
        defenderId: anchor.defenderId,
        anchorVertexIndex: anchor.vertexIndex,
        dragPoints: [],
        screenX: event.clientX,
        screenY: event.clientY,
        startedDrag: false,
      }
      return
    }

    if (drawingMode === 'block' && playType === 'offensive') {
      const anchor = resolveBlockDrawAnchor()
      if (!anchor) {
        clearBlockEditSelection()
        if (tryBeginNearestOffenseSelection(event)) return
        return
      }

      event.preventDefault()
      startBlockDrag(event, anchor)
      return
    }

    if (playType === 'offensive' && tryBeginNearestOffenseSelection(event)) {
      return
    }

    if (playType === 'defensive' && tryBeginNearestDefenseSelection(event)) {
      return
    }
  }

  useEffect(() => {
    clearRouteDrag()
    clearMotionDrag()
    clearBlockDrag()
    clearDefenderRouteDrag()
    clearEndpointDrag()
    clearRouteEditSelection()
    clearMotionEditSelection()
    clearBlockEditSelection()
    clearDefenderRouteEditSelection()
  }, [
    drawingMode,
    selectedPlayerId,
    selectedDefenderId,
    playType,
    clearRouteDrag,
    clearMotionDrag,
    clearBlockDrag,
    clearDefenderRouteDrag,
    clearEndpointDrag,
    clearRouteEditSelection,
    clearMotionEditSelection,
    clearBlockEditSelection,
    clearDefenderRouteEditSelection,
  ])

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const pointerStart = pointerStartRef.current

      if (pointerStart) {
        const dx = event.clientX - pointerStart.x
        const dy = event.clientY - pointerStart.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > DRAG_THRESHOLD) {
          if (pointerStart.kind === 'offense' && offenseEditable) {
            draggingTargetRef.current = { kind: 'offense', id: pointerStart.id }
            setDraggingOffensePlayerId(pointerStart.id)
            setPointerOffensePlayerId(null)
          } else if (pointerStart.kind === 'defense' && defenseEditable) {
            draggingTargetRef.current = { kind: 'defense', id: pointerStart.id }
          }
          pointerStartRef.current = null
        }
      }

      const dragging = draggingTargetRef.current
      if (dragging) {
        const position = getSvgPosition(event.clientX, event.clientY)
        if (dragging.kind === 'offense') {
          onPlayerMove(dragging.id, position)
        } else {
          onDefenderMove(dragging.id, position)
        }
      }

      const endpointDrag = endpointDragRef.current
      if (endpointDrag && !dragging) {
        const action = findActionInChain(
          playerActions,
          endpointDrag.playerId,
          endpointDrag.actionId,
        )
        if (action && action.points.length > 0) {
          const position = getSvgPosition(event.clientX, event.clientY)
          const chain = getSortedChain(playerActions, endpointDrag.playerId)
          const actionIndex = chain.findIndex((entry) => entry.id === endpointDrag.actionId)
          const startPosition =
            actionIndex >= 0
              ? getActionStartPosition(
                  getPlayerPosition(endpointDrag.playerId),
                  chain,
                  actionIndex,
                )
              : getPlayerPosition(endpointDrag.playerId)

          onPlayerActionComplete(endpointDrag.playerId, {
            ...action,
            points: reshapeActionPointsFromEndpointDrag(
              startPosition,
              action.points,
              position,
            ),
          })
        }
      }

      const routeDrag = routeDragRef.current
      const motionDrag = motionDragRef.current
      const blockDrag = blockDragRef.current

      if (
        drawingModeRef.current === 'route' &&
        playType === 'offensive' &&
        routeDrag &&
        !dragging &&
        !endpointDrag
      ) {
        const position = getSvgPosition(event.clientX, event.clientY)
        const dx = event.clientX - routeDrag.screenX
        const dy = event.clientY - routeDrag.screenY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (!routeDrag.startedDrag && distance > DRAG_THRESHOLD) {
          routeDrag.startedDrag = true
        }

        if (routeDrag.startedDrag) {
          routeDrag.dragPoints = appendPathPoint(routeDrag.dragPoints, position)
          setFreehandDraft({
            playerId: routeDrag.playerId,
            actionId: routeDrag.actionId,
            anchorVertexIndex: routeDrag.anchorVertexIndex,
            points: routeDrag.dragPoints,
          })
        }
      }

      if (
        drawingModeRef.current === 'motion' &&
        playType === 'offensive' &&
        motionDrag &&
        !dragging &&
        !endpointDrag
      ) {
        const position = getSvgPosition(event.clientX, event.clientY)
        const dx = event.clientX - motionDrag.screenX
        const dy = event.clientY - motionDrag.screenY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (!motionDrag.startedDrag && distance > DRAG_THRESHOLD) {
          motionDrag.startedDrag = true
        }

        if (motionDrag.startedDrag) {
          motionDrag.dragPoints = appendPathPoint(motionDrag.dragPoints, position)
          setMotionFreehandDraft({
            playerId: motionDrag.playerId,
            actionId: motionDrag.actionId,
            anchorVertexIndex: motionDrag.anchorVertexIndex,
            points: motionDrag.dragPoints,
          })
        }
      }

      if (
        drawingModeRef.current === 'block' &&
        playType === 'offensive' &&
        blockDrag &&
        !dragging &&
        !endpointDrag
      ) {
        const position = getSvgPosition(event.clientX, event.clientY)
        const dx = event.clientX - blockDrag.screenX
        const dy = event.clientY - blockDrag.screenY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (!blockDrag.startedDrag && distance > DRAG_THRESHOLD) {
          blockDrag.startedDrag = true
        }

        if (blockDrag.startedDrag) {
          blockDrag.dragPoints = appendPathPoint(blockDrag.dragPoints, position)
          setBlockFreehandDraft({
            playerId: blockDrag.playerId,
            actionId: blockDrag.actionId,
            anchorVertexIndex: blockDrag.anchorVertexIndex,
            points: blockDrag.dragPoints,
          })
        }
      }

      const defenderRouteDrag = defenderRouteDragRef.current

      if (
        drawingModeRef.current === 'route' &&
        playType === 'defensive' &&
        defenderRouteDrag &&
        !dragging &&
        !endpointDrag
      ) {
        const position = getSvgPosition(event.clientX, event.clientY)
        const dx = event.clientX - defenderRouteDrag.screenX
        const dy = event.clientY - defenderRouteDrag.screenY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (!defenderRouteDrag.startedDrag && distance > DRAG_THRESHOLD) {
          defenderRouteDrag.startedDrag = true
        }

        if (defenderRouteDrag.startedDrag) {
          defenderRouteDrag.dragPoints = appendPathPoint(
            defenderRouteDrag.dragPoints,
            position,
          )
          setDefenderFreehandDraft({
            defenderId: defenderRouteDrag.defenderId,
            anchorVertexIndex: defenderRouteDrag.anchorVertexIndex,
            points: defenderRouteDrag.dragPoints,
          })
        }
      }

    }

    function handleMouseUp(event: MouseEvent) {
      const pointerStart = pointerStartRef.current
      if (pointerStart?.kind === 'offense' && offenseEditable) {
        onSelectPlayer(pointerStart.id)
        clearRouteEditSelection()
        clearMotionEditSelection()
        clearBlockEditSelection()
        pointerStartRef.current = null
      } else if (pointerStart?.kind === 'defense' && defenseEditable) {
        onSelectDefender(pointerStart.id)
        clearDefenderRouteEditSelection()
        pointerStartRef.current = null
      } else if (pointerStart) {
        pointerStartRef.current = null
      }

      const routeDrag = routeDragRef.current

      if (drawingModeRef.current === 'route' && playType === 'offensive' && routeDrag) {
        if (!routeDrag.startedDrag) {
          const position = getSvgPosition(event.clientX, event.clientY)
          const last = routeDrag.dragPoints[routeDrag.dragPoints.length - 1]
          const dx = last ? position.x - last.x : 0
          const dy = last ? position.y - last.y : 0
          const isDistinct =
            !last || Math.sqrt(dx * dx + dy * dy) >= CLICK_MIN_DISTANCE

          if (isDistinct) {
            commitRouteExtension(
              routeDrag.playerId,
              routeDrag.actionId,
              routeDrag.anchorVertexIndex,
              [position],
            )
          }
        } else if (routeDrag.dragPoints.length > 0) {
          commitRouteExtension(
            routeDrag.playerId,
            routeDrag.actionId,
            routeDrag.anchorVertexIndex,
            routeDrag.dragPoints,
          )
        }

        clearRouteDrag()
      }

      const motionDrag = motionDragRef.current

      if (drawingModeRef.current === 'motion' && playType === 'offensive' && motionDrag) {
        if (!motionDrag.startedDrag) {
          const position = getSvgPosition(event.clientX, event.clientY)
          const last = motionDrag.dragPoints[motionDrag.dragPoints.length - 1]
          const dx = last ? position.x - last.x : 0
          const dy = last ? position.y - last.y : 0
          const isDistinct =
            !last || Math.sqrt(dx * dx + dy * dy) >= CLICK_MIN_DISTANCE

          if (isDistinct) {
            commitMotionExtension(
              motionDrag.playerId,
              motionDrag.actionId,
              motionDrag.anchorVertexIndex,
              [position],
            )
          }
        } else if (motionDrag.dragPoints.length > 0) {
          commitMotionExtension(
            motionDrag.playerId,
            motionDrag.actionId,
            motionDrag.anchorVertexIndex,
            motionDrag.dragPoints,
          )
        }

        clearMotionDrag()
      }

      const blockDrag = blockDragRef.current

      if (drawingModeRef.current === 'block' && playType === 'offensive' && blockDrag) {
        if (!blockDrag.startedDrag) {
          const position = getSvgPosition(event.clientX, event.clientY)
          const last = blockDrag.dragPoints[blockDrag.dragPoints.length - 1]
          const dx = last ? position.x - last.x : 0
          const dy = last ? position.y - last.y : 0
          const isDistinct =
            !last || Math.sqrt(dx * dx + dy * dy) >= CLICK_MIN_DISTANCE

          if (isDistinct) {
            commitBlockExtension(
              blockDrag.playerId,
              blockDrag.actionId,
              blockDrag.anchorVertexIndex,
              [position],
            )
          }
        } else if (blockDrag.dragPoints.length > 0) {
          commitBlockExtension(
            blockDrag.playerId,
            blockDrag.actionId,
            blockDrag.anchorVertexIndex,
            blockDrag.dragPoints,
          )
        }

        clearBlockDrag()
      }

      const defenderRouteDrag = defenderRouteDragRef.current

      if (drawingModeRef.current === 'route' && playType === 'defensive' && defenderRouteDrag) {
        if (!defenderRouteDrag.startedDrag) {
          const position = getSvgPosition(event.clientX, event.clientY)
          const last = defenderRouteDrag.dragPoints[defenderRouteDrag.dragPoints.length - 1]
          const dx = last ? position.x - last.x : 0
          const dy = last ? position.y - last.y : 0
          const isDistinct =
            !last || Math.sqrt(dx * dx + dy * dy) >= CLICK_MIN_DISTANCE

          if (isDistinct) {
            commitDefenderRouteExtension(
              defenderRouteDrag.defenderId,
              defenderRouteDrag.anchorVertexIndex,
              [position],
            )
          }
        } else if (defenderRouteDrag.dragPoints.length > 0) {
          commitDefenderRouteExtension(
            defenderRouteDrag.defenderId,
            defenderRouteDrag.anchorVertexIndex,
            defenderRouteDrag.dragPoints,
          )
        }

        clearDefenderRouteDrag()
      }

      clearEndpointDrag()

      draggingTargetRef.current = null
      setDraggingOffensePlayerId(null)
      setPointerOffensePlayerId(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (event.shiftKey) {
          if (
            playType === 'offensive' &&
            drawingModeRef.current === 'route' &&
            routesEditable &&
            !routeDragRef.current
          ) {
            if (routeEditSelectionRef.current) {
              event.preventDefault()
              deleteEntireSelectedRoute()
            }
          } else if (
            playType === 'offensive' &&
            drawingModeRef.current === 'motion' &&
            motionsEditable &&
            !motionDragRef.current
          ) {
            const selection = motionEditSelectionRef.current
            const playerId = selection?.playerId ?? selectedPlayerId
            const action =
              playerId !== null && playerId !== undefined
                ? getSelectedAction(playerId, selection?.actionId, 'motion')
                : null

            if (action && action.points.length > 0) {
              event.preventDefault()
              setDeleteEntireMotionOpen(true)
            }
          } else if (
            playType === 'offensive' &&
            drawingModeRef.current === 'block' &&
            blocksEditable &&
            !blockDragRef.current
          ) {
            const selection = blockEditSelectionRef.current
            const playerId = selection?.playerId ?? selectedPlayerId
            const action =
              playerId !== null && playerId !== undefined
                ? getSelectedAction(playerId, selection?.actionId, 'block')
                : null

            if (action && action.points.length > 0) {
              event.preventDefault()
              setDeleteEntireBlockOpen(true)
            }
          } else if (
            playType === 'defensive' &&
            drawingModeRef.current === 'route' &&
            defenderRoutesEditable &&
            !defenderRouteDragRef.current
          ) {
            const defenderId =
              defenderRouteEditSelectionRef.current?.defenderId ?? selectedDefenderId
            const route = defenderId
              ? defenderRoutes.find((entry) => entry.defenderId === defenderId)
              : undefined

            if (route && route.points.length > 0) {
              event.preventDefault()
              setDeleteEntireDefenderRouteOpen(true)
            }
          }
          return
        }

        if (
          playType === 'offensive' &&
          drawingModeRef.current === 'route' &&
          canDeleteRouteSegmentSelection(routeEditSelectionRef.current) &&
          !routeDragRef.current
        ) {
          event.preventDefault()
          deleteSelectedRouteSegment()
        } else if (
          playType === 'offensive' &&
          drawingModeRef.current === 'block' &&
          canDeleteBlockSegmentSelection(blockEditSelectionRef.current) &&
          !blockDragRef.current
        ) {
          event.preventDefault()
          deleteSelectedBlockSegment()
        } else if (
          playType === 'offensive' &&
          drawingModeRef.current === 'motion' &&
          canDeleteRouteSegmentSelection(motionEditSelectionRef.current) &&
          !motionDragRef.current
        ) {
          event.preventDefault()
          deleteSelectedMotionSegment()
        } else if (
          playType === 'defensive' &&
          drawingModeRef.current === 'route' &&
          canDeleteDefenderRouteSegmentSelection(defenderRouteEditSelectionRef.current) &&
          !defenderRouteDragRef.current
        ) {
          event.preventDefault()
          deleteSelectedDefenderRouteSegment()
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    playType,
    offenseEditable,
    defenseEditable,
    onPlayerMove,
    onDefenderMove,
    onPlayerActionComplete,
    onSelectPlayer,
    onSelectDefender,
    playerActions,
    selectedPlayerId,
    routesEditable,
    deleteSelectedRouteSegment,
    deleteSelectedBlockSegment,
    deleteSelectedMotionSegment,
    deleteSelectedDefenderRouteSegment,
    deleteEntireSelectedRoute,
    clearRouteDrag,
    clearMotionDrag,
    clearBlockDrag,
    clearDefenderRouteDrag,
    clearEndpointDrag,
    commitRouteExtension,
    commitBlockExtension,
    commitMotionExtension,
    commitDefenderRouteExtension,
    getSelectedAction,
    blocksEditable,
    defenderRoutes,
    defenderRoutesEditable,
    selectedDefenderId,
  ])

  const freehandRouteForDisplay = useMemo(() => {
    if (!freehandDraft) return null

    const playerPosition = getPlayerPosition(freehandDraft.playerId)
    const startPosition = getDraftStartPosition(
      playerPosition,
      playerActions,
      freehandDraft.playerId,
      freehandDraft.actionId,
    )
    const existingPoints =
      freehandDraft.actionId === NEW_ACTION_ID
        ? []
        : (findActionInChain(playerActions, freehandDraft.playerId, freehandDraft.actionId)
            ?.points ?? [])
    return {
      playerId: freehandDraft.playerId,
      points: extendRouteFromAnchor(
        { playerId: freehandDraft.playerId, points: existingPoints },
        freehandDraft.anchorVertexIndex,
        freehandDraft.points,
      ).points,
      startPosition,
    }
  }, [freehandDraft, playerActions, players])

  const freehandBlockForDisplay = useMemo(() => {
    if (!blockFreehandDraft) return null

    const playerPosition = getPlayerPosition(blockFreehandDraft.playerId)
    const startPosition = getDraftStartPosition(
      playerPosition,
      playerActions,
      blockFreehandDraft.playerId,
      blockFreehandDraft.actionId,
    )
    const existingPoints =
      blockFreehandDraft.actionId === NEW_ACTION_ID
        ? []
        : (findActionInChain(playerActions, blockFreehandDraft.playerId, blockFreehandDraft.actionId)
            ?.points ?? [])
    return {
      playerId: blockFreehandDraft.playerId,
      points: extendRouteFromAnchor(
        { playerId: blockFreehandDraft.playerId, points: existingPoints },
        blockFreehandDraft.anchorVertexIndex,
        blockFreehandDraft.points,
      ).points,
      startPosition,
    }
  }, [blockFreehandDraft, playerActions, players])

  const freehandMotionForDisplay = useMemo(() => {
    if (!motionFreehandDraft) return null

    const playerPosition = getPlayerPosition(motionFreehandDraft.playerId)
    const startPosition = getDraftStartPosition(
      playerPosition,
      playerActions,
      motionFreehandDraft.playerId,
      motionFreehandDraft.actionId,
    )
    const existingPoints =
      motionFreehandDraft.actionId === NEW_ACTION_ID
        ? []
        : (findActionInChain(
            playerActions,
            motionFreehandDraft.playerId,
            motionFreehandDraft.actionId,
          )?.points ?? [])
    return {
      playerId: motionFreehandDraft.playerId,
      motionType: motionTypeRef.current,
      points: extendRouteFromAnchor(
        { playerId: motionFreehandDraft.playerId, points: existingPoints },
        motionFreehandDraft.anchorVertexIndex,
        motionFreehandDraft.points,
      ).points,
      startPosition,
    }
  }, [motionFreehandDraft, playerActions, players, motionType])

  const freehandDefenderRouteForDisplay = useMemo(() => {
    if (!defenderFreehandDraft) return null

    const defenderPosition = getDefenderPosition(defenderFreehandDraft.defenderId)
    const existing = getDefenderRouteForDefender(defenderFreehandDraft.defenderId)
    return {
      defenderId: defenderFreehandDraft.defenderId,
      points: extendDefenderRouteFromAnchor(
        existing,
        defenderFreehandDraft.anchorVertexIndex,
        defenderFreehandDraft.points,
      ).points,
      defenderPosition,
    }
  }, [defenderFreehandDraft, getDefenderRouteForDefender, defenders])

  const selectedPlayerHasRoute = Boolean(
    selectedPlayerId &&
      getSortedChain(playerActions, selectedPlayerId).some(
        (entry) => entry.type === 'route' && entry.points.length > 0,
      ),
  )

  const routeEditAction = routeEditSelection
    ? findActionInChain(
        playerActions,
        routeEditSelection.playerId,
        routeEditSelection.actionId,
      )
    : null

  const routeEditSelectionHasRoute = Boolean(
    routeEditAction && routeEditAction.points.length > 0,
  )

  const selectedPlayerHasMotion = Boolean(
    selectedPlayerId &&
      getSortedChain(playerActions, selectedPlayerId).some(
        (entry) => entry.type === 'motion' && entry.points.length > 0,
      ),
  )

  const selectedPlayerHasBlock = Boolean(
    selectedPlayerId &&
      getSortedChain(playerActions, selectedPlayerId).some(
        (entry) => entry.type === 'block' && entry.points.length > 0,
      ),
  )

  const selectedDefenderHasRoute = Boolean(
    selectedDefenderId &&
      defenderRoutes.find(
        (entry) => entry.defenderId === selectedDefenderId && entry.points.length > 0,
      ),
  )

  const canDeleteEntireRoute =
    routesEditable && routeEditSelectionHasRoute
  const canDeleteRouteSegment =
    routesEditable && canDeleteRouteSegmentSelection(routeEditSelection)
  const canDeleteEntireMotion =
    motionsEditable && drawingMode === 'motion' && selectedPlayerHasMotion
  const canDeleteMotionSegment =
    motionsEditable &&
    drawingMode === 'motion' &&
    canDeleteRouteSegmentSelection(motionEditSelection)
  const canDeleteEntireBlock =
    blocksEditable && drawingMode === 'block' && selectedPlayerHasBlock
  const canDeleteBlockSegment =
    blocksEditable &&
    drawingMode === 'block' &&
    canDeleteBlockSegmentSelection(blockEditSelection)
  const canDeleteEntireDefenderRoute =
    defenderRoutesEditable && playType === 'defensive' && selectedDefenderHasRoute
  const canDeleteDefenderRouteSegment =
    defenderRoutesEditable &&
    playType === 'defensive' &&
    canDeleteDefenderRouteSegmentSelection(defenderRouteEditSelection)

  const selectedActionEditSelection =
    routeEditSelection ?? motionEditSelection ?? blockEditSelection

  const selectedActionForMarkerEdit = selectedActionEditSelection
    ? findActionInChain(
        playerActions,
        selectedActionEditSelection.playerId,
        selectedActionEditSelection.actionId,
      )
    : null

  const showEndpointMarkerSelector = Boolean(
    offenseEditable &&
      !schemePositionsOnly &&
      selectedActionForMarkerEdit &&
      selectedActionForMarkerEdit.points.length > 0,
  )

  function handleEndpointMarkerChange(marker: EndpointMarker) {
    const selection = routeEditSelection ?? motionEditSelection ?? blockEditSelection
    if (!selection) return

    const action = findActionInChain(playerActions, selection.playerId, selection.actionId)
    if (!action || action.points.length === 0) return

    onPlayerActionComplete(selection.playerId, { ...action, endpointMarker: marker })
  }

  const hintText = (() => {
    if (playType === 'offensive' && selectedPlayerId) {
      if (drawingMode === 'block') {
        if (blockEditSelection?.kind === 'segment') {
          return 'Segment selected — Delete removes segment, Shift+Delete removes entire block'
        }
        if (blockEditSelection?.kind === 'vertex' && blockEditSelection.vertexIndex > 0) {
          return 'Point selected — Delete removes segment, drag to extend block'
        }
        if (blockEditSelection) {
          return 'Extend block from selected point — click or drag on the field'
        }
        if (selectedPlayerHasBlock) {
          return `${selectedPlayerId} selected — click block to select a segment`
        }
        return `${selectedPlayerId} selected — click the field to start a block`
      }
      if (drawingMode === 'motion') {
        if (motionEditSelection?.kind === 'segment') {
          return 'Segment selected — Delete removes segment, Shift+Delete removes entire motion'
        }
        if (motionEditSelection?.kind === 'vertex' && motionEditSelection.vertexIndex > 0) {
          return 'Point selected — Delete removes segment, drag to extend motion'
        }
        if (motionEditSelection) {
          return 'Extend motion from selected point — click or drag on the field'
        }
        if (selectedPlayerHasMotion) {
          return `${selectedPlayerId} selected — click motion to select a segment`
        }
        return `${selectedPlayerId} selected — click the field to start a ${motionType} motion`
      }
      if (routeEditSelection?.kind === 'segment') {
        return 'Segment selected — Delete removes segment, Shift+Delete removes entire route'
      }
      if (routeEditSelection?.kind === 'vertex' && routeEditSelection.vertexIndex > 0) {
        return 'Point selected — Delete removes segment, drag to extend route'
      }
      if (routeEditSelection) {
        return 'Extend route from selected point — click or drag on the field'
      }
      if (selectedPlayerHasRoute) {
        return `${selectedPlayerId} selected — click route to select a segment`
      }
      return `${selectedPlayerId} selected — click the field to start a route`
    }

    if (playType === 'defensive' && selectedDefenderId) {
      if (defenderRouteEditSelection?.kind === 'segment') {
        return 'Segment selected — Delete removes segment, Shift+Delete removes entire movement'
      }
      if (
        defenderRouteEditSelection?.kind === 'vertex' &&
        defenderRouteEditSelection.vertexIndex > 0
      ) {
        return 'Point selected — Delete removes segment, drag to extend movement'
      }
      if (defenderRouteEditSelection) {
        return 'Extend movement from selected point — click or drag on the field'
      }
      if (selectedDefenderHasRoute) {
        return `${selectedDefenderId} selected — click movement to select a segment`
      }
      return `${selectedDefenderId} selected — click the field to start a movement`
    }

    return null
  })()

  const showRouteDrawControls =
    hintText ||
    showEndpointMarkerSelector ||
    canDeleteEntireRoute ||
    canDeleteRouteSegment ||
    canDeleteEntireBlock ||
    canDeleteBlockSegment ||
    canDeleteEntireMotion ||
    canDeleteMotionSegment ||
    canDeleteEntireDefenderRoute ||
    canDeleteDefenderRouteSegment

  const leftSidelineX = YARD_NUMBER_SIDELINE_INSET
  const rightSidelineX = FIELD_WIDTH - YARD_NUMBER_SIDELINE_INSET

  const actionToolbar =
    showRouteDrawControls ? (
      <div className="route-draw-controls">
        {hintText && <span className="route-draw-hint">{hintText}</span>}
        {canDeleteRouteSegment && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={deleteSelectedRouteSegment}
          >
            Delete Segment
          </button>
        )}
        {canDeleteEntireRoute && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={deleteEntireSelectedRoute}
          >
            Delete Entire Route
          </button>
        )}
        {canDeleteMotionSegment && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={deleteSelectedMotionSegment}
          >
            Delete Segment
          </button>
        )}
        {canDeleteBlockSegment && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={deleteSelectedBlockSegment}
          >
            Delete Segment
          </button>
        )}
        {canDeleteEntireBlock && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={requestDeleteEntireBlock}
          >
            Delete Entire Block
          </button>
        )}
        {canDeleteEntireMotion && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={requestDeleteEntireMotion}
          >
            Delete Entire Motion
          </button>
        )}
        {canDeleteDefenderRouteSegment && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={deleteSelectedDefenderRouteSegment}
          >
            Delete Segment
          </button>
        )}
        {canDeleteEntireDefenderRoute && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={requestDeleteEntireDefenderRoute}
          >
            Delete Entire Movement
          </button>
        )}
        {showEndpointMarkerSelector && selectedActionForMarkerEdit && (
          <EndpointMarkerSelector
            value={resolveEndpointMarker(selectedActionForMarkerEdit)}
            canEdit={offenseEditable && !schemePositionsOnly}
            onChange={handleEndpointMarkerChange}
          />
        )}
      </div>
    ) : null

  return (
    <>
      <ConfirmDialog
        open={deleteEntireMotionOpen}
        message="Delete this entire motion?"
        variant="delete"
        confirmLabel="Delete Motion"
        onConfirm={executeDeleteEntireMotion}
        onCancel={() => setDeleteEntireMotionOpen(false)}
      />
      <ConfirmDialog
        open={deleteEntireBlockOpen}
        message="Delete this entire block?"
        variant="delete"
        confirmLabel="Delete Block"
        onConfirm={executeDeleteEntireBlock}
        onCancel={() => setDeleteEntireBlockOpen(false)}
      />
      <ConfirmDialog
        open={deleteEntireDefenderRouteOpen}
        message="Delete this entire movement?"
        variant="delete"
        confirmLabel="Delete Movement"
        onConfirm={executeDeleteEntireDefenderRoute}
        onCancel={() => setDeleteEntireDefenderRouteOpen(false)}
      />

      {toolbarPortalTarget && actionToolbar
        ? createPortal(actionToolbar, toolbarPortalTarget)
        : null}

      <div className="field-zoom-scaler">
        <div className="field-stack">
          <div className={`field-container field-display-${FIELD_DISPLAY_THEME}`}>
            <div className="field-viewport">
        <svg
          ref={svgRef}
          className="field-svg"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="50-yard football field with offensive and defensive players"
          onMouseDown={handleFieldMouseDown}
        >
          <defs>
            <filter id="turf-grain" x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="1.15"
                numOctaves="3"
                result="noise"
              />
              <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
              <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
            </filter>
            <marker
              id="route-arrow"
              markerWidth="0.76"
              markerHeight="0.76"
              refX="0.65"
              refY="0.38"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <polygon points="0 0, 0.76 0.38, 0 0.76" className="route-arrow-head-filled" />
            </marker>
          </defs>

          <rect
            x={0}
            y={0}
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            className="field-viewbox-bg"
          />

          <g className="field-play-area" transform={`translate(${FIELD_PADDING_LEFT}, ${FIELD_PLAY_AREA_Y})`}>
            <g className="field-turf-surface" filter="url(#turf-grain)">
              <rect
                x={0}
                y={0}
                width={FIELD_WIDTH}
                height={FIELD_LENGTH}
                className="field-turf"
              />
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
                aria-hidden="true"
              />
            )}

            {ownEndzoneBounds && (
              <rect
                x={0}
                y={ownEndzoneBounds.topY}
                width={FIELD_WIDTH}
                height={ownEndzoneBounds.bottomY - ownEndzoneBounds.topY}
                className="field-endzone field-endzone-own"
                aria-hidden="true"
              />
            )}

            <rect
              x={0}
              y={0}
              width={FIELD_WIDTH}
              height={FIELD_LENGTH}
              className="field-boundary"
            />

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

            {ownEndzoneBounds && ownGoalLineViewY > 0 && ownGoalLineViewY < FIELD_LENGTH + ENDZONE_DEPTH_YARDS && (
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

            <g className="yard-numbers-sideline" aria-hidden="true">
              {yardLabels.map((marker) => {
                const leftArrow = yardArrowPoints(marker.viewY, leftSidelineX, marker.absoluteYard)
                const rightArrow = yardArrowPoints(marker.viewY, rightSidelineX, marker.absoluteYard)

                return (
                  <g key={`sideline-${marker.absoluteYard}`}>
                    {leftArrow && (
                      <polygon points={leftArrow} className="yard-number-arrow" />
                    )}
                    <text
                      x={leftSidelineX}
                      y={marker.viewY}
                      transform={`rotate(-90, ${leftSidelineX}, ${marker.viewY})`}
                      className="yard-number-sideline"
                    >
                      {marker.label}
                    </text>
                    {rightArrow && (
                      <polygon points={rightArrow} className="yard-number-arrow" />
                    )}
                    <text
                      x={rightSidelineX}
                      y={marker.viewY}
                      transform={`rotate(90, ${rightSidelineX}, ${marker.viewY})`}
                      className="yard-number-sideline"
                    >
                      {marker.label}
                    </text>
                  </g>
                )
              })}
            </g>

            {showAlignmentGrid && <FieldAlignmentGrid />}

            <line
              x1={0}
              y1={viewBounds.losViewY}
              x2={FIELD_WIDTH}
              y2={viewBounds.losViewY}
              className="los-line"
            />

            {playType === 'offensive' && (
              <rect
                x={0}
                y={0}
                width={FIELD_WIDTH}
                height={LOS_VIEW_Y}
                className="field-side-locked field-side-defense"
                aria-hidden="true"
              />
            )}

            {playType === 'defensive' && (
              <rect
                x={0}
                y={LOS_VIEW_Y}
                width={FIELD_WIDTH}
                height={FIELD_LENGTH - LOS_VIEW_Y}
                className="field-side-locked field-side-offense"
                aria-hidden="true"
              />
            )}

            <PlayerActionChainLines
              players={players}
              playerActions={playerActions}
              routesEditable={routesEditable}
              motionsEditable={motionsEditable}
              blocksEditable={blocksEditable}
              routeEditSelection={routeEditSelection}
              motionEditSelection={motionEditSelection}
              blockEditSelection={blockEditSelection}
              onRouteSegmentSelect={(playerId, actionId, segmentIndex) => {
                if (!routesEditable || routeDragRef.current || endpointDragRef.current) return
                toggleSegmentSelection(playerId, actionId, segmentIndex)
              }}
              onRouteVertexSelect={(playerId, actionId, vertexIndex) => {
                if (!routesEditable || routeDragRef.current || endpointDragRef.current) return
                toggleVertexSelection(playerId, actionId, vertexIndex)
              }}
              onMotionSegmentSelect={(playerId, actionId, segmentIndex) => {
                if (!motionsEditable || motionDragRef.current || endpointDragRef.current) return
                toggleMotionSegmentSelection(playerId, actionId, segmentIndex)
              }}
              onMotionVertexSelect={(playerId, actionId, vertexIndex) => {
                if (!motionsEditable || motionDragRef.current || endpointDragRef.current) return
                toggleMotionVertexSelection(playerId, actionId, vertexIndex)
              }}
              onBlockSegmentSelect={(playerId, actionId, segmentIndex) => {
                if (!blocksEditable || blockDragRef.current || endpointDragRef.current) return
                toggleBlockSegmentSelection(playerId, actionId, segmentIndex)
              }}
              onBlockVertexSelect={(playerId, actionId, vertexIndex) => {
                if (!blocksEditable || blockDragRef.current || endpointDragRef.current) return
                toggleBlockVertexSelection(playerId, actionId, vertexIndex)
              }}
              onActionEndpointPointerDown={handleActionEndpointPointerDown}
            />

            {defenderRoutes.map((route) => (
              <RouteLine
                key={`defender-route-${route.defenderId}`}
                playerPosition={getDefenderPosition(route.defenderId)}
                route={{
                  playerId: route.defenderId as unknown as PlayerLabel,
                  points: route.points,
                }}
                readOnly={!defenderRoutesEditable}
                selectedSegmentIndex={
                  defenderRouteEditSelection?.defenderId === route.defenderId &&
                  defenderRouteEditSelection.kind === 'segment'
                    ? defenderRouteEditSelection.segmentIndex
                    : null
                }
                selectedVertexIndex={
                  defenderRouteEditSelection?.defenderId === route.defenderId &&
                  defenderRouteEditSelection.kind === 'vertex'
                    ? defenderRouteEditSelection.vertexIndex
                    : null
                }
                onSegmentSelect={(segmentIndex) => {
                  if (!defenderRoutesEditable || defenderRouteDragRef.current) return
                  toggleDefenderSegmentSelection(route.defenderId, segmentIndex)
                }}
                onVertexSelect={(vertexIndex) => {
                  if (!defenderRoutesEditable || defenderRouteDragRef.current) return
                  toggleDefenderVertexSelection(route.defenderId, vertexIndex)
                }}
              />
            ))}

            {freehandBlockForDisplay && drawingMode === 'block' && playType === 'offensive' && (
              <BlockLine
                playerPosition={freehandBlockForDisplay.startPosition}
                block={{
                  playerId: freehandBlockForDisplay.playerId,
                  points: freehandBlockForDisplay.points,
                }}
                isDraft
              />
            )}

            {freehandRouteForDisplay && drawingMode === 'route' && playType === 'offensive' && (
              <RouteLine
                playerPosition={freehandRouteForDisplay.startPosition}
                route={{
                  playerId: freehandRouteForDisplay.playerId,
                  points: freehandRouteForDisplay.points,
                }}
                isDraft
              />
            )}

            {freehandMotionForDisplay && drawingMode === 'motion' && playType === 'offensive' && (
              <MotionLine
                playerPosition={freehandMotionForDisplay.startPosition}
                motion={{
                  playerId: freehandMotionForDisplay.playerId,
                  motionType: freehandMotionForDisplay.motionType,
                  points: freehandMotionForDisplay.points,
                }}
                isDraft
              />
            )}

            {freehandDefenderRouteForDisplay &&
              drawingMode === 'route' &&
              playType === 'defensive' && (
                <RouteLine
                  playerPosition={freehandDefenderRouteForDisplay.defenderPosition}
                  route={{
                    playerId: freehandDefenderRouteForDisplay.defenderId as unknown as PlayerLabel,
                    points: freehandDefenderRouteForDisplay.points,
                  }}
                  isDraft
                />
              )}

            <PlayerAlignmentGuides guides={playerAlignmentGuides} />

            {orderedDefenders.map((defender) => (
              <g
                key={defender.id}
                className={`defender-marker ${selectedDefenderId === defender.id ? 'defender-marker-selected' : ''} ${!defenseEditable ? 'defender-marker-locked' : ''}`}
                transform={`translate(${defender.position.x}, ${defender.position.y})`}
                aria-label={`Defense ${defender.label}${!defenseEditable ? ' (locked)' : ''}`}
                onMouseDown={
                  defenseEditable
                    ? (event) => handleDefenderPointerDown(defender.id, event)
                    : undefined
                }
              >
                <rect
                  x={-PLAYBOOK_HIT_SIZE}
                  y={-PLAYBOOK_HIT_SIZE}
                  width={PLAYBOOK_HIT_SIZE * 2}
                  height={PLAYBOOK_HIT_SIZE * 2}
                  className="defender-hit-area"
                />
                <text className="defender-symbol" fontSize={PLAYBOOK_SYMBOL_SIZE}>
                  X
                </text>
                <text className="defender-label" y={PLAYBOOK_LABEL_OFFSET}>
                  {defender.label}
                </text>
              </g>
            ))}

            {orderedPlayers.map((player) => (
              <PlayerMarker
                key={player.id}
                player={player}
                isSelected={selectedPlayerId === player.id}
                hasNotes={playerHasNotes(playerNotes, player.id)}
                isLocked={!offenseEditable}
                onPointerDown={handlePlayerPointerDown}
              />
            ))}

          </g>
        </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
