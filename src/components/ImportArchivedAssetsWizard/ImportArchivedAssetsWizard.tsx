import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import * as archivedAssetRepository from '../../repositories/archivedAssetRepository'
import type { ArchivedFormation, ArchivedPlay } from '../../types/archivedAsset'
import type { TeamFormat } from '../../types/teamFormat'
import {
  formatArchivedDate,
  groupArchivedFormations,
  groupArchivedPlays,
  teamFormatLabel,
} from '../../utils/archivedAssetUtils'
import '../ArchivedAssetsModal/ArchivedAssetsModal.css'
import './ImportArchivedAssetsWizard.css'

type ImportWizardTab = 'plays' | 'formations'

type ImportArchivedAssetsWizardProps = {
  open: boolean
  teamId: string
  teamFormat: TeamFormat
  onSkip: () => void
  onImportComplete: () => void
}

export function ImportArchivedAssetsWizard({
  open,
  teamId,
  teamFormat,
  onSkip,
  onImportComplete,
}: ImportArchivedAssetsWizardProps) {
  const [activeTab, setActiveTab] = useState<ImportWizardTab>('plays')
  const [plays, setPlays] = useState<ArchivedPlay[]>([])
  const [formations, setFormations] = useState<ArchivedFormation[]>([])
  const [selectedPlayIds, setSelectedPlayIds] = useState<Set<string>>(new Set())
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const playGroups = useMemo(() => groupArchivedPlays(plays), [plays])
  const formationGroups = useMemo(() => groupArchivedFormations(formations), [formations])

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [loadedPlays, loadedFormations] = await Promise.all([
        archivedAssetRepository.getArchivedPlays(),
        archivedAssetRepository.getArchivedFormations(),
      ])

      const compatiblePlays = archivedAssetRepository.filterCompatibleArchivedPlays(
        loadedPlays,
        teamFormat,
      )
      const compatibleFormations = archivedAssetRepository.filterCompatibleArchivedFormations(
        loadedFormations,
        teamFormat,
      )

      setPlays(compatiblePlays)
      setFormations(compatibleFormations)

      console.log('[ImportArchivedAssetsWizard] loaded compatible assets', {
        teamId,
        teamFormat,
        compatiblePlaysCount: compatiblePlays.length,
        compatibleFormationsCount: compatibleFormations.length,
      })

      if (compatiblePlays.length === 0 && compatibleFormations.length > 0) {
        setActiveTab('formations')
      } else {
        setActiveTab('plays')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load archived assets')
      setPlays([])
      setFormations([])
    } finally {
      setLoading(false)
      setInitialLoadComplete(true)
    }
  }, [teamFormat, teamId])

  useEffect(() => {
    if (!open) {
      setSelectedPlayIds(new Set())
      setSelectedFormationIds(new Set())
      setError(null)
      setSuccess(null)
      setLoading(true)
      setInitialLoadComplete(false)
      return
    }

    void loadAssets()
  }, [open, loadAssets])

  useEffect(() => {
    if (!open || !initialLoadComplete || loading) return

    if (plays.length === 0 && formations.length === 0) {
      console.log('[ImportArchivedAssetsWizard] auto-skip after load: no compatible assets', {
        teamId,
        teamFormat,
      })
      onSkip()
    }
  }, [
    open,
    initialLoadComplete,
    loading,
    plays.length,
    formations.length,
    onSkip,
    teamId,
    teamFormat,
  ])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !actionLoading) {
        onSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, actionLoading, onSkip])

  function handleSelectAll() {
    if (activeTab === 'plays') {
      setSelectedPlayIds(new Set(plays.map((play) => play.id)))
      return
    }
    setSelectedFormationIds(new Set(formations.map((formation) => formation.id)))
  }

  async function handleImportSelected() {
    const playIds = Array.from(selectedPlayIds)
    const formationIds = Array.from(selectedFormationIds)
    if (playIds.length === 0 && formationIds.length === 0) return

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      let imported = 0
      if (playIds.length > 0) {
        imported += await archivedAssetRepository.importArchivedPlays(playIds, teamId)
      }
      if (formationIds.length > 0) {
        imported += await archivedAssetRepository.importArchivedFormations(formationIds, teamId)
      }

      setSuccess(
        imported === 1
          ? 'Imported 1 archived asset into your new team. Continuing to Team Hub…'
          : `Imported ${imported} archived assets into your new team. Continuing to Team Hub…`,
      )

      window.setTimeout(() => {
        onImportComplete()
      }, 600)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (!open) return null

  const selectedCount = selectedPlayIds.size + selectedFormationIds.size
  const currentGroups = activeTab === 'plays' ? playGroups : formationGroups
  const currentTabCount = activeTab === 'plays' ? plays.length : formations.length
  const emptyMessage =
    activeTab === 'plays'
      ? 'No compatible archived plays for this team format.'
      : 'No compatible archived formations for this team format.'

  return createPortal(
    <div
      className="archived-assets-overlay import-archived-wizard-overlay no-print"
      role="presentation"
    >
      <div
        className="archived-assets-dialog import-archived-wizard-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-archived-wizard-title"
      >
        <header className="archived-assets-header">
          <div className="archived-assets-header-main">
            <h2 id="import-archived-wizard-title" className="archived-assets-title">
              Import Archived Assets
            </h2>
            <p className="archived-assets-subtitle import-archived-wizard-intro">
              We found archived plays and formations that match your new team format (
              {teamFormatLabel(teamFormat)}). Would you like to import them now?
            </p>
          </div>
        </header>

        <div className="archived-assets-tabs" role="tablist" aria-label="Archived asset type">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'plays'}
            className={`archived-assets-tab${activeTab === 'plays' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('plays')}
            disabled={actionLoading}
          >
            Plays{plays.length > 0 ? ` (${plays.length})` : ''}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'formations'}
            className={`archived-assets-tab${activeTab === 'formations' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('formations')}
            disabled={actionLoading}
          >
            Formations{formations.length > 0 ? ` (${formations.length})` : ''}
          </button>
        </div>

        <div className="archived-assets-toolbar import-archived-wizard-toolbar">
          <button
            type="button"
            className="btn"
            onClick={handleSelectAll}
            disabled={actionLoading || currentTabCount === 0}
          >
            Select All
          </button>
        </div>

        {error && <p className="archived-assets-error">{error}</p>}
        {success && <p className="archived-assets-success">{success}</p>}

        <div className="archived-assets-body" role="tabpanel">
          {loading ? (
            <p className="archived-assets-empty">Loading archived assets…</p>
          ) : currentGroups.length === 0 ? (
            <p className="archived-assets-empty">{emptyMessage}</p>
          ) : (
            currentGroups.map((group) => (
              <section
                key={`${group.originalTeamName}-${group.archivedAt}`}
                className="archived-assets-group"
              >
                <header className="archived-assets-group-header">
                  <h3>Archived Team: {group.originalTeamName}</h3>
                  <p>Archived {formatArchivedDate(group.archivedAt)}</p>
                </header>
                <ul className="archived-assets-list">
                  {group.items.map((item) => {
                    const checked =
                      activeTab === 'plays'
                        ? selectedPlayIds.has(item.id)
                        : selectedFormationIds.has(item.id)

                    return (
                      <li key={item.id} className="archived-assets-item">
                        <label className="archived-assets-item-label">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={actionLoading}
                            onChange={() => {
                              if (activeTab === 'plays') {
                                setSelectedPlayIds((current) => {
                                  const next = new Set(current)
                                  if (next.has(item.id)) next.delete(item.id)
                                  else next.add(item.id)
                                  return next
                                })
                                return
                              }

                              setSelectedFormationIds((current) => {
                                const next = new Set(current)
                                if (next.has(item.id)) next.delete(item.id)
                                else next.add(item.id)
                                return next
                              })
                            }}
                          />
                          <span className="archived-assets-item-name">{item.name}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <footer className="import-archived-wizard-footer">
          <button type="button" className="btn" onClick={onSkip} disabled={actionLoading}>
            Continue to Team Hub
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleImportSelected()}
            disabled={actionLoading || selectedCount === 0}
          >
            {actionLoading ? 'Importing…' : 'Import Selected'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
