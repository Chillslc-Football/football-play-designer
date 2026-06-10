import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FIELD_LENGTH,
  FIELD_PADDING_LEFT,
  FIELD_PADDING_TOP,
  FIELD_WIDTH,
  PLAYBOOK_HIT_SIZE,
  PLAYBOOK_LABEL_OFFSET,
  PLAYBOOK_SYMBOL_SIZE,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  YARD_NUMBER_SIDELINE_INSET,
} from '../../constants/field'
import { LOS_VIEW_Y } from '../../constants/field'
import type { Block } from '../../types/block'
import type { Motion, MotionType } from '../../types/motion'
import type { Defender, DefenderLabel } from '../../types/defender'
import type { DefenderRoute } from '../../types/defenderRoute'
import type { DriveStartYardLine } from '../../types/driveStart'
import type { Player, PlayerLabel, Position } from '../../types/player'
import { clampPosition } from '../../types/player'
import type { PlayerNotes } from '../../types/playerNotes'
import { playerHasNotes } from '../../types/playerNotes'
import type { PlayType } from '../../types/playType'
import type { Route } from '../../types/route'
import {
  canDeleteDefenderRouteSegmentSelection,
  deleteDefenderRouteSegment,
  deleteEntireDefenderRoute,
  extendDefenderRouteFromAnchor,
  getDefenderAnchorVertexIndex,
  getDeletableDefenderRouteSegmentIndex,
  type DefenderRouteEditSelection,
} from '../../utils/defenderRouteEdit'
import {
  canDeleteBlockSegmentSelection,
  deleteBlockSegment,
  deleteEntireBlock,
  extendBlockFromAnchor,
  type BlockEditSelection,
} from '../../utils/blockEdit'
import {
  getFieldViewBounds,
  getHashMarks,
  getMajorYardLabels,
  getYardLines,
} from '../../utils/fieldView'
import { appendPathPoint } from '../../utils/pathUtils'
import {
  canDeleteRouteSegmentSelection,
  deleteEntireRoute,
  deleteRouteSegment,
  extendRouteFromAnchor,
  getAnchorVertexIndex,
  getDeletableRouteSegmentIndex,
  type RouteEditSelection,
} from '../../utils/routeEdit'
import { motionToRoute, routeToMotion } from '../../utils/motionEdit'
import { BlockLine } from '../BlockLine/BlockLine'
import { MotionLine } from '../MotionLine/MotionLine'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import type { DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import { PlayerMarker } from '../PlayerMarker/PlayerMarker'
import { RouteLine } from '../RouteLine/RouteLine'
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
  players: Player[]
  defenders: Defender[]
  routes: Route[]
  defenderRoutes: DefenderRoute[]
  blocks: Block[]
  motions: Motion[]
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
  onRouteComplete: (route: Route) => void
  onDefenderRouteComplete: (route: DefenderRoute) => void
  onBlockComplete: (block: Block) => void
  onMotionComplete: (motion: Motion) => void
}

type RouteDragState = {
  playerId: PlayerLabel
  anchorVertexIndex: number
  dragPoints: Position[]
  screenX: number
  screenY: number
  startedDrag: boolean
}

type FreehandDraft = {
  playerId: PlayerLabel
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

export function Field({
  playType,
  viewOnly = false,
  players,
  defenders,
  routes,
  defenderRoutes,
  blocks,
  motions,
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
  onRouteComplete,
  onDefenderRouteComplete,
  onBlockComplete,
  onMotionComplete,
}: FieldProps) {
  const offenseEditable = !viewOnly && playType === 'offensive'
  const defenseEditable = !viewOnly && playType === 'defensive'
  const routesEditable = offenseEditable
  const motionsEditable = offenseEditable
  const blocksEditable = offenseEditable
  const defenderRoutesEditable = defenseEditable
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
  const [deleteEntireRouteOpen, setDeleteEntireRouteOpen] = useState(false)
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
  const yardLines = useMemo(() => getYardLines(), [])
  const hashMarks = useMemo(() => getHashMarks(), [])
  const yardLabels = useMemo(
    () => getMajorYardLabels(viewBounds),
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
      y: svgPoint.y - FIELD_PADDING_TOP,
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

  const getRouteForPlayer = useCallback(
    (playerId: PlayerLabel): Route => {
      return routes.find((entry) => entry.playerId === playerId) ?? { playerId, points: [] }
    },
    [routes],
  )

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

  const getMotionForPlayer = useCallback(
    (playerId: PlayerLabel): Motion => {
      return (
        motions.find((entry) => entry.playerId === playerId) ?? {
          playerId,
          motionType: motionTypeRef.current,
          points: [],
        }
      )
    },
    [motions],
  )

  const getBlockForPlayer = useCallback(
    (playerId: PlayerLabel): Block => {
      return blocks.find((entry) => entry.playerId === playerId) ?? { playerId, points: [] }
    },
    [blocks],
  )

  const resolveDrawAnchor = useCallback((): {
    playerId: PlayerLabel
    vertexIndex: number
  } | null => {
    if (!routesEditable || drawingModeRef.current !== 'route') return null

    if (routeEditSelectionRef.current) {
      return {
        playerId: routeEditSelectionRef.current.playerId,
        vertexIndex: getAnchorVertexIndex(routeEditSelectionRef.current),
      }
    }

    if (!selectedPlayerId) return null

    const existing = getRouteForPlayer(selectedPlayerId)
    if (existing.points.length > 0) return null

    return { playerId: selectedPlayerId, vertexIndex: 0 }
  }, [selectedPlayerId, getRouteForPlayer, routesEditable])

  const resolveBlockDrawAnchor = useCallback((): {
    playerId: PlayerLabel
    vertexIndex: number
  } | null => {
    if (!blocksEditable || drawingModeRef.current !== 'block') return null

    if (blockEditSelectionRef.current) {
      return {
        playerId: blockEditSelectionRef.current.playerId,
        vertexIndex: getAnchorVertexIndex(blockEditSelectionRef.current),
      }
    }

    if (!selectedPlayerId) return null

    const existing = getBlockForPlayer(selectedPlayerId)
    if (existing.points.length > 0) return null

    return { playerId: selectedPlayerId, vertexIndex: 0 }
  }, [selectedPlayerId, getBlockForPlayer, blocksEditable])

  const resolveMotionDrawAnchor = useCallback((): {
    playerId: PlayerLabel
    vertexIndex: number
  } | null => {
    if (!motionsEditable || drawingModeRef.current !== 'motion') return null

    if (motionEditSelectionRef.current) {
      return {
        playerId: motionEditSelectionRef.current.playerId,
        vertexIndex: getAnchorVertexIndex(motionEditSelectionRef.current),
      }
    }

    if (!selectedPlayerId) return null

    const existing = getMotionForPlayer(selectedPlayerId)
    if (existing.points.length > 0) return null

    return { playerId: selectedPlayerId, vertexIndex: 0 }
  }, [selectedPlayerId, getMotionForPlayer, motionsEditable])

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

  const commitRouteExtension = useCallback(
    (playerId: PlayerLabel, anchorVertexIndex: number, newPoints: Position[]) => {
      if (newPoints.length === 0) return

      const existing = getRouteForPlayer(playerId)
      const updated = extendRouteFromAnchor(existing, anchorVertexIndex, newPoints)
      onRouteComplete(updated)

      setRouteEditSelection({
        playerId,
        kind: 'vertex',
        vertexIndex: updated.points.length,
      })
    },
    [getRouteForPlayer, onRouteComplete],
  )

  const commitMotionExtension = useCallback(
    (playerId: PlayerLabel, anchorVertexIndex: number, newPoints: Position[]) => {
      if (newPoints.length === 0) return

      const existing = getMotionForPlayer(playerId)
      const updatedRoute = extendRouteFromAnchor(motionToRoute(existing), anchorVertexIndex, newPoints)
      const updated = routeToMotion(updatedRoute, motionTypeRef.current)
      onMotionComplete(updated)

      setMotionEditSelection({
        playerId,
        kind: 'vertex',
        vertexIndex: updated.points.length,
      })
    },
    [getMotionForPlayer, onMotionComplete],
  )

  const commitBlockExtension = useCallback(
    (playerId: PlayerLabel, anchorVertexIndex: number, newPoints: Position[]) => {
      if (newPoints.length === 0) return

      const existing = getBlockForPlayer(playerId)
      const updated = extendBlockFromAnchor(existing, anchorVertexIndex, newPoints)
      onBlockComplete(updated)

      setBlockEditSelection({
        playerId,
        kind: 'vertex',
        vertexIndex: updated.points.length,
      })
    },
    [getBlockForPlayer, onBlockComplete],
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

    const route = routes.find((entry) => entry.playerId === selected.playerId)
    if (!route) {
      clearRouteEditSelection()
      return
    }

    const updated = deleteRouteSegment(route, segmentIndex)
    onRouteComplete(updated)

    if (updated.points.length === 0) {
      clearRouteEditSelection()
      return
    }

    if (selected.kind === 'vertex') {
      const nextVertexIndex = Math.min(selected.vertexIndex, updated.points.length)
      setRouteEditSelection({
        playerId: selected.playerId,
        kind: 'vertex',
        vertexIndex: nextVertexIndex,
      })
      return
    }

    const nextSegmentIndex = Math.min(segmentIndex, updated.points.length - 1)
    setRouteEditSelection({
      playerId: selected.playerId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [routes, onRouteComplete, clearRouteEditSelection])

  const executeDeleteEntireRoute = useCallback(() => {
    const playerId = routeEditSelectionRef.current?.playerId ?? selectedPlayerId
    if (!playerId || !routesEditable) return

    const route = routes.find((entry) => entry.playerId === playerId)
    if (!route || route.points.length === 0) return

    onRouteComplete(deleteEntireRoute(route))
    clearRouteEditSelection()
    setDeleteEntireRouteOpen(false)
  }, [selectedPlayerId, routes, routesEditable, onRouteComplete, clearRouteEditSelection])

  const requestDeleteEntireRoute = useCallback(() => {
    const playerId = routeEditSelectionRef.current?.playerId ?? selectedPlayerId
    if (!playerId || !routesEditable) return

    const route = routes.find((entry) => entry.playerId === playerId)
    if (!route || route.points.length === 0) return

    setDeleteEntireRouteOpen(true)
  }, [selectedPlayerId, routes, routesEditable])

  const deleteSelectedMotionSegment = useCallback(() => {
    const selected = motionEditSelectionRef.current
    if (!selected || motionDragRef.current) return

    const segmentIndex = getDeletableRouteSegmentIndex(selected)
    if (segmentIndex === null) return

    const motion = motions.find((entry) => entry.playerId === selected.playerId)
    if (!motion) {
      clearMotionEditSelection()
      return
    }

    const updatedRoute = deleteRouteSegment(motionToRoute(motion), segmentIndex)
    const updated = routeToMotion(updatedRoute, motion.motionType)
    onMotionComplete(updated)

    if (updated.points.length === 0) {
      clearMotionEditSelection()
      return
    }

    if (selected.kind === 'vertex') {
      const nextVertexIndex = Math.min(selected.vertexIndex, updated.points.length)
      setMotionEditSelection({
        playerId: selected.playerId,
        kind: 'vertex',
        vertexIndex: nextVertexIndex,
      })
      return
    }

    const nextSegmentIndex = Math.min(segmentIndex, updated.points.length - 1)
    setMotionEditSelection({
      playerId: selected.playerId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [motions, onMotionComplete, clearMotionEditSelection])

  const executeDeleteEntireMotion = useCallback(() => {
    const playerId = motionEditSelectionRef.current?.playerId ?? selectedPlayerId
    if (!playerId || !motionsEditable) return

    const motion = motions.find((entry) => entry.playerId === playerId)
    if (!motion || motion.points.length === 0) return

    onMotionComplete(routeToMotion(deleteEntireRoute(motionToRoute(motion)), motion.motionType))
    clearMotionEditSelection()
    setDeleteEntireMotionOpen(false)
  }, [selectedPlayerId, motions, motionsEditable, onMotionComplete, clearMotionEditSelection])

  const requestDeleteEntireMotion = useCallback(() => {
    const playerId = motionEditSelectionRef.current?.playerId ?? selectedPlayerId
    if (!playerId || !motionsEditable) return

    const motion = motions.find((entry) => entry.playerId === playerId)
    if (!motion || motion.points.length === 0) return

    setDeleteEntireMotionOpen(true)
  }, [selectedPlayerId, motions, motionsEditable])

  const deleteSelectedBlockSegment = useCallback(() => {
    const selected = blockEditSelectionRef.current
    if (!selected || blockDragRef.current) return

    const segmentIndex = getDeletableRouteSegmentIndex(selected)
    if (segmentIndex === null) return

    const block = blocks.find((entry) => entry.playerId === selected.playerId)
    if (!block) {
      clearBlockEditSelection()
      return
    }

    const updated = deleteBlockSegment(block, segmentIndex)
    onBlockComplete(updated)

    if (updated.points.length === 0) {
      clearBlockEditSelection()
      return
    }

    if (selected.kind === 'vertex') {
      const nextVertexIndex = Math.min(selected.vertexIndex, updated.points.length)
      setBlockEditSelection({
        playerId: selected.playerId,
        kind: 'vertex',
        vertexIndex: nextVertexIndex,
      })
      return
    }

    const nextSegmentIndex = Math.min(segmentIndex, updated.points.length - 1)
    setBlockEditSelection({
      playerId: selected.playerId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [blocks, onBlockComplete, clearBlockEditSelection])

  const executeDeleteEntireBlock = useCallback(() => {
    const playerId = blockEditSelectionRef.current?.playerId ?? selectedPlayerId
    if (!playerId || !blocksEditable) return

    const block = blocks.find((entry) => entry.playerId === playerId)
    if (!block || block.points.length === 0) return

    onBlockComplete(deleteEntireBlock(block))
    clearBlockEditSelection()
    setDeleteEntireBlockOpen(false)
  }, [selectedPlayerId, blocks, blocksEditable, onBlockComplete, clearBlockEditSelection])

  const requestDeleteEntireBlock = useCallback(() => {
    const playerId = blockEditSelectionRef.current?.playerId ?? selectedPlayerId
    if (!playerId || !blocksEditable) return

    const block = blocks.find((entry) => entry.playerId === playerId)
    if (!block || block.points.length === 0) return

    setDeleteEntireBlockOpen(true)
  }, [selectedPlayerId, blocks, blocksEditable])

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

  const toggleBlockSegmentSelection = useCallback((playerId: PlayerLabel, segmentIndex: number) => {
    setBlockEditSelection((current) => {
      if (
        current?.playerId === playerId &&
        current.kind === 'segment' &&
        current.segmentIndex === segmentIndex
      ) {
        return null
      }
      return { playerId, kind: 'segment', segmentIndex }
    })
  }, [])

  const toggleBlockVertexSelection = useCallback((playerId: PlayerLabel, vertexIndex: number) => {
    setBlockEditSelection((current) => {
      if (
        current?.playerId === playerId &&
        current.kind === 'vertex' &&
        current.vertexIndex === vertexIndex
      ) {
        return null
      }
      return { playerId, kind: 'vertex', vertexIndex }
    })
  }, [])

  const toggleSegmentSelection = useCallback(
    (playerId: PlayerLabel, segmentIndex: number) => {
      setRouteEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.kind === 'segment' &&
          current.segmentIndex === segmentIndex
        ) {
          return null
        }
        return { playerId, kind: 'segment', segmentIndex }
      })
    },
    [],
  )

  const toggleVertexSelection = useCallback((playerId: PlayerLabel, vertexIndex: number) => {
    setRouteEditSelection((current) => {
      if (
        current?.playerId === playerId &&
        current.kind === 'vertex' &&
        current.vertexIndex === vertexIndex
      ) {
        return null
      }
      return { playerId, kind: 'vertex', vertexIndex }
    })
  }, [])

  const toggleMotionSegmentSelection = useCallback(
    (playerId: PlayerLabel, segmentIndex: number) => {
      setMotionEditSelection((current) => {
        if (
          current?.playerId === playerId &&
          current.kind === 'segment' &&
          current.segmentIndex === segmentIndex
        ) {
          return null
        }
        return { playerId, kind: 'segment', segmentIndex }
      })
    },
    [],
  )

  const toggleMotionVertexSelection = useCallback((playerId: PlayerLabel, vertexIndex: number) => {
    setMotionEditSelection((current) => {
      if (
        current?.playerId === playerId &&
        current.kind === 'vertex' &&
        current.vertexIndex === vertexIndex
      ) {
        return null
      }
      return { playerId, kind: 'vertex', vertexIndex }
    })
  }, [])

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

  function handlePlayerPointerDown(playerId: PlayerLabel, event: React.MouseEvent) {
    event.stopPropagation()
    if (!offenseEditable) return
    event.preventDefault()
    pointerStartRef.current = { kind: 'offense', id: playerId, x: event.clientX, y: event.clientY }
  }

  function handleDefenderPointerDown(defenderId: DefenderLabel, event: React.MouseEvent) {
    event.stopPropagation()
    if (!defenseEditable) return
    event.preventDefault()
    pointerStartRef.current = { kind: 'defense', id: defenderId, x: event.clientX, y: event.clientY }
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
      target.closest('.block-path-hit')
    ) {
      return
    }

    if (drawingMode === 'route' && playType === 'offensive') {
      const anchor = resolveDrawAnchor()
      if (!anchor) {
        clearRouteEditSelection()
        return
      }

      event.preventDefault()
      routeDragRef.current = {
        playerId: anchor.playerId,
        anchorVertexIndex: anchor.vertexIndex,
        dragPoints: [],
        screenX: event.clientX,
        screenY: event.clientY,
        startedDrag: false,
      }
      return
    }

    if (drawingMode === 'motion' && playType === 'offensive') {
      const anchor = resolveMotionDrawAnchor()
      if (!anchor) {
        clearMotionEditSelection()
        return
      }

      event.preventDefault()
      motionDragRef.current = {
        playerId: anchor.playerId,
        anchorVertexIndex: anchor.vertexIndex,
        dragPoints: [],
        screenX: event.clientX,
        screenY: event.clientY,
        startedDrag: false,
      }
      return
    }

    if (drawingMode === 'route' && playType === 'defensive') {
      const anchor = resolveDefenderDrawAnchor()
      if (!anchor) {
        clearDefenderRouteEditSelection()
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
        return
      }

      event.preventDefault()
      blockDragRef.current = {
        playerId: anchor.playerId,
        anchorVertexIndex: anchor.vertexIndex,
        dragPoints: [],
        screenX: event.clientX,
        screenY: event.clientY,
        startedDrag: false,
      }
    }
  }

  useEffect(() => {
    clearRouteDrag()
    clearMotionDrag()
    clearBlockDrag()
    clearDefenderRouteDrag()
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

      const routeDrag = routeDragRef.current
      const motionDrag = motionDragRef.current
      const blockDrag = blockDragRef.current

      if (
        drawingModeRef.current === 'route' &&
        playType === 'offensive' &&
        routeDrag &&
        !dragging
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
            anchorVertexIndex: routeDrag.anchorVertexIndex,
            points: routeDrag.dragPoints,
          })
        }
      }

      if (
        drawingModeRef.current === 'motion' &&
        playType === 'offensive' &&
        motionDrag &&
        !dragging
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
            anchorVertexIndex: motionDrag.anchorVertexIndex,
            points: motionDrag.dragPoints,
          })
        }
      }

      if (
        drawingModeRef.current === 'block' &&
        playType === 'offensive' &&
        blockDrag &&
        !dragging
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
        !dragging
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
            commitRouteExtension(routeDrag.playerId, routeDrag.anchorVertexIndex, [position])
          }
        } else if (routeDrag.dragPoints.length > 0) {
          commitRouteExtension(
            routeDrag.playerId,
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
            commitMotionExtension(motionDrag.playerId, motionDrag.anchorVertexIndex, [position])
          }
        } else if (motionDrag.dragPoints.length > 0) {
          commitMotionExtension(
            motionDrag.playerId,
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
            commitBlockExtension(blockDrag.playerId, blockDrag.anchorVertexIndex, [position])
          }
        } else if (blockDrag.dragPoints.length > 0) {
          commitBlockExtension(
            blockDrag.playerId,
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

      draggingTargetRef.current = null
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
            const playerId = routeEditSelectionRef.current?.playerId ?? selectedPlayerId
            const route = playerId
              ? routes.find((entry) => entry.playerId === playerId)
              : undefined

            if (route && route.points.length > 0) {
              event.preventDefault()
              setDeleteEntireRouteOpen(true)
            }
          } else if (
            playType === 'offensive' &&
            drawingModeRef.current === 'motion' &&
            motionsEditable &&
            !motionDragRef.current
          ) {
            const playerId = motionEditSelectionRef.current?.playerId ?? selectedPlayerId
            const motion = playerId
              ? motions.find((entry) => entry.playerId === playerId)
              : undefined

            if (motion && motion.points.length > 0) {
              event.preventDefault()
              setDeleteEntireMotionOpen(true)
            }
          } else if (
            playType === 'offensive' &&
            drawingModeRef.current === 'block' &&
            blocksEditable &&
            !blockDragRef.current
          ) {
            const playerId = blockEditSelectionRef.current?.playerId ?? selectedPlayerId
            const block = playerId
              ? blocks.find((entry) => entry.playerId === playerId)
              : undefined

            if (block && block.points.length > 0) {
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
    onRouteComplete,
    onBlockComplete,
    onSelectPlayer,
    onSelectDefender,
    routes,
    selectedPlayerId,
    routesEditable,
    deleteSelectedRouteSegment,
    deleteSelectedBlockSegment,
    deleteSelectedMotionSegment,
    deleteSelectedDefenderRouteSegment,
    clearRouteDrag,
    clearMotionDrag,
    clearBlockDrag,
    clearDefenderRouteDrag,
    commitRouteExtension,
    commitBlockExtension,
    commitMotionExtension,
    commitDefenderRouteExtension,
    motions,
    blocks,
    blocksEditable,
    defenderRoutes,
    defenderRoutesEditable,
    selectedDefenderId,
  ])

  const freehandRouteForDisplay = useMemo(() => {
    if (!freehandDraft) return null

    const playerPosition = getPlayerPosition(freehandDraft.playerId)
    const existing = getRouteForPlayer(freehandDraft.playerId)
    return {
      playerId: freehandDraft.playerId,
      points: extendRouteFromAnchor(
        existing,
        freehandDraft.anchorVertexIndex,
        freehandDraft.points,
      ).points,
      playerPosition,
    }
  }, [freehandDraft, getRouteForPlayer, players])

  const freehandBlockForDisplay = useMemo(() => {
    if (!blockFreehandDraft) return null

    const playerPosition = getPlayerPosition(blockFreehandDraft.playerId)
    const existing = getBlockForPlayer(blockFreehandDraft.playerId)
    return {
      playerId: blockFreehandDraft.playerId,
      points: extendBlockFromAnchor(
        existing,
        blockFreehandDraft.anchorVertexIndex,
        blockFreehandDraft.points,
      ).points,
      playerPosition,
    }
  }, [blockFreehandDraft, getBlockForPlayer, players])

  const freehandMotionForDisplay = useMemo(() => {
    if (!motionFreehandDraft) return null

    const playerPosition = getPlayerPosition(motionFreehandDraft.playerId)
    const existing = getMotionForPlayer(motionFreehandDraft.playerId)
    const updatedRoute = extendRouteFromAnchor(
      motionToRoute(existing),
      motionFreehandDraft.anchorVertexIndex,
      motionFreehandDraft.points,
    )
    return {
      playerId: motionFreehandDraft.playerId,
      motionType: motionTypeRef.current,
      points: updatedRoute.points,
      playerPosition,
    }
  }, [motionFreehandDraft, getMotionForPlayer, players, motionType])

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
      routes.find((entry) => entry.playerId === selectedPlayerId && entry.points.length > 0),
  )

  const selectedPlayerHasMotion = Boolean(
    selectedPlayerId &&
      motions.find((entry) => entry.playerId === selectedPlayerId && entry.points.length > 0),
  )

  const selectedPlayerHasBlock = Boolean(
    selectedPlayerId &&
      blocks.find((entry) => entry.playerId === selectedPlayerId && entry.points.length > 0),
  )

  const selectedDefenderHasRoute = Boolean(
    selectedDefenderId &&
      defenderRoutes.find(
        (entry) => entry.defenderId === selectedDefenderId && entry.points.length > 0,
      ),
  )

  const canDeleteEntireRoute = routesEditable && drawingMode === 'route' && selectedPlayerHasRoute
  const canDeleteRouteSegment =
    routesEditable &&
    drawingMode === 'route' &&
    canDeleteRouteSegmentSelection(routeEditSelection)
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

  return (
    <div className="field-stack">
      <ConfirmDialog
        open={deleteEntireRouteOpen}
        message="Delete this entire route?"
        variant="delete"
        confirmLabel="Delete Route"
        onConfirm={executeDeleteEntireRoute}
        onCancel={() => setDeleteEntireRouteOpen(false)}
      />
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

      {showRouteDrawControls && (
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
              onClick={requestDeleteEntireRoute}
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
        </div>
      )}

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

          <g className="field-play-area" transform={`translate(${FIELD_PADDING_LEFT}, ${FIELD_PADDING_TOP})`}>
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

            {defenders.map((defender) => (
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

            {players.map((player) => (
              <PlayerMarker
                key={player.id}
                player={player}
                isSelected={selectedPlayerId === player.id}
                hasNotes={playerHasNotes(playerNotes, player.id)}
                isLocked={!offenseEditable}
                onPointerDown={handlePlayerPointerDown}
              />
            ))}

            {blocks.map((block) => (
              <BlockLine
                key={`block-${block.playerId}`}
                playerPosition={getPlayerPosition(block.playerId)}
                block={block}
                readOnly={!blocksEditable}
                selectedSegmentIndex={
                  blockEditSelection?.playerId === block.playerId &&
                  blockEditSelection.kind === 'segment'
                    ? blockEditSelection.segmentIndex
                    : null
                }
                selectedVertexIndex={
                  blockEditSelection?.playerId === block.playerId &&
                  blockEditSelection.kind === 'vertex'
                    ? blockEditSelection.vertexIndex
                    : null
                }
                onSegmentSelect={(segmentIndex) => {
                  if (!blocksEditable || blockDragRef.current) return
                  toggleBlockSegmentSelection(block.playerId, segmentIndex)
                }}
                onVertexSelect={(vertexIndex) => {
                  if (!blocksEditable || blockDragRef.current) return
                  toggleBlockVertexSelection(block.playerId, vertexIndex)
                }}
              />
            ))}

            {motions.map((motion) => (
              <MotionLine
                key={`motion-${motion.playerId}`}
                playerPosition={getPlayerPosition(motion.playerId)}
                motion={motion}
                readOnly={!motionsEditable}
                selectedSegmentIndex={
                  motionEditSelection?.playerId === motion.playerId &&
                  motionEditSelection.kind === 'segment'
                    ? motionEditSelection.segmentIndex
                    : null
                }
                selectedVertexIndex={
                  motionEditSelection?.playerId === motion.playerId &&
                  motionEditSelection.kind === 'vertex'
                    ? motionEditSelection.vertexIndex
                    : null
                }
                onSegmentSelect={(segmentIndex) => {
                  if (!motionsEditable || motionDragRef.current) return
                  toggleMotionSegmentSelection(motion.playerId, segmentIndex)
                }}
                onVertexSelect={(vertexIndex) => {
                  if (!motionsEditable || motionDragRef.current) return
                  toggleMotionVertexSelection(motion.playerId, vertexIndex)
                }}
              />
            ))}

            {routes.map((route) => (
              <RouteLine
                key={`route-${route.playerId}`}
                playerPosition={getPlayerPosition(route.playerId)}
                route={route}
                readOnly={!routesEditable}
                selectedSegmentIndex={
                  routeEditSelection?.playerId === route.playerId &&
                  routeEditSelection.kind === 'segment'
                    ? routeEditSelection.segmentIndex
                    : null
                }
                selectedVertexIndex={
                  routeEditSelection?.playerId === route.playerId &&
                  routeEditSelection.kind === 'vertex'
                    ? routeEditSelection.vertexIndex
                    : null
                }
                onSegmentSelect={(segmentIndex) => {
                  if (!routesEditable || routeDragRef.current) return
                  toggleSegmentSelection(route.playerId, segmentIndex)
                }}
                onVertexSelect={(vertexIndex) => {
                  if (!routesEditable || routeDragRef.current) return
                  toggleVertexSelection(route.playerId, vertexIndex)
                }}
              />
            ))}

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
                playerPosition={freehandBlockForDisplay.playerPosition}
                block={{
                  playerId: freehandBlockForDisplay.playerId,
                  points: freehandBlockForDisplay.points,
                }}
                isDraft
              />
            )}

            {freehandRouteForDisplay && drawingMode === 'route' && playType === 'offensive' && (
              <RouteLine
                playerPosition={freehandRouteForDisplay.playerPosition}
                route={{
                  playerId: freehandRouteForDisplay.playerId,
                  points: freehandRouteForDisplay.points,
                }}
                isDraft
              />
            )}

            {freehandMotionForDisplay && drawingMode === 'motion' && playType === 'offensive' && (
              <MotionLine
                playerPosition={freehandMotionForDisplay.playerPosition}
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
          </g>
        </svg>
      </div>
      </div>
    </div>
  )
}
