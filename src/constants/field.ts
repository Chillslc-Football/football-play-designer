/** Shared field dimensions — used by the Field SVG and drag logic. */
export const FIELD_LENGTH = 120
export const FIELD_WIDTH = 53.3

/** Horizontal center of the field (the 50-yard / midfield line at x = 60). */
export const FIELD_CENTER_X = FIELD_LENGTH / 2

/**
 * Radius of each player circle in SVG units (1 unit = 1 yard).
 * Sized for readable labels; OL_GAP in formations.ts keeps centers ≥ 4.5 apart.
 */
export const PLAYER_RADIUS = 2
