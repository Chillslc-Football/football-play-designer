import { useCallback, useEffect, useRef, useState } from 'react'
import { loadFilmOnCastSession } from '../lib/googleCast/castFilmMedia'
import {
  canUseGoogleCastSender,
  initializeGoogleCast,
  loadGoogleCastSdk,
} from '../lib/googleCast/loadGoogleCastSdk'

type UseFilmGoogleCastOptions = {
  playbackUrl: string
  title?: string
  onCastLoadFailed?: () => void
}

export function useFilmGoogleCast({
  playbackUrl,
  title,
  onCastLoadFailed,
}: UseFilmGoogleCastOptions) {
  const [castUiReady, setCastUiReady] = useState(false)
  const [castDevicesAvailable, setCastDevicesAvailable] = useState(false)
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  const playbackUrlRef = useRef(playbackUrl)
  const titleRef = useRef(title)
  const onCastLoadFailedRef = useRef(onCastLoadFailed)

  playbackUrlRef.current = playbackUrl
  titleRef.current = title
  onCastLoadFailedRef.current = onCastLoadFailed

  const loadCurrentMedia = useCallback(async (session: cast.framework.CastSession) => {
    try {
      await loadFilmOnCastSession(session, playbackUrlRef.current, titleRef.current)
    } catch {
      onCastLoadFailedRef.current?.()
    }
  }, [])

  useEffect(() => {
    if (!canUseGoogleCastSender()) return

    let cancelled = false
    let sessionHandler: ((event: { sessionState?: cast.framework.SessionState }) => void) | undefined
    let castStateHandler: (() => void) | undefined

    void loadGoogleCastSdk().then((loaded) => {
      if (cancelled || !loaded || !initializeGoogleCast()) return

      const castContext = cast.framework.CastContext.getInstance()

      const updateCastAvailability = () => {
        const castState = castContext.getCastState()
        setCastDevicesAvailable(castState !== cast.framework.CastState.NO_DEVICES_AVAILABLE)
      }

      sessionHandler = (event) => {
        if (event.sessionState !== cast.framework.SessionState.SESSION_STARTED) return

        const session = castContext.getCurrentSession()
        if (!session) return

        void loadCurrentMedia(session)
      }

      castStateHandler = updateCastAvailability

      castContext.addEventListener(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        sessionHandler,
      )
      castContext.addEventListener(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        castStateHandler,
      )

      updateCastAvailability()
      setCastUiReady(true)
    })

    return () => {
      cancelled = true

      if (!castUiReady && !sessionHandler && !castStateHandler) return

      try {
        const castContext = cast.framework.CastContext.getInstance()
        if (sessionHandler) {
          castContext.removeEventListener(
            cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            sessionHandler,
          )
        }
        if (castStateHandler) {
          castContext.removeEventListener(
            cast.framework.CastContextEventType.CAST_STATE_CHANGED,
            castStateHandler,
          )
        }
      } catch {
        // Cast framework may not have initialized.
      }
    }
  }, [loadCurrentMedia])

  useEffect(() => {
    if (!castUiReady || !castDevicesAvailable || !buttonContainerRef.current) return

    const castButton = new cast.framework.ui.CastButton(buttonContainerRef.current)

    return () => {
      buttonContainerRef.current?.replaceChildren()
      void castButton
    }
  }, [castUiReady, castDevicesAvailable])

  const reloadCastMedia = useCallback(async (urlOverride?: string) => {
    if (!castUiReady) return false

    const session = cast.framework.CastContext.getInstance().getCurrentSession()
    if (!session) return false

    try {
      await loadFilmOnCastSession(
        session,
        urlOverride ?? playbackUrlRef.current,
        titleRef.current,
      )
      return true
    } catch {
      onCastLoadFailedRef.current?.()
      return false
    }
  }, [castUiReady])

  return {
    buttonContainerRef,
    showCastButton: castUiReady && castDevicesAvailable,
    reloadCastMedia,
  }
}
