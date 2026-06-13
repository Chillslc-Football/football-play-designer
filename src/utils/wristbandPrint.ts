export const WRISTBAND_PAGE_WIDTH_IN = 8.5
export const WRISTBAND_PAGE_HEIGHT_IN = 11
export const WRISTBAND_PRINT_DPI = 96
/** Cutting / spacer margin added on each side of a card in print output. */
export const WRISTBAND_CUT_BUFFER_IN = 0.5

export function cardSlotWidthIn(cardWidthIn: number): number {
  return cardWidthIn + WRISTBAND_CUT_BUFFER_IN * 2
}

export function cardSlotHeightIn(cardHeightIn: number): number {
  return cardHeightIn + WRISTBAND_CUT_BUFFER_IN * 2
}

export function cardsPerSheet(widthIn: number, heightIn: number): {
  cols: number
  rows: number
  count: number
} {
  const slotWidth = cardSlotWidthIn(widthIn)
  const slotHeight = cardSlotHeightIn(heightIn)
  const cols = Math.max(0, Math.floor(WRISTBAND_PAGE_WIDTH_IN / slotWidth))
  const rows = Math.max(0, Math.floor(WRISTBAND_PAGE_HEIGHT_IN / slotHeight))
  return { cols, rows, count: cols * rows }
}

export function inchesToPx(inches: number): number {
  return inches * WRISTBAND_PRINT_DPI
}
