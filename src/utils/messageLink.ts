export const PENDING_MESSAGE_DEEP_LINK_KEY = 'pending_message_deep_link'

export const MESSAGE_ACCESS_DENIED_MESSAGE =
  "You do not have access to this team's messages."

export type PendingMessageDeepLink = {
  teamId: string
  threadId: string
  messageId?: string
}

export function parseMessageDeepLinkFromUrl(
  search: string = window.location.search,
): PendingMessageDeepLink | null {
  const params = new URLSearchParams(search)
  if (params.get('open') !== 'messages') {
    return null
  }

  const teamId = params.get('team')?.trim()
  const threadId = params.get('thread')?.trim()
  if (!teamId || !threadId) {
    return null
  }

  const messageId = params.get('message')?.trim()
  if (messageId) {
    return { teamId, threadId, messageId }
  }

  return { teamId, threadId }
}

export function buildMessageDeepLink(input: {
  teamId: string
  threadId: string
  messageId?: string
}): string {
  const params = new URLSearchParams({
    open: 'messages',
    team: input.teamId,
    thread: input.threadId,
  })

  if (input.messageId?.trim()) {
    params.set('message', input.messageId.trim())
  }

  return `${window.location.origin}/?${params.toString()}`
}

export function savePendingMessageDeepLink(link: PendingMessageDeepLink): void {
  try {
    localStorage.setItem(PENDING_MESSAGE_DEEP_LINK_KEY, JSON.stringify(link))
  } catch {
    // localStorage may be unavailable
  }
}

function isPendingMessageDeepLink(value: unknown): value is PendingMessageDeepLink {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as PendingMessageDeepLink
  if (typeof candidate.teamId !== 'string' || candidate.teamId.trim().length === 0) {
    return false
  }

  if (typeof candidate.threadId !== 'string' || candidate.threadId.trim().length === 0) {
    return false
  }

  if (
    candidate.messageId !== undefined &&
    (typeof candidate.messageId !== 'string' || candidate.messageId.trim().length === 0)
  ) {
    return false
  }

  return true
}

export function readPendingMessageDeepLink(): PendingMessageDeepLink | null {
  try {
    const raw = localStorage.getItem(PENDING_MESSAGE_DEEP_LINK_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    if (!isPendingMessageDeepLink(parsed)) {
      return null
    }

    const link: PendingMessageDeepLink = {
      teamId: parsed.teamId.trim(),
      threadId: parsed.threadId.trim(),
    }

    if (parsed.messageId?.trim()) {
      link.messageId = parsed.messageId.trim()
    }

    return link
  } catch {
    // ignore invalid stored payload
  }

  return null
}

export function clearPendingMessageDeepLink(): void {
  try {
    localStorage.removeItem(PENDING_MESSAGE_DEEP_LINK_KEY)
  } catch {
    // ignore
  }
}

export function clearMessageDeepLinkFromUrl(): void {
  window.history.replaceState({}, '', window.location.pathname)
}

/** Persist deep link from URL for post-login handling; strip query params from address bar. */
export function captureMessageDeepLinkFromUrl(): PendingMessageDeepLink | null {
  const parsed = parseMessageDeepLinkFromUrl()
  if (!parsed) {
    return readPendingMessageDeepLink()
  }

  savePendingMessageDeepLink(parsed)
  clearMessageDeepLinkFromUrl()
  return parsed
}
