import { WristbandCardFace } from '../WristbandCardFace/WristbandCardFace'
import type { WristbandCardDraft } from '../../types/wristbandCard'
import {
  cardsPerSheet,
  inchesToPx,
  WRISTBAND_PAGE_HEIGHT_IN,
  WRISTBAND_PAGE_WIDTH_IN,
} from '../../utils/wristbandPrint'
import './WristbandPrintSheet.css'

type WristbandPrintSheetProps = {
  card: WristbandCardDraft
  playNamesById: Record<string, string>
}

export function WristbandPrintSheet({ card, playNamesById }: WristbandPrintSheetProps) {
  const layout = cardsPerSheet(card.wristband_width, card.wristband_height)
  const pageWidthPx = inchesToPx(WRISTBAND_PAGE_WIDTH_IN)
  const pageHeightPx = inchesToPx(WRISTBAND_PAGE_HEIGHT_IN)
  const slots = Array.from({ length: Math.max(layout.count, 1) }, (_, index) => index)

  return (
    <div
      className="wristband-print-sheet"
      style={{ width: `${pageWidthPx}px`, height: `${pageHeightPx}px` }}
    >
      <div
        className="wristband-print-grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(layout.cols, 1)}, ${inchesToPx(card.wristband_width)}px)`,
          gridTemplateRows: `repeat(${Math.max(layout.rows, 1)}, ${inchesToPx(card.wristband_height)}px)`,
        }}
      >
        {slots.map((slot) => (
          <div key={slot} className="wristband-print-slot">
            <WristbandCardFace card={card} playNamesById={playNamesById} />
          </div>
        ))}
      </div>
    </div>
  )
}
