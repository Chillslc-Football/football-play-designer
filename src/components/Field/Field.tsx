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
  deleteDefenderRouteSegment,
  extendDefenderRouteFromAnchor,
  getDefenderAnchorVertexIndex,
  type DefenderRouteEditSelection,
} from '../../utils/defenderRouteEdit'
import {
  getFieldViewBounds,
  getHashMarks,
  getMajorYardLabels,
  getYardLines,
} from '../../utils/fieldView'
import { appendPathPoint } from '../../utils/pathUtils'
import {
  deleteEntireRoute,
  deleteRouteSegment,
  extendRouteFromAnchor,
  getAnchorVertexIndex,
  type RouteEditSelection,
} from '../../utils/routeEdit'
import { BlockLine } from '../BlockLine/BlockLine'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import type { DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import { PlayerMarker } from '../PlayerMarker/PlayerMarker'
import { RouteLine } from '../RouteLine/RouteLine'
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
  playerNotes: PlayerNotes
  drawingMode: DrawingMode
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
}

type DraftPath = {
  playerId: PlayerLabel
  points: Position[]
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
  playerNotes,
  drawingMode,
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
}: FieldProps) {
  const offenseEditable = !viewOnly && playType === 'offensive'
  const defenseEditable = !viewOnly && playType === 'defensive'
  const routesEditable = offenseEditable
  const defenderRoutesEditable = defenseEditable
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingTargetRef = useRef<DragTarget | null>(null)
  const draftPathRef = useRef<DraftPath | null>(null)
  const drawingModeRef = useRef<DrawingMode>(drawingMode)
  const pointerStartRef = useRef<(DragTarget & { x: number; y: number }) | null>(null)
  const routeDragRef = useRef<RouteDragState | null>(null)
  const routeEditSelectionRef = useRef<RouteEditSelection | null>(null)
  const defenderRouteDragRef = useRef<DefenderRouteDragState | null>(null)
  const defenderRouteEditSelectionRef = useRef<DefenderRouteEditSelection | null>(null)

  const [draftPath, setDraftPath] = useState<DraftPath | null>(null)
  const [freehandDraft, setFreehandDraft] = useState<FreehandDraft | null>(null)
  const [routeEditSelection, setRouteEditSelection] = useState<RouteEditSelection | null>(null)
  const [defenderFreehandDraft, setDefenderFreehandDraft] = useState<DefenderFreehandDraft | null>(
    null,
  )
  const [defenderRouteEditSelection, setDefenderRouteEditSelection] =
    useState<DefenderRouteEditSelection | null>(null)
  const [deleteEntireRouteOpen, setDeleteEntireRouteOpen] = useState(false)

  routeEditSelectionRef.current = routeEditSelection
  defenderRouteEditSelectionRef.current = defenderRouteEditSelection

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
    if (!selected || selected.kind !== 'segment' || routeDragRef.current) return

    const route = routes.find((entry) => entry.playerId === selected.playerId)
    if (!route) {
      clearRouteEditSelection()
      return
    }

    const updated = deleteRouteSegment(route, selected.segmentIndex)
    onRouteComplete(updated)

    if (updated.points.length === 0) {
      clearRouteEditSelection()
      return
    }

    const nextSegmentIndex = Math.min(selected.segmentIndex, updated.points.length - 1)
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

  const deleteSelectedDefenderRouteSegment = useCallback(() => {
    const selected = defenderRouteEditSelectionRef.current
    if (!selected || selected.kind !== 'segment' || defenderRouteDragRef.current) return

    const route = defenderRoutes.find((entry) => entry.defenderId === selected.defenderId)
    if (!route) {
      clearDefenderRouteEditSelection()
      return
    }

    const updated = deleteDefenderRouteSegment(route, selected.segmentIndex)
    onDefenderRouteComplete(updated)

    if (updated.points.length === 0) {
      clearDefenderRouteEditSelection()
      return
    }

    const nextSegmentIndex = Math.min(selected.segmentIndex, updated.points.length - 1)
    setDefenderRouteEditSelection({
      defenderId: selected.defenderId,
      kind: 'segment',
      segmentIndex: nextSegmentIndex,
    })
  }, [defenderRoutes, onDefenderRouteComplete, clearDefenderRouteEditSelection])

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
      target.closest('.route-segment-group') ||
      target.closest('.route-vertex-handle-hit') ||
      target.closest('.route-path-hit')
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

    if (!offenseEditable || !selectedPlayerId) return

    event.preventDefault()
    clearRouteEditSelection()
    const position = getSvgPosition(event.clientX, event.clientY)
    const nextDraft = { playerId: selectedPlayerId, points: [position] }
    draftPathRef.current = nextDraft
    setDraftPath(nextDraft)
  }

  useEffect(() => {
    clearRouteDrag()
    clearDefenderRouteDrag()
    clearRouteEditSelection()
    clearDefenderRouteEditSelection()
  }, [
    drawingMode,
    selectedPlayerId,
    selectedDefenderId,
    playType,
    clearRouteDrag,
    clearDefenderRouteDrag,
    clearRouteEditSelection,
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

      const blockDraft = draftPathRef.current
      if (blockDraft && drawingModeRef.current === 'block' && offenseEditable) {
        const position = getSvgPosition(event.clientX, event.clientY)
        const updated = {
          ...blockDraft,
          points: appendPathPoint(blockDraft.points, position),
        }
        draftPathRef.current = updated
        setDraftPath(updated)
      }
    }

    function handleMouseUp(event: MouseEvent) {
      const pointerStart = pointerStartRef.current
      if (pointerStart?.kind === 'offense' && offenseEditable) {
        onSelectPlayer(pointerStart.id)
        clearRouteEditSelection()
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
      } else if (drawingModeRef.current === 'block' && offenseEditable) {
        const completed = draftPathRef.current
        if (completed && completed.points.length > 0) {
          onBlockComplete(completed)
          draftPathRef.current = null
          setDraftPath(null)
        }
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
          if (playType === 'offensive' && routesEditable && !routeDragRef.current) {
            const playerId = routeEditSelectionRef.current?.playerId ?? selectedPlayerId
            const route = playerId
              ? routes.find((entry) => entry.playerId === playerId)
              : undefined

            if (route && route.points.length > 0) {
              event.preventDefault()
              setDeleteEntireRouteOpen(true)
            }
          }
          return
        }

        if (
          playType === 'offensive' &&
          routeEditSelectionRef.current?.kind === 'segment' &&
          !routeDragRef.current
        ) {
          event.preventDefault()
          deleteSelectedRouteSegment()
        } else if (
          playType === 'defensive' &&
          defenderRouteEditSelectionRef.current?.kind === 'segment' &&
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
    deleteSelectedDefenderRouteSegment,
    clearRouteDrag,
    clearDefenderRouteDrag,
    commitRouteExtension,
    commitDefenderRouteExtension,
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

  const canDeleteEntireRoute = routesEditable && selectedPlayerHasRoute

  const hintText = (() => {
    if (playType === 'offensive' && selectedPlayerId) {
      if (drawingMode === 'block') {
        return `${selectedPlayerId} selected — drag on the field to draw a blocking assignment`
      }
      if (routeEditSelection?.kind === 'segment') {
        return 'Segment selected — Delete removes segment, Shift+Delete removes entire route'
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
      if (defenderRouteEditSelection) {
        return 'Extend movement from selected point — click or drag on the field'
      }
      return `${selectedDefenderId} selected — click the field to start a movement`
    }

    return null
  })()

  const leftSidelineX = YARD_NUMBER_SIDELINE_INSET
  const rightSidelineX = FIELD_WIDTH - YARD_NUMBER_SIDELINE_INSET

  return (
    <div className="field-container">
      <ConfirmDialog
        open={deleteEntireRouteOpen}
        message="Delete this entire route?"
        variant="delete"
        confirmLabel="Delete Route"
        onConfirm={executeDeleteEntireRoute}
        onCancel={() => setDeleteEntireRouteOpen(false)}
      />

      {(hintText || canDeleteEntireRoute) && (
        <div className="route-draw-controls">
          {hintText && <span className="route-draw-hint">{hintText}</span>}
          {canDeleteEntireRoute && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={requestDeleteEntireRoute}
            >
              Delete Entire Route
            </button>
          )}
        </div>
      )}

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

            {draftPath && drawingMode === 'block' && offenseEditable && (
              <BlockLine
                playerPosition={getPlayerPosition(draftPath.playerId)}
                block={draftPath}
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
  )
}
