import type { Play } from '../types/play'
import { normalizePlayName } from './playStorage'

/** Stable snapshot of play content for unsaved-change detection (excludes id and createdAt). */
export function playToComparable(play: Play): string {
  const comparable = {
    name: normalizePlayName(play.name),
    notes: play.notes,
    formationId: play.formationId,
    formationName: play.formationName,
    frontId: play.frontId,
    frontName: play.frontName,
    opponentFormationId: play.opponentFormationId,
    opponentFormationName: play.opponentFormationName,
    driveStartYardLine: play.driveStartYardLine,
    mirrored: play.mirrored,
    playType: play.playType,
    players: play.players,
    defenders: play.defenders,
    routes: play.routes,
    blocks: play.blocks,
    motions: play.motions,
    defenderRoutes: play.defenderRoutes,
    playerNotes: play.playerNotes,
    categories: [...play.categories].sort(),
  }

  return JSON.stringify(comparable)
}

export function playsAreEqual(a: Play, b: Play): boolean {
  return playToComparable(a) === playToComparable(b)
}
