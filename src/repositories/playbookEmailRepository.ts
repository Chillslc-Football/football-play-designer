import { supabase } from '../lib/supabaseClient'

export const PLAYBOOK_EMAIL_NOT_CONFIGURED_MESSAGE =
  'Playbook email sending is not configured yet.'

export type SendPlaybookEmailInput = {
  teamId: string
  recipientEmail: string
  note?: string
}

type SendPlaybookEmailResponse = {
  ok?: boolean
  error?: string
}

function isFunctionNotDeployed(status: number): boolean {
  return status === 404
}

async function readErrorBody(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as SendPlaybookEmailResponse
    if (typeof body.error === 'string' && body.error.length > 0) {
      return body.error
    }
  } catch {
    // Fall through.
  }

  return null
}

async function getInvokeErrorMessage(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return PLAYBOOK_EMAIL_NOT_CONFIGURED_MESSAGE
  }

  const invokeError = error as { name?: string; message?: string; context?: Response }

  if (invokeError.name === 'FunctionsHttpError' && invokeError.context instanceof Response) {
    if (isFunctionNotDeployed(invokeError.context.status)) {
      return PLAYBOOK_EMAIL_NOT_CONFIGURED_MESSAGE
    }

    const bodyError = await readErrorBody(invokeError.context)
    if (bodyError) {
      return bodyError
    }
  }

  const message = typeof invokeError.message === 'string' ? invokeError.message : ''
  if (/function not found|404/i.test(message)) {
    return PLAYBOOK_EMAIL_NOT_CONFIGURED_MESSAGE
  }

  if (message.length > 0) {
    return message
  }

  return 'Could not send playbook email'
}

export async function sendPlaybookEmail(input: SendPlaybookEmailInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-playbook-email', {
    body: {
      team_id: input.teamId,
      recipient_email: input.recipientEmail.trim().toLowerCase(),
      note: input.note?.trim() ?? '',
    },
  })

  if (error) {
    throw new Error(await getInvokeErrorMessage(error))
  }

  const response = data as SendPlaybookEmailResponse | null

  if (response?.error) {
    throw new Error(response.error)
  }

  if (!response?.ok) {
    throw new Error('Failed to send playbook email')
  }
}
