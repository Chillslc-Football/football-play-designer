import { createDefendersForFront } from '../utils/frontUtils'

/** Default 4-3 defense aligned across from the offense (north of the LOS). */
export function createDefault43Defense() {
  return createDefendersForFront('4-3')
}
