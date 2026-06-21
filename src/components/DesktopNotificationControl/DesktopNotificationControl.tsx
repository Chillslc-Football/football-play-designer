import { useCallback, useState } from 'react'

import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
} from '../../notifications/browserMessageNotification'
import './DesktopNotificationControl.css'

export function DesktopNotificationControl() {
  const supported = isBrowserNotificationSupported()
  const [permission, setPermission] = useState(() => getBrowserNotificationPermission())

  const handleEnable = useCallback(async () => {
    const nextPermission = await requestBrowserNotificationPermission()
    setPermission(nextPermission)
  }, [])

  if (!supported) {
    return null
  }

  if (permission === 'granted') {
    return (
      <p className="desktop-notification-control desktop-notification-control--enabled">
        Desktop notifications enabled
      </p>
    )
  }

  if (permission === 'denied') {
    return (
      <p className="desktop-notification-control desktop-notification-control--denied">
        Desktop notifications are blocked in your browser settings.
      </p>
    )
  }

  return (
    <button
      type="button"
      className="btn desktop-notification-control__button"
      onClick={() => void handleEnable()}
    >
      Enable desktop notifications
    </button>
  )
}
