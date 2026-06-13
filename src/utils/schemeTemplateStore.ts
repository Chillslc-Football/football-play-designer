import { BUILTIN_FORMATIONS, DEFAULT_FORMATION_ID, type FormationDefinition } from '../data/builtinFormations'
import { BUILTIN_FRONTS, DEFAULT_FRONT_ID, type FrontDefinition } from '../data/builtinFronts'
import type {
  DefensiveFrontTemplateRecord,
  FormationTemplateRecord,
} from '../types/schemeTemplate'

type SchemeTemplateState = {
  formationTemplates: FormationTemplateRecord[]
  frontTemplates: DefensiveFrontTemplateRecord[]
  defaultFormationSlug: string | null
  defaultFrontSlug: string | null
  loaded: boolean
}

const state: SchemeTemplateState = {
  formationTemplates: [],
  frontTemplates: [],
  defaultFormationSlug: null,
  defaultFrontSlug: null,
  loaded: false,
}

export function setSchemeTemplateState(next: {
  formationTemplates: FormationTemplateRecord[]
  frontTemplates: DefensiveFrontTemplateRecord[]
}): void {
  state.formationTemplates = next.formationTemplates
  state.frontTemplates = next.frontTemplates
  state.defaultFormationSlug =
    next.formationTemplates.find((template) => template.isDefault)?.slug ?? null
  state.defaultFrontSlug =
    next.frontTemplates.find((template) => template.isDefault)?.slug ?? null
  state.loaded = true
}

export function clearSchemeTemplateState(): void {
  state.formationTemplates = []
  state.frontTemplates = []
  state.defaultFormationSlug = null
  state.defaultFrontSlug = null
  state.loaded = false
}

export function isSchemeTemplateStateLoaded(): boolean {
  return state.loaded
}

export function getManagedFormationTemplates(): FormationTemplateRecord[] {
  return state.formationTemplates
}

export function getManagedFrontTemplates(): DefensiveFrontTemplateRecord[] {
  return state.frontTemplates
}

export function getResolvedFormationTemplates(): FormationDefinition[] {
  const managedBySlug = new Map(
    state.formationTemplates.map((template) => [
      template.slug,
      {
        id: template.slug,
        label: template.label,
        positions: template.positions,
        positionLabels: template.positionLabels,
        isBuiltin: true,
      } satisfies FormationDefinition,
    ]),
  )

  const merged = [...managedBySlug.values()]
  for (const builtin of BUILTIN_FORMATIONS) {
    if (!managedBySlug.has(builtin.id)) {
      merged.push({
        id: builtin.id,
        label: builtin.label,
        positions: builtin.positions,
        positionLabels: builtin.positionLabels,
        isBuiltin: true,
      })
    }
  }

  return merged.sort((left, right) => left.label.localeCompare(right.label))
}

export function getResolvedFrontTemplates(): FrontDefinition[] {
  const managedBySlug = new Map(
    state.frontTemplates.map((template) => [
      template.slug,
      {
        id: template.slug as FrontDefinition['id'],
        label: template.label,
        positions: template.positions,
        isBuiltin: true,
      } satisfies FrontDefinition,
    ]),
  )

  const merged = [...managedBySlug.values()]
  for (const builtin of BUILTIN_FRONTS) {
    if (!managedBySlug.has(builtin.id)) {
      merged.push(builtin)
    }
  }

  return merged.sort((left, right) => left.label.localeCompare(right.label))
}

export function getDefaultFormationTemplateId(): string {
  return state.defaultFormationSlug ?? DEFAULT_FORMATION_ID
}

export function getDefaultFrontTemplateId(): string {
  return state.defaultFrontSlug ?? DEFAULT_FRONT_ID
}
