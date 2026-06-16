const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
};

type ExpoTicket =
  | { status: 'ok'; id?: string }
  | { status: 'error'; message?: string; details?: { error?: string } };

type ExpoPushResult = {
  sent: number;
  failed: number;
  invalidTokens: string[];
  tickets: ExpoTicket[];
};

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]): Promise<ExpoPushResult> {
  if (messages.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [], tickets: [] };
  }

  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };

  if (expoAccessToken) {
    headers.Authorization = `Bearer ${expoAccessToken}`;
  }

  const tickets: ExpoTicket[] = [];
  const invalidTokens = new Set<string>();
  let sent = 0;
  let failed = 0;

  for (const batch of chunk(messages, EXPO_BATCH_SIZE)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo push API failed (${response.status}): ${errorText}`);
    }

    const payload = (await response.json()) as { data?: ExpoTicket[] };
    const batchTickets = payload.data ?? [];

    for (let index = 0; index < batchTickets.length; index += 1) {
      const ticket = batchTickets[index];
      tickets.push(ticket);

      if (ticket.status === 'ok') {
        sent += 1;
        continue;
      }

      failed += 1;

      const token = batch[index]?.to;
      const errorCode = ticket.details?.error;

      if (
        token &&
        (errorCode === 'DeviceNotRegistered' ||
          errorCode === 'InvalidCredentials' ||
          errorCode === 'MismatchSenderId')
      ) {
        invalidTokens.add(token);
      }
    }
  }

  return {
    sent,
    failed,
    invalidTokens: [...invalidTokens],
    tickets,
  };
}
