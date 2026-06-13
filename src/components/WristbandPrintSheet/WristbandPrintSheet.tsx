import { WristbandCardFace } from '../WristbandCardFace/WristbandCardFace'
import type { WristbandCardDraft } from '../../types/wristbandCard'
import {
  cardSlotHeightIn,
  cardSlotWidthIn,
  cardsPerSheet,
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
  const slotWidthIn = cardSlotWidthIn(card.wristband_width)
  const slotHeightIn = cardSlotHeightIn(card.wristband_height)
  const slots = Array.from({ length: Math.max(layout.count, 1) }, (_, index) => index)

  return (
    <div
      className="wristband-print-sheet"
      style={{
        width: `${WRISTBAND_PAGE_WIDTH_IN}in`,
        height: `${WRISTBAND_PAGE_HEIGHT_IN}in`,
      }}
    >
      <div
        className="wristband-print-grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(layout.cols, 1)}, ${slotWidthIn}in)`,
          gridTemplateRows: `repeat(${Math.max(layout.rows, 1)}, ${slotHeightIn}in)`,
        }}
      >
        {slots.map((slot) => (
          <div key={slot} className="wristband-print-slot">
            <div className="wristband-card-cut-buffer">
              <WristbandCardFace card={card} playNamesById={playNamesById} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
