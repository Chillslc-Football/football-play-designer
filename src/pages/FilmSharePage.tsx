import { useCallback, useEffect, useRef, useState } from 'react'
import { useFilmGoogleCast } from '../hooks/useFilmGoogleCast'
import { canUseGoogleCastSender } from '../lib/googleCast/loadGoogleCastSdk'
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

function FilmSharePlaybackView({
  shareToken,
  initialUrl,
  title,
}: {
  shareToken: string
  initialUrl: string
  title?: string
}) {
  const [playbackUrl, setPlaybackUrl] = useState(initialUrl)
  const [castError, setCastError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const heading = title?.trim() || 'Shared film'

  const handleCastLoadFailed = useCallback(() => {
    setCastError('Playback link expired on Chromecast. Reload the film to try again.')
  }, [])

  const { buttonContainerRef, showCastButton, reloadCastMedia } = useFilmGoogleCast({
    playbackUrl,
    title,
    onCastLoadFailed: handleCastLoadFailed,
  })

  const handleVideoError = useCallback(() => {
    setCastError('Playback link expired. Reload the film to try again.')
  }, [])

  const reloadPlayback = useCallback(async () => {
    setRefreshing(true)
    setCastError(null)

    try {
      const fresh = await filmShareRepository.fetchFilmPublicPlayback(shareToken)
      if (fresh.kind !== 'playback') {
        setCastError('Film not available.')
        return
      }

      setPlaybackUrl(fresh.url)

      const video = videoRef.current
      if (video) {
        video.load()
        void video.play().catch(() => {
          // Autoplay may be blocked; controls remain available.
        })
      }

      await reloadCastMedia(fresh.url)
    } finally {
      setRefreshing(false)
    }
  }, [shareToken, reloadCastMedia])

  useEffect(() => {
    setPlaybackUrl(initialUrl)
    setCastError(null)
  }, [initialUrl])

  return (
    <div className="film-share-page film-share-page--playback">
      <div className="film-share-layout">
        <header className="film-share-header">
          <h1>{heading}</h1>
          {canUseGoogleCastSender() && showCastButton && (
            <div
              ref={buttonContainerRef}
              className="film-share-cast-button"
              aria-label="Cast to Chromecast"
            />
          )}
        </header>

        {castError && (
          <div className="film-share-cast-error" role="status">
            <p>{castError}</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={refreshing}
              onClick={() => void reloadPlayback()}
            >
              {refreshing ? 'Reloading…' : 'Reload film'}
            </button>
          </div>
        )}

        <div className="film-share-player">
          <video
            ref={videoRef}
            className="film-share-video"
            controls
            playsInline
            preload="metadata"
            src={playbackUrl}
            onError={handleVideoError}
          />
        </div>
      </div>
    </div>
  )
}

function FilmPlayback({
  shareToken,
  result,
}: {
  shareToken: string
  result: Exclude<FilmPublicPlaybackResult, { kind: 'unavailable' }>
}) {
  if (result.kind === 'playback') {
    return (
      <FilmSharePlaybackView
        shareToken={shareToken}
        initialUrl={result.url}
        title={result.title}
      />
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

  if (!result || result.kind === 'unavailable' || !shareToken) {
    return <FilmUnavailable />
  }

  return <FilmPlayback shareToken={shareToken} result={result} />
}
