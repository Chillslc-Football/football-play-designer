import { useEffect, useState } from 'react'
import * as filmShareRepository from '../repositories/filmShareRepository'
import type { FilmPublicPlaybackResult } from '../repositories/filmShareRepository'
import { getFilmShareTokenFromUrl } from '../utils/filmShareToken'
import './FilmSharePage.css'

function FilmUnavailable() {
  return (
    <div className="film-share-page film-share-page--centered">
      <div className="film-share-card">
        <h1>Film not available.</h1>
        <p className="film-share-message">
          This link may be invalid, expired, or sharing has been turned off.
        </p>
      </div>
    </div>
  )
}

function FilmPlayback({ result }: { result: Exclude<FilmPublicPlaybackResult, { kind: 'unavailable' }> }) {
  if (result.kind === 'playback') {
    return (
      <div className="film-share-page film-share-page--playback">
        <div className="film-share-layout">
          <header className="film-share-header">
            <h1>Shared film</h1>
          </header>
          <div className="film-share-player">
            <video className="film-share-video" controls playsInline preload="metadata" src={result.url} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="film-share-page film-share-page--centered">
      <div className="film-share-card">
        <h1>Shared film</h1>
        <p className="film-share-message">This film opens on an external site.</p>
        <div className="film-share-actions">
          <a
            className="btn btn-primary"
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Film
          </a>
        </div>
      </div>
    </div>
  )
}

export function FilmSharePage() {
  const [shareToken] = useState(() => getFilmShareTokenFromUrl())
  const [result, setResult] = useState<FilmPublicPlaybackResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPlayback() {
      if (!shareToken) {
        if (!cancelled) {
          setResult({ kind: 'unavailable' })
          setLoading(false)
        }
        return
      }

      const playback = await filmShareRepository.fetchFilmPublicPlayback(shareToken)

      if (!cancelled) {
        setResult(playback)
        setLoading(false)
      }
    }

    void loadPlayback()

    return () => {
      cancelled = true
    }
  }, [shareToken])

  if (loading) {
    return <div className="film-share-page film-share-page--loading">Loading film…</div>
  }

  if (!result || result.kind === 'unavailable') {
    return <FilmUnavailable />
  }

  return <FilmPlayback result={result} />
}
