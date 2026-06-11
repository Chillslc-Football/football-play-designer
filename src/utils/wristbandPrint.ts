export const WRISTBAND_PAGE_WIDTH_IN = 8.5
export const WRISTBAND_PAGE_HEIGHT_IN = 11
export const WRISTBAND_PRINT_DPI = 96

export function cardsPerSheet(widthIn: number, heightIn: number): {
  cols: number
  rows: number
  count: number
} {
  const cols = Math.max(0, Math.floor(WRISTBAND_PAGE_WIDTH_IN / widthIn))
  const rows = Math.max(0, Math.floor(WRISTBAND_PAGE_HEIGHT_IN / heightIn))
  return { cols, rows, count: cols * rows }
}

export function inchesToPx(inches: number): number {
  return inches * WRISTBAND_PRINT_DPI
}
