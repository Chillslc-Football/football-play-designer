export type WristbandCard = {
  id: string
  team_id: string
  name: string
  wristband_width: number
  wristband_height: number
  size_unit: 'inches'
  left_heading: string
  right_heading: string
  left_play_ids: string[]
  right_play_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export type WristbandCardDraft = Omit<
  WristbandCard,
  'team_id' | 'created_by' | 'created_at' | 'updated_at'
>

export function cardToDraft(card: WristbandCard): WristbandCardDraft {
  return {
    id: card.id,
    name: card.name,
    wristband_width: card.wristband_width,
    wristband_height: card.wristband_height,
    size_unit: card.size_unit,
    left_heading: card.left_heading,
    right_heading: card.right_heading,
    left_play_ids: card.left_play_ids,
    right_play_ids: card.right_play_ids,
  }
}

export function createEmptyWristbandCardDraft(): WristbandCardDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    wristband_width: 2.5,
    wristband_height: 1.5,
    size_unit: 'inches',
    left_heading: '',
    right_heading: '',
    left_play_ids: [],
    right_play_ids: [],
  }
}
