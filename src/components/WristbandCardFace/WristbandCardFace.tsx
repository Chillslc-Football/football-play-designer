import type { WristbandCardDraft } from '../../types/wristbandCard'
import { inchesToPx } from '../../utils/wristbandPrint'
import './WristbandCardFace.css'

type WristbandCardFaceProps = {
  card: Pick<
    WristbandCardDraft,
    'wristband_width' | 'wristband_height' | 'left_heading' | 'right_heading' | 'left_play_ids' | 'right_play_ids'
  >
  playNamesById: Record<string, string>
}

export function WristbandCardFace({ card, playNamesById }: WristbandCardFaceProps) {
  const widthPx = inchesToPx(card.wristband_width)
  const heightPx = inchesToPx(card.wristband_height)

  return (
    <div
      className="wristband-card-face"
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
    >
      <div className="wristband-card-column">
        <div className="wristband-card-heading">{card.left_heading || ' '}</div>
        <ul className="wristband-card-play-list">
          {card.left_play_ids.map((id) => (
            <li key={`left-${id}`}>{playNamesById[id] ?? 'Unknown play'}</li>
          ))}
        </ul>
      </div>
      <div className="wristband-card-column">
        <div className="wristband-card-heading">{card.right_heading || ' '}</div>
        <ul className="wristband-card-play-list">
          {card.right_play_ids.map((id) => (
            <li key={`right-${id}`}>{playNamesById[id] ?? 'Unknown play'}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
