export type TeamMessageNotificationPayload = {
  teamId: string
  threadId: string
  messageId: string
}

type TeamMessageNotificationClickHandler = (payload: TeamMessageNotificationPayload) => void

const TEAM_MESSAGE_NOTIFICATION_TITLE = 'Team Chat'
const MAX_NOTIFICATION_BODY_LENGTH = 180

let notificationClickHandler: TeamMessageNotificationClickHandler | null = null

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

export function getBrowserNotificationPermission(): NotificationPermission | null {
  if (!isBrowserNotificationSupported()) {
    return null
  }

  return Notification.permission
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | null> {
  if (!isBrowserNotificationSupported()) {
    return null
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }

  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function canShowTeamMessageBrowserNotifications(): boolean {
  return isBrowserNotificationSupported() && Notification.permission === 'granted'
}

export function setTeamMessageNotificationClickHandler(
  handler: TeamMessageNotificationClickHandler | null,
): void {
  notificationClickHandler = handler
}

function truncateBody(text: string): string {
  const trimmed = text.trim()

  if (trimmed.length <= MAX_NOTIFICATION_BODY_LENGTH) {
    return trimmed
  }

  return `${trimmed.slice(0, MAX_NOTIFICATION_BODY_LENGTH - 1)}…`
}

export function showTeamMessageBrowserNotification(input: {
  teamId: string
  threadId: string
  messageId: string
  body: string
}): void {
  if (!canShowTeamMessageBrowserNotifications()) {
    return
  }

  const body = truncateBody(input.body)
  if (!body) {
    return
  }

  try {
    const notification = new Notification(TEAM_MESSAGE_NOTIFICATION_TITLE, {
      body,
      tag: `team-message-${input.messageId}`,
      data: {
        notification_type: 'team_message',
        team_id: input.teamId,
        thread_id: input.threadId,
        message_id: input.messageId,
      },
    })

    notification.onclick = () => {
      try {
        window.focus()
      } catch {
        // ignore focus failures
      }

      notification.close()
      notificationClickHandler?.({
        teamId: input.teamId,
        threadId: input.threadId,
        messageId: input.messageId,
      })
    }
  } catch (error) {
    console.warn('[browser-message-notification] failed to show notification', error)
  }
}
