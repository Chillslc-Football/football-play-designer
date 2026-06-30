import { supabase } from '../lib/supabaseClient'

export type FilmPublicPlaybackResult =
  | { kind: 'playback'; url: string }
  | { kind: 'external'; url: string }
  | { kind: 'unavailable' }

type FilmPublicPlaybackResponse = {
  playbackUrl?: unknown
  playback_url?: unknown
  externalUrl?: unknown
  external_url?: unknown
  error?: unknown
  ok?: unknown
  available?: unknown
}

function pickUrl(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

function parseFilmPublicPlaybackResponse(data: unknown): FilmPublicPlaybackResult {
  if (!data || typeof data !== 'object') {
    return { kind: 'unavailable' }
  }

  const record = data as FilmPublicPlaybackResponse

  if (record.ok === false || record.available === false) {
    return { kind: 'unavailable' }
  }

  if (typeof record.error === 'string' && record.error.trim().length > 0) {
    return { kind: 'unavailable' }
  }

  const playbackUrl = pickUrl(record.playbackUrl, record.playback_url)
  if (playbackUrl) {
    return { kind: 'playback', url: playbackUrl }
  }

  const externalUrl = pickUrl(record.externalUrl, record.external_url)
  if (externalUrl) {
    return { kind: 'external', url: externalUrl }
  }

  return { kind: 'unavailable' }
}

export async function fetchFilmPublicPlayback(
  shareToken: string,
): Promise<FilmPublicPlaybackResult> {
  const { data, error } = await supabase.functions.invoke('film-public-playback', {
    body: { shareToken },
  })

  if (error) {
    return { kind: 'unavailable' }
  }

  return parseFilmPublicPlaybackResponse(data)
}
