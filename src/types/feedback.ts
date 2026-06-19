export type FeedbackType = 'issue' | 'enhancement'

export type FeedbackInput = {
  teamId: string | null
  userId: string
  type: FeedbackType
  title: string
  description: string
  pageUrl: string
}

export type FeedbackRecord = {
  id: string
  team_id: string | null
  user_id: string
  type: FeedbackType
  title: string
  description: string
  page_url: string | null
  status: string | null
  created_at: string
}
