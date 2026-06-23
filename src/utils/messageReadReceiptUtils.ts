import type { MessageReadSummary } from '../types/teamMessage'

export function formatMessageReadReceipt(summary: MessageReadSummary | null): string | null {
  if (!summary || summary.eligible_count <= 0) {
    return null
  }

  return `Read by ${summary.read_count} of ${summary.eligible_count}`
}

export function formatThreadLatestReadReceipt(summary: MessageReadSummary | null): string | null {
  if (!summary || summary.eligible_count <= 0) {
    return null
  }

  return `Latest message read by ${summary.read_count} of ${summary.eligible_count}`
}
