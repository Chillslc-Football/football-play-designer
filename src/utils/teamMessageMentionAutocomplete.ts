import type { TeamMessageMentionAudience } from '../types/teamMessage'

export type AudienceMentionOption = {
  token: string
  audience: TeamMessageMentionAudience
  label: string
  description: string
}

export const AUDIENCE_MENTION_OPTIONS: AudienceMentionOption[] = [
  {
    token: '@everyone',
    audience: 'everyone',
    label: '@everyone',
    description: 'Notify everyone in this channel',
  },
  {
    token: '@coaches',
    audience: 'coaches',
    label: '@coaches',
    description: 'Notify coaches',
  },
  {
    token: '@players',
    audience: 'players',
    label: '@players',
    description: 'Notify players',
  },
  {
    token: '@parents',
    audience: 'parents',
    label: '@parents',
    description: 'Notify parents',
  },
]

export type ActiveMentionQuery = {
  startIndex: number
  query: string
  endIndex: number
}

export function getActiveMentionQuery(
  body: string,
  cursorPosition: number,
): ActiveMentionQuery | null {
  const safeCursor = Math.max(0, Math.min(cursorPosition, body.length))
  const beforeCursor = body.slice(0, safeCursor)
  const atIndex = beforeCursor.lastIndexOf('@')

  if (atIndex === -1) {
    return null
  }

  if (atIndex > 0 && /\w/.test(beforeCursor.charAt(atIndex - 1))) {
    return null
  }

  const query = beforeCursor.slice(atIndex + 1)

  if (/\s/.test(query)) {
    return null
  }

  return {
    startIndex: atIndex,
    query: query.toLowerCase(),
    endIndex: safeCursor,
  }
}

export function filterAudienceMentionOptions(query: string): AudienceMentionOption[] {
  return AUDIENCE_MENTION_OPTIONS.filter(
    (option) =>
      option.audience.startsWith(query) || option.token.slice(1).startsWith(query),
  )
}

export function insertAudienceMention(
  body: string,
  startIndex: number,
  endIndex: number,
  token: string,
): { nextBody: string; nextCursor: number } {
  const mention = `${token} `
  const nextBody = `${body.slice(0, startIndex)}${mention}${body.slice(endIndex)}`
  const nextCursor = startIndex + mention.length

  return { nextBody, nextCursor }
}
