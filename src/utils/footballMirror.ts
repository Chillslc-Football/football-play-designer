import type { Block } from '../types/block'
import type { Motion } from '../types/motion'
import type { Play } from '../types/play'
import type { Player, PlayerLabel, Position } from '../types/player'
import { mirrorDefenderRoutes, mirrorDefenders } from './defenseMirror'
import {
  ensurePlayPlayerActions,
  mirrorPlayerActionChains,
} from './playerActionChains'
import { clampPlayPositions } from './losClamp'
import {
  ALL_PLAYER_LABELS,
  createEmptyPlayerNotes,
  type PlayerNotes,
} from '../types/playerNotes'
import type { Route } from '../types/route'
import { getCenterPlayerX, mirrorPositionLaterally } from './mirror'

/**
 * Football mirror — swap the play from one side to the other WITHOUT reversing direction.
 *
 * Offense always attacks upward/north on screen (-y toward the defense).
 * Mirror flips assignments across the Center (C) laterally (x axis only).
 *
 * Step 1: Flip x around C for every position and path point (y unchanged).
 * Step 2: Swap paired player spots so LT stays left of C, RT stays right of C.
 * Step 3: Reassign routes/blocks/notes to the partner player (X→Z, LT→RT).
 * Step 4: Rename play (34↔35, Right↔Left).
 *
 * We do NOT mirror x, rotate, or invert the field — that would make the offense
 * look like it is running the wrong way.
 */

/**
 * Position pairs — left-side roles exchange assignments with right-side partners.
 *
 *   LT pull block  →  RT pull block
 *   X slant route  →  Z slant route
 *   34 hole (left) →  35 hole (right) via y-flipped path geometry
 *
 * QB, RB, FB, C keep the same label; their paths mirror laterally in place.
 */
const MIRROR_PARTNER: Record<PlayerLabel, PlayerLabel> = {
  LT: 'RT',
  RT: 'LT',
  LG: 'RG',
  RG: 'LG',
  X: 'Z',
  Z: 'X',
  QB: 'QB',
  RB: 'RB',
  FB: 'FB',
  C: 'C',
  Y: 'Y',
}

/** Returns the opposite-side partner for a position (LT→RT, X→Z, RB→RB, etc.). */
export function getMirrorPartner(label: PlayerLabel): PlayerLabel {
  return MIRROR_PARTNER[label]
}

function isSwapPair(label: PlayerLabel): boolean {
  return getMirrorPartner(label) !== label
}

/**
 * After lateral y-mirror, swap spots within tackle/guard/WR pairs so the
 * formation still reads correctly: LT left of C, RT right of C, etc.
 */
function swapPairedPositions(
  positions: Record<PlayerLabel, Position>,
): Record<PlayerLabel, Position> {
  const result = { ...positions }
  const handled = new Set<PlayerLabel>()

  for (const label of ALL_PLAYER_LABELS) {
    if (!isSwapPair(label) || handled.has(label)) continue

    const partner = getMirrorPartner(label)
    const temp = result[label]
    result[label] = result[partner]
    result[partner] = temp
    handled.add(label)
    handled.add(partner)
  }

  return result
}

/**
 * Flip path points left/right (y only), then attach to the partner player.
 * x is unchanged — the route still runs toward the defense.
 */
function mirrorAndReassignPaths<T extends { playerId: PlayerLabel; points: Position[] }>(
  paths: T[],
  centerX: number,
): T[] {
  return paths.map((path) => ({
    ...path,
    playerId: getMirrorPartner(path.playerId),
    points: path.points.map((point) => mirrorPositionLaterally(point, centerX)),
  }))
}

/** Assignment notes follow the same partner mapping as routes and blocks. */
function mirrorPlayerNotes(notes: PlayerNotes): PlayerNotes {
  const result = createEmptyPlayerNotes()

  for (const label of ALL_PLAYER_LABELS) {
    result[label] = notes[getMirrorPartner(label)]
  }

  return result
}

/** Swap play-name tokens: 34↔35, Right↔Left, etc. */
export function mirrorPlayName(name: string): string {
  let result = name

  result = result.replace(/\b34\b/g, '__HOLE_35__')
  result = result.replace(/\b35\b/g, '34')
  result = result.replace(/__HOLE_35__/g, '35')

  result = swapWord(result, 'Right', 'Left')
  result = swapWord(result, 'right', 'left')
  result = swapWord(result, 'RIGHT', 'LEFT')

  return result
}

function swapWord(text: string, wordA: string, wordB: string): string {
  const token = `__${wordA}__`
  return text
    .replace(new RegExp(`\\b${wordA}\\b`, 'g'), token)
    .replace(new RegExp(`\\b${wordB}\\b`, 'g'), wordA)
    .replace(new RegExp(token, 'g'), wordB)
}

/**
 * Full football mirror — call this from Mirror Play.
 * Overall play notes are left unchanged.
 */
export function mirrorFootballPlay(play: Play): Play {
  const centerX = getCenterPlayerX(play.players)

  // Step 1: flip x across C (y unchanged — offense still attacks north)
  const mirroredPositions = Object.fromEntries(
    play.players.map((player) => [
      player.id,
      mirrorPositionLaterally(player.position, centerX),
    ]),
  ) as Record<PlayerLabel, Position>

  // Step 2: restore correct tackle/WR sides relative to C
  const finalPositions = swapPairedPositions(mirroredPositions)

  const players: Player[] = play.players.map((player) => ({
    ...player,
    position: finalPositions[player.id],
  }))

  const routes: Route[] = mirrorAndReassignPaths(play.routes, centerX)
  const blocks: Block[] = mirrorAndReassignPaths(play.blocks, centerX)
  const motions: Motion[] = mirrorAndReassignPaths(play.motions ?? [], centerX)
  const playerActions = mirrorPlayerActionChains(
    play.playerActions ?? {},
    centerX,
  )
  const playerNotes = mirrorPlayerNotes(play.playerNotes)

  const mirrored: Play = {
    ...play,
    mirrored: !play.mirrored,
    name: mirrorPlayName(play.name),
    players,
    defenders: mirrorDefenders(play.defenders, players),
    routes,
    blocks,
    motions,
    playerActions,
    defenderRoutes: mirrorDefenderRoutes(play.defenderRoutes, centerX),
    playerNotes,
    notes: play.notes,
  }

  return ensurePlayPlayerActions(clampPlayPositions(mirrored))
}
