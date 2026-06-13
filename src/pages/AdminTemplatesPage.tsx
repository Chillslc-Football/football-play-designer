import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSchemeTemplates } from '../context/SchemeTemplateProvider'
import { useAppShell } from '../context/AppShellContext'
import * as schemeTemplateRepository from '../repositories/schemeTemplateRepository'
import type { DefenderLabel } from '../types/defender'
import type { PlayerLabel, Position } from '../types/player'
import type { AdminTemplateEditSession } from '../types/adminTemplateEdit'
import type {
  DefensiveFrontTemplateRecord,
  FormationTemplateRecord,
} from '../types/schemeTemplate'
import {
  getDefaultFormationTemplateId,
  getDefaultFrontTemplateId,
  getManagedFormationTemplates,
  getManagedFrontTemplates,
  getResolvedFormationTemplates,
  getResolvedFrontTemplates,
} from '../utils/schemeTemplateStore'
import './AdminTemplatesPage.css'
import { AppShellNav } from '../components/AppShellNav/AppShellNav'

function createFormationEditSession(
  formation: {
    id: string
    label: string
    positions: Record<PlayerLabel, Position>
    positionLabels?: Partial<Record<PlayerLabel, string>>
  },
  managed?: FormationTemplateRecord,
): AdminTemplateEditSession {
  return {
    kind: 'formation',
    mode: managed ? 'edit' : 'edit',
    recordId: managed?.id,
    slug: formation.id,
    label: formation.label,
    positions: formation.positions,
    positionLabels: formation.positionLabels,
  }
}

function createFrontEditSession(
  front: {
    id: string
    label: string
    positions: Record<DefenderLabel, Position>
  },
  managed?: DefensiveFrontTemplateRecord,
): AdminTemplateEditSession {
  return {
    kind: 'front',
    mode: managed ? 'edit' : 'edit',
    recordId: managed?.id,
    slug: front.id,
    label: front.label,
    positions: front.positions,
  }
}

function createNewFormationSession(): AdminTemplateEditSession {
  const starter =
    getResolvedFormationTemplates().find(
      (formation) => formation.id === getDefaultFormationTemplateId(),
    ) ?? getResolvedFormationTemplates()[0]

  return {
    kind: 'formation',
    mode: 'create',
    slug: '',
    label: '',
    positions: starter?.positions ?? ({} as Record<PlayerLabel, Position>),
    positionLabels: starter?.positionLabels,
  }
}

function createNewFrontSession(): AdminTemplateEditSession {
  const starter =
    getResolvedFrontTemplates().find((front) => front.id === getDefaultFrontTemplateId()) ??
    getResolvedFrontTemplates()[0]

  return {
    kind: 'front',
    mode: 'create',
    slug: '',
    label: '',
    positions: starter?.positions ?? ({} as Record<DefenderLabel, Position>),
  }
}

export function AdminTemplatesPage() {
  const { user } = useAuth()
  const shell = useAppShell()
  const { loading, error, refreshTemplates } = useSchemeTemplates()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const managedFormations = getManagedFormationTemplates()
  const managedFronts = getManagedFrontTemplates()
  const resolvedFormations = getResolvedFormationTemplates()
  const resolvedFronts = getResolvedFrontTemplates()
  const defaultFormationId = getDefaultFormationTemplateId()
  const defaultFrontId = getDefaultFrontTemplateId()

  const managedFormationBySlug = useMemo(
    () => new Map(managedFormations.map((template) => [template.slug, template])),
    [managedFormations],
  )

  const managedFrontBySlug = useMemo(
    () => new Map(managedFronts.map((template) => [template.slug, template])),
    [managedFronts],
  )

  function openTemplateEditor(session: AdminTemplateEditSession) {
    shell?.setAdminTemplateEdit(session)
    shell?.setView('designer')
  }

  async function runAndRefresh(action: () => Promise<void>, successMessage: string) {
    setSaving(true)
    setMessage('')

    try {
      await action()
      await refreshTemplates()
      setMessage(successMessage)
    } catch (actionError) {
      setMessage(actionError instanceof Error ? actionError.message : 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  async function ensureManagedFormation(slug: string): Promise<FormationTemplateRecord> {
    const existing = managedFormationBySlug.get(slug)
    if (existing) return existing

    const resolved = resolvedFormations.find((formation) => formation.id === slug)
    if (!resolved) {
      throw new Error('Formation template not found.')
    }

    return schemeTemplateRepository.createFormationTemplate(
      {
        slug: resolved.id,
        label: resolved.label,
        positions: resolved.positions,
        positionLabels: resolved.positionLabels,
      },
      user?.id,
    )
  }

  async function ensureManagedFront(slug: string): Promise<DefensiveFrontTemplateRecord> {
    const existing = managedFrontBySlug.get(slug)
    if (existing) return existing

    const resolved = resolvedFronts.find((front) => front.id === slug)
    if (!resolved) {
      throw new Error('Defensive front template not found.')
    }

    return schemeTemplateRepository.createDefensiveFrontTemplate(
      {
        slug: resolved.id,
        label: resolved.label,
        positions: resolved.positions,
      },
      user?.id,
    )
  }

  return (
    <div className="admin-templates-page">
      <AppShellNav />

      <header className="admin-templates-header">
        <div>
          <h1 className="admin-templates-title">Formation & Front Templates</h1>
          <p className="admin-templates-subtitle">
            App-admin control for global offensive formations and defensive fronts.
          </p>
        </div>
      </header>

      {(loading || error || message) && (
        <p className={`admin-templates-status ${error ? 'is-error' : ''}`}>
          {loading ? 'Loading templates…' : error || message}
        </p>
      )}

      <section className="admin-templates-section">
        <div className="admin-templates-section-header">
          <h2>Offensive Formations</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openTemplateEditor(createNewFormationSession())}
            disabled={saving}
          >
            New Formation Template
          </button>
        </div>

        <div className="admin-templates-list">
          {resolvedFormations.map((formation) => {
            const managed = managedFormationBySlug.get(formation.id)
            const isDefault = formation.id === defaultFormationId

            return (
              <article key={formation.id} className="admin-template-card">
                <div className="admin-template-card-main">
                  <h3>{formation.label}</h3>
                  <p className="admin-template-meta">
                    <span>Slug: {formation.id}</span>
                    <span>{managed ? 'Managed in database' : 'Built-in fallback'}</span>
                    {isDefault && <span className="admin-template-default">Default</span>}
                  </p>
                </div>
                <div className="admin-template-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      openTemplateEditor(createFormationEditSession(formation, managed))
                    }
                    disabled={saving}
                  >
                    Edit
                  </button>
                  {!isDefault && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        void runAndRefresh(async () => {
                          const record = await ensureManagedFormation(formation.id)
                          await schemeTemplateRepository.setDefaultFormationTemplate(record.id)
                        }, `"${formation.label}" set as default formation.`)
                      }
                      disabled={saving}
                    >
                      Set Default
                    </button>
                  )}
                  {managed && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        if (!window.confirm(`Delete managed template "${formation.label}"?`)) return
                        void runAndRefresh(async () => {
                          await schemeTemplateRepository.deleteFormationTemplate(managed.id)
                        }, `"${formation.label}" deleted.`)
                      }}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="admin-templates-section">
        <div className="admin-templates-section-header">
          <h2>Defensive Fronts</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openTemplateEditor(createNewFrontSession())}
            disabled={saving}
          >
            New Front Template
          </button>
        </div>

        <div className="admin-templates-list">
          {resolvedFronts.map((front) => {
            const managed = managedFrontBySlug.get(front.id)
            const isDefault = front.id === defaultFrontId

            return (
              <article key={front.id} className="admin-template-card">
                <div className="admin-template-card-main">
                  <h3>{front.label}</h3>
                  <p className="admin-template-meta">
                    <span>Slug: {front.id}</span>
                    <span>{managed ? 'Managed in database' : 'Built-in fallback'}</span>
                    {isDefault && <span className="admin-template-default">Default</span>}
                  </p>
                </div>
                <div className="admin-template-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openTemplateEditor(createFrontEditSession(front, managed))}
                    disabled={saving}
                  >
                    Edit
                  </button>
                  {!isDefault && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        void runAndRefresh(async () => {
                          const record = await ensureManagedFront(front.id)
                          await schemeTemplateRepository.setDefaultDefensiveFrontTemplate(record.id)
                        }, `"${front.label}" set as default front.`)
                      }
                      disabled={saving}
                    >
                      Set Default
                    </button>
                  )}
                  {managed && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        if (!window.confirm(`Delete managed template "${front.label}"?`)) return
                        void runAndRefresh(async () => {
                          await schemeTemplateRepository.deleteDefensiveFrontTemplate(managed.id)
                        }, `"${front.label}" deleted.`)
                      }}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
