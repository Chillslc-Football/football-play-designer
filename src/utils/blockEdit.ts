import type { Block } from '../types/block'
import type { Position } from '../types/player'
import type { Route } from '../types/route'
import {
  canDeleteRouteSegmentSelection,
  deleteEntireRoute,
  deleteRouteSegment,
  extendRouteFromAnchor,
  getDeletableRouteSegmentIndex,
  type RouteEditSelection,
} from './routeEdit'

export type BlockEditSelection = RouteEditSelection

export function blockToRoute(block: Block): Route {
  return { playerId: block.playerId, points: block.points }
}

export function applyRouteToBlock(route: Route, playerId: Block['playerId']): Block {
  return { playerId, points: route.points }
}

export function deleteEntireBlock(block: Block): Block {
  return applyRouteToBlock(deleteEntireRoute(blockToRoute(block)), block.playerId)
}

export function deleteBlockSegment(block: Block, segmentIndex: number): Block {
  return applyRouteToBlock(deleteRouteSegment(blockToRoute(block), segmentIndex), block.playerId)
}

export function extendBlockFromAnchor(
  block: Block,
  anchorVertexIndex: number,
  newPoints: Position[],
): Block {
  return applyRouteToBlock(
    extendRouteFromAnchor(blockToRoute(block), anchorVertexIndex, newPoints),
    block.playerId,
  )
}

export {
  canDeleteRouteSegmentSelection as canDeleteBlockSegmentSelection,
  getDeletableRouteSegmentIndex as getDeletableBlockSegmentIndex,
}
