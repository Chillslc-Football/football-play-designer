import { supabase } from '../lib/supabaseClient'
import type {
  TeamMessage,
  TeamMessageThread,
  TeamMessageThreadKind,
  TeamMessageThreadWithUnread,
} from '../types/teamMessage'

type TeamMessageThreadRow = {
  id: string
  team_id: string
  title: string
  thread_kind: TeamMessageThreadKind
  created_by: string
  created_at: string
  updated_at: string
  last_message_at: string | null
}

type TeamMessageThreadWithUnreadRow = TeamMessageThreadRow & {
  unread_count: number | string
}

type TeamMessageRow = {
  id: string
  thread_id: string
  team_id: string
  sender_id: string
  body: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

type ProfileNameRow = {
  id: string
  display_name: string | null
}

const MESSAGE_COLUMNS =
  'id, thread_id, team_id, sender_id, body, created_at, edited_at, deleted_at'

const THREAD_COLUMNS =
  'id, team_id, title, thread_kind, created_by, created_at, updated_at, last_message_at'

function parseUnreadCount(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function rowToThread(row: TeamMessageThreadRow): TeamMessageThread {
  return {
    id: row.id,
    team_id: row.team_id,
    title: row.title,
    thread_kind: row.thread_kind ?? 'everyone',
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_message_at: row.last_message_at,
  }
}

function rowToThreadWithUnread(row: TeamMessageThreadWithUnreadRow): TeamMessageThreadWithUnread {
  return {
    ...rowToThread(row),
    unread_count: parseUnreadCount(row.unread_count),
  }
}

function rowToMessage(row: TeamMessageRow): TeamMessage {
  return {
    id: row.id,
    thread_id: row.thread_id,
    team_id: row.team_id,
    sender_id: row.sender_id,
    sender_display_name: null,
    body: row.body,
    created_at: row.created_at,
    edited_at: row.edited_at,
    deleted_at: row.deleted_at,
  }
}

async function fetchSenderDisplayNames(senderIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(senderIds.filter((id) => id.length > 0))]
  if (uniqueIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`Failed to load sender profiles: ${error.message}`)
  }

  const names = new Map<string, string>()
  for (const row of (data ?? []) as ProfileNameRow[]) {
    const trimmed = row.display_name?.trim()
    if (trimmed) {
      names.set(row.id, trimmed)
    }
  }

  return names
}

async function withSenderDisplayNames(messages: TeamMessage[]): Promise<TeamMessage[]> {
  if (messages.length === 0) {
    return messages
  }

  const names = await fetchSenderDisplayNames(messages.map((message) => message.sender_id))

  return messages.map((message) => ({
    ...message,
    sender_display_name: names.get(message.sender_id) ?? null,
  }))
}

export async function listAccessibleTeamMessageThreads(
  teamId: string,
): Promise<TeamMessageThreadWithUnread[]> {
  const { data, error } = await supabase.rpc('list_accessible_team_message_threads', {
    p_team_id: teamId,
  })

  if (error) {
    throw new Error(`Failed to load message channels: ${error.message}`)
  }

  return ((data ?? []) as TeamMessageThreadWithUnreadRow[]).map(rowToThreadWithUnread)
}

export async function getOrCreateTeamChatThread(teamId: string): Promise<TeamMessageThread> {
  const { data, error } = await supabase.rpc('get_or_create_team_chat_thread', {
    p_team_id: teamId,
  })

  if (error) {
    throw new Error(`Failed to load team chat: ${error.message}`)
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Failed to load team chat: no thread returned')
  }

  return rowToThread(data as TeamMessageThreadRow)
}

export async function getTeamMessagesByThread(
  teamId: string,
  threadId: string,
): Promise<TeamMessage[]> {
  const { data, error } = await supabase
    .from('team_messages')
    .select(MESSAGE_COLUMNS)
    .eq('team_id', teamId)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`)
  }

  const messages = ((data ?? []) as TeamMessageRow[]).map(rowToMessage)
  return withSenderDisplayNames(messages)
}

export async function getRecentTeamMessagesForTeam(
  teamId: string,
  limit = 5,
): Promise<TeamMessage[]> {
  const thread = await getOrCreateTeamChatThread(teamId)

  const { data, error } = await supabase
    .from('team_messages')
    .select(MESSAGE_COLUMNS)
    .eq('team_id', teamId)
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to load recent messages: ${error.message}`)
  }

  const messages = ((data ?? []) as TeamMessageRow[]).map(rowToMessage)
  return withSenderDisplayNames(messages)
}

export async function createTeamMessage(
  teamId: string,
  threadId: string,
  senderId: string,
  body: string,
): Promise<TeamMessage> {
  const trimmedBody = body.trim()

  if (trimmedBody.length === 0) {
    throw new Error('Message cannot be empty')
  }

  const { data, error } = await supabase
    .from('team_messages')
    .insert({
      team_id: teamId,
      thread_id: threadId,
      sender_id: senderId,
      body: trimmedBody,
    })
    .select(MESSAGE_COLUMNS)
    .single()

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`)
  }

  const [message] = await withSenderDisplayNames([rowToMessage(data as TeamMessageRow)])
  return message
}

export async function markThreadRead(threadId: string, upToMessageId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_thread_read', {
    p_thread_id: threadId,
    p_up_to_message_id: upToMessageId,
  })

  if (error) {
    throw new Error(`Failed to mark messages as read: ${error.message}`)
  }
}

export async function getTeamMessageUnreadCount(teamId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_team_message_unread_count', {
    p_team_id: teamId,
  })

  if (error) {
    throw new Error(`Failed to load unread message count: ${error.message}`)
  }

  return parseUnreadCount(data)
}

export function subscribeToTeamMessages(
  teamId: string,
  threadId: string,
  onInsert: (message: TeamMessage) => void,
): () => void {
  const channel = supabase
    .channel(`team-messages-${teamId}-${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        const row = payload.new as TeamMessageRow
        if (row.team_id !== teamId) {
          return
        }

        const message = rowToMessage(row)
        void withSenderDisplayNames([message])
          .then(([withNames]) => {
            onInsert(withNames)
          })
          .catch(() => {
            onInsert(message)
          })
      },
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[team_messages] realtime subscription error:', err?.message ?? status)
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function subscribeToAccessibleTeamMessages(
  teamId: string,
  threadIds: string[],
  onInsert: (message: TeamMessage) => void,
): () => void {
  const uniqueThreadIds = [...new Set(threadIds.filter((id) => id.length > 0))]
  if (uniqueThreadIds.length === 0) {
    return () => {}
  }

  const unsubscribers = uniqueThreadIds.map((threadId) =>
    subscribeToTeamMessages(teamId, threadId, onInsert),
  )

  return () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
  }
}

export async function getTeamMessageThreadById(
  teamId: string,
  threadId: string,
): Promise<TeamMessageThread | null> {
  const { data, error } = await supabase
    .from('team_message_threads')
    .select(THREAD_COLUMNS)
    .eq('team_id', teamId)
    .eq('id', threadId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load message channel: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return rowToThread(data as TeamMessageThreadRow)
}
