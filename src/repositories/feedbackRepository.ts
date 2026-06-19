import { supabase } from '../lib/supabaseClient'
import type { FeedbackInput, FeedbackRecord } from '../types/feedback'

function logFeedbackError(context: string, error: { message: string; code?: string }): void {
  console.error(`[feedbackRepository] ${context}`, error)
}

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const { error } = await supabase.from('feedback').insert({
    team_id: input.teamId,
    user_id: input.userId,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    page_url: input.pageUrl,
  })

  if (error) {
    logFeedbackError('submitFeedback', error)
    throw new Error(`Failed to submit feedback: ${error.message}`)
  }
}

export async function fetchOpenFeedback(): Promise<FeedbackRecord[]> {
  const { data, error } = await supabase.rpc('get_open_feedback_for_admin')

  if (error) {
    logFeedbackError('fetchOpenFeedback', error)
    throw new Error(`Failed to load feedback: ${error.message}`)
  }

  return (data ?? []) as FeedbackRecord[]
}

export async function resolveFeedback(id: string): Promise<void> {
  const { error } = await supabase.rpc('resolve_feedback_for_admin', {
    p_feedback_id: id,
  })

  if (error) {
    logFeedbackError('resolveFeedback', error)
    throw new Error(`Failed to resolve feedback: ${error.message}`)
  }
}
