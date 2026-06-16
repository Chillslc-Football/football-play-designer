import { supabase } from '../lib/supabaseClient'
import type { TeamMessage, TeamMessageThread } from '../types/teamMessage'

type TeamMessageThreadRow = {
  id: string
  team_id: string
  title: string
  created_by: string
  created_at: string
  updated_at: string
  last_message_at: string | null
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

  'id, thread_id, team_id, sender_id, body, created_at, edited_at, deleted_at'

const MESSAGE_COLUMNS =
  'id, thread_id, team_id, sender_id, body, created_at, edited_at, deleted_at'

function rowToThread(row: TeamMessageThreadRow): TeamMessageThread {
  return {
    id: row.id,
    team_id: row.team_id,
    title: row.title,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_message_at: row.last_message_at,
  }
}

function rowToMessage(row: TeamMessageRow): TeamMessage {
  return {
    id: row.id,
    thread_id: row.thread_id,
    team_id: row.team_id,
    sender_id: row.sender_id,
    body: row.body,
    created_at: row.created_at,
    edited_at: row.edited_at,
    deleted_at: row.deleted_at,
  }
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

  return ((data ?? []) as TeamMessageRow[]).map(rowToMessage)
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

  return rowToMessage(data as TeamMessageRow)
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
        onInsert(rowToMessage(row))
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
