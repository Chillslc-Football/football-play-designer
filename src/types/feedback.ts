export type FeedbackType = 'issue' | 'enhancement'

export type FeedbackInput = {
  teamId: string | null
  userId: string
  type: FeedbackType
  title: string
  description: string
  pageUrl: string
}
