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

function playName(playNamesById: Record<string, string>, playId: string | undefined): string {
  if (!playId) return ''
  return playNamesById[playId] ?? 'Unknown play'
}

export function WristbandCardFace({ card, playNamesById }: WristbandCardFaceProps) {
  const widthPx = inchesToPx(card.wristband_width)
  const heightPx = inchesToPx(card.wristband_height)

  const playRowCount = Math.max(card.left_play_ids.length, card.right_play_ids.length)
  const headingRowPx =
    playRowCount === 0 ? heightPx : Math.max(10, Math.min(Math.round(heightPx * 0.14), 18))
  const playRowPx = playRowCount > 0 ? Math.floor((heightPx - headingRowPx) / playRowCount) : 0

  const rows = Array.from({ length: playRowCount }, (_, index) => ({
    left: playName(playNamesById, card.left_play_ids[index]),
    right: playName(playNamesById, card.right_play_ids[index]),
  }))

  return (
    <div
      className="wristband-card-face"
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
    >
      <table className="wristband-card-table" aria-label="Wristband play card">
        <tbody>
          <tr className="wristband-card-heading-row" style={{ height: `${headingRowPx}px` }}>
            <th scope="col">{card.left_heading || '\u00A0'}</th>
            <th scope="col">{card.right_heading || '\u00A0'}</th>
          </tr>
          {rows.map((row, index) => (
            <tr
              key={`play-row-${index}`}
              className="wristband-card-play-row"
              style={{ height: `${playRowPx}px` }}
            >
              <td>{row.left || '\u00A0'}</td>
              <td>{row.right || '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
