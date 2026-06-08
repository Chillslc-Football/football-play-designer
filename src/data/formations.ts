/**
 * Re-exports formation helpers for backward compatibility.
 * Built-in data: src/data/builtinFormations.ts
 * Custom storage: src/utils/formationStorage.ts
 * Helpers: src/utils/formationUtils.ts
 */
export {
  BUILTIN_FORMATIONS,
  DEFAULT_FORMATION_ID,
  type BuiltInFormationId,
  type FormationDefinition,
} from './builtinFormations'

export {
  createPlayersForFormation,
  getFormationById,
  playersFromFormation,
} from '../utils/formationUtils'
