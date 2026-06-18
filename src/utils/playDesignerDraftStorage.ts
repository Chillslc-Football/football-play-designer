import type { Play } from '../types/play'

export const PLAY_DESIGNER_DRAFT_VERSION = 1 as const
export const PLAY_DESIGNER_DRAFT_DEBOUNCE_MS = 500

const DRAFT_KEY_PREFIX = 'football-play-designer-draft'

export type PlayDesignerDraft = {
  version: typeof PLAY_DESIGNER_DRAFT_VERSION
  userId: string
  activeTeamId: string
  play: Play
  activeSavedPlayId: string | null
  selectedLoadId: string
  playBaseline: string
  savedAt: number
}

export type PlayDesignerDraftInput = Omit<PlayDesignerDraft, 'version' | 'savedAt'>

export function getPlayDesignerDraftKey(userId: string, activeTeamId: string): string {
  return `${DRAFT_KEY_PREFIX}:${userId}:${activeTeamId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isPlayShape(value: unknown): value is Play {
  if (!isRecord(value)) return false

  return (
    isNonEmptyString(value.id) &&
    typeof value.name === 'string' &&
    typeof value.notes === 'string' &&
    isNonEmptyString(value.formationId) &&
    typeof value.formationName === 'string' &&
    isNonEmptyString(value.frontId) &&
    typeof value.frontName === 'string' &&
    Array.isArray(value.players) &&
    Array.isArray(value.defenders) &&
    Array.isArray(value.routes) &&
    Array.isArray(value.blocks) &&
    Array.isArray(value.motions) &&
    isRecord(value.playerActions) &&
    Array.isArray(value.defenderRoutes) &&
    isRecord(value.playerNotes) &&
    Array.isArray(value.categories) &&
    typeof value.mirrored === 'boolean' &&
    typeof value.playType === 'string'
  )
}

export function validatePlayDesignerDraft(
  parsed: unknown,
  userId: string,
  activeTeamId: string,
): PlayDesignerDraft | null {
  if (!isRecord(parsed)) return null
  if (parsed.version !== PLAY_DESIGNER_DRAFT_VERSION) return null
  if (parsed.userId !== userId || parsed.activeTeamId !== activeTeamId) return null
  if (typeof parsed.playBaseline !== 'string') return null
  if (typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt)) return null
  if (parsed.activeSavedPlayId !== null && typeof parsed.activeSavedPlayId !== 'string') {
    return null
  }
  if (typeof parsed.selectedLoadId !== 'string') return null
  if (!isPlayShape(parsed.play)) return null

  return parsed as PlayDesignerDraft
}

export function readPlayDesignerDraft(
  userId: string | null,
  activeTeamId: string | null,
): PlayDesignerDraft | null {
  if (!userId || !activeTeamId) return null

  const key = getPlayDesignerDraftKey(userId, activeTeamId)
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    const draft = validatePlayDesignerDraft(parsed, userId, activeTeamId)
    if (!draft) {
      sessionStorage.removeItem(key)
      return null
    }

    return draft
  } catch {
    try {
      sessionStorage.removeItem(key)
    } catch {
      // sessionStorage may be unavailable
    }
    return null
  }
}

export function writePlayDesignerDraft(input: PlayDesignerDraftInput): void {
  const draft: PlayDesignerDraft = {
    version: PLAY_DESIGNER_DRAFT_VERSION,
    savedAt: Date.now(),
    ...input,
  }

  try {
    sessionStorage.setItem(
      getPlayDesignerDraftKey(input.userId, input.activeTeamId),
      JSON.stringify(draft),
    )
  } catch {
    // ignore quota / private mode errors
  }
}

export function clearPlayDesignerDraft(
  userId: string | null,
  activeTeamId: string | null,
): void {
  if (!userId || !activeTeamId) return

  try {
    sessionStorage.removeItem(getPlayDesignerDraftKey(userId, activeTeamId))
  } catch {
    // ignore
  }
}
