/**
 * 50-yard playbook view — 1 SVG unit = 1 yard.
 * Offense attacks upward (north); the line of scrimmage is a horizontal line.
 */

/** Visible playing-field length (yards) — north/south in the view. */
export const FIELD_VIEW_LENGTH = 50

/** Standard field width in yards — sideline to sideline (east/west). */
export const FIELD_WIDTH = 53.3

/** Padding inside the SVG viewBox for yard labels and breathing room. */
export const FIELD_PADDING_TOP = 2.5
export const FIELD_PADDING_BOTTOM = 2
export const FIELD_PADDING_LEFT = 3.5
export const FIELD_PADDING_RIGHT = 3.5

/** Full SVG viewBox dimensions — playing field plus label padding. */
export const VIEWBOX_WIDTH = FIELD_PADDING_LEFT + FIELD_WIDTH + FIELD_PADDING_RIGHT
export const VIEWBOX_HEIGHT = FIELD_PADDING_TOP + FIELD_VIEW_LENGTH + FIELD_PADDING_BOTTOM

/** Line of scrimmage y — fixed so coaches always draw from the same spot. */
export const BACKFIELD_YARDS = 12
export const LOS_VIEW_Y = FIELD_VIEW_LENGTH - BACKFIELD_YARDS

/** Downfield shown north of the LOS (toward y = 0). */
export const DOWNFIELD_YARDS = LOS_VIEW_Y

/** Depth of the visible playing area (north/south). */
export const FIELD_LENGTH = FIELD_VIEW_LENGTH

/** @deprecated Horizontal-era LOS constant — used only for coordinate migration. */
export const LOS_VIEW_X = BACKFIELD_YARDS

/** @deprecated Use LOS_VIEW_Y — kept for any external references. */
export const FIELD_CENTER_X = LOS_VIEW_Y

/** O / X symbol font size in SVG yards (~1 yard on the coaching board). */
export const PLAYBOOK_SYMBOL_SIZE = 1.65

/** Distance from symbol center to position label below. */
export const PLAYBOOK_LABEL_OFFSET = 1.05

/** Invisible hit area half-width for dragging symbols. */
export const PLAYBOOK_HIT_SIZE = 1.1

/** Hash-mark columns — sideline lanes and college hash positions. */
export const HASH_MARK_X_LEFT = 17
export const HASH_MARK_X_RIGHT = FIELD_WIDTH - 17
export const HASH_MARK_LANES = [4, HASH_MARK_X_LEFT, HASH_MARK_X_RIGHT, FIELD_WIDTH - 4] as const

/** Sideline yard-number inset from the left/right edges of the playing field. */
export const YARD_NUMBER_SIDELINE_INSET = 3.5

/** Width-to-height ratio for responsive field sizing. */
export const FIELD_ASPECT_RATIO = VIEWBOX_WIDTH / VIEWBOX_HEIGHT

/** Legacy full-field coordinates (pre 50-yard view). */
export const LEGACY_FIELD_LENGTH = 120
export const LEGACY_LOS_X = 48
