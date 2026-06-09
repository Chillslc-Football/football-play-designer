import { supabase } from '../lib/supabaseClient'
import type { FeedbackInput } from '../types/feedback'

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
