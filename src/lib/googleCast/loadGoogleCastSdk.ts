const CAST_SENDER_SDK_URL =
  'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1'

let loadPromise: Promise<boolean> | null = null

export function canUseGoogleCastSender(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent
  if (/Firefox/i.test(userAgent)) return false
  if (/Safari/i.test(userAgent) && !/Chrome|Chromium|Edg/i.test(userAgent)) return false

  return true
}

function hasCastFramework(): boolean {
  return typeof cast !== 'undefined' && typeof cast.framework !== 'undefined'
}

export function loadGoogleCastSdk(): Promise<boolean> {
  if (!canUseGoogleCastSender()) {
    return Promise.resolve(false)
  }

  if (hasCastFramework()) {
    return Promise.resolve(true)
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise((resolve) => {
    window.__onGCastApiAvailable = (isAvailable) => {
      resolve(Boolean(isAvailable && hasCastFramework()))
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${CAST_SENDER_SDK_URL}"]`,
    )
    if (existingScript) {
      return
    }

    const script = document.createElement('script')
    script.src = CAST_SENDER_SDK_URL
    script.async = true
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })

  return loadPromise
}

export function initializeGoogleCast(): boolean {
  if (!hasCastFramework()) return false

  const castContext = cast.framework.CastContext.getInstance()
  castContext.setOptions({
    receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
  })

  return true
}
