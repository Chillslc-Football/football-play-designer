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

  const leftPlayCount = card.left_play_ids.length
  const playRowCount = Math.max(leftPlayCount, card.right_play_ids.length)
  const headingRowPx =
    playRowCount === 0 ? heightPx : Math.max(10, Math.min(Math.round(heightPx * 0.14), 18))
  const playRowPx = playRowCount > 0 ? Math.floor((heightPx - headingRowPx) / playRowCount) : 0

  const rows = Array.from({ length: playRowCount }, (_, index) => ({
    leftNumber: index < leftPlayCount ? String(index + 1) : '',
    left: playName(playNamesById, card.left_play_ids[index]),
    rightNumber:
      index < card.right_play_ids.length ? String(leftPlayCount + index + 1) : '',
    right: playName(playNamesById, card.right_play_ids[index]),
  }))

  return (
    <div
      className="wristband-card-face"
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
    >
      <table className="wristband-card-table" aria-label="Wristband play card">
        <colgroup>
          <col className="wristband-card-number-col" />
          <col className="wristband-card-name-col" />
          <col className="wristband-card-number-col" />
          <col className="wristband-card-name-col" />
        </colgroup>
        <tbody>
          <tr className="wristband-card-heading-row" style={{ height: `${headingRowPx}px` }}>
            <th className="wristband-card-number-col" aria-hidden="true">
              {'\u00A0'}
            </th>
            <th scope="col">{card.left_heading || '\u00A0'}</th>
            <th className="wristband-card-number-col" aria-hidden="true">
              {'\u00A0'}
            </th>
            <th scope="col">{card.right_heading || '\u00A0'}</th>
          </tr>
          {rows.map((row, index) => (
            <tr
              key={`play-row-${index}`}
              className="wristband-card-play-row"
              style={{ height: `${playRowPx}px` }}
            >
              <td className="wristband-card-number-col">{row.leftNumber || '\u00A0'}</td>
              <td className="wristband-card-name-col">{row.left || '\u00A0'}</td>
              <td className="wristband-card-number-col">{row.rightNumber || '\u00A0'}</td>
              <td className="wristband-card-name-col">{row.right || '\u00A0'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
