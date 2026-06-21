import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import * as archivedAssetRepository from '../../repositories/archivedAssetRepository'
import type { ArchivedFormation, ArchivedPlay } from '../../types/archivedAsset'
import type { TeamFormat } from '../../types/teamFormat'
import {
  formatArchivedDate,
  formatMismatchMessage,
  groupArchivedFormations,
  groupArchivedPlays,
  isFormatCompatible,
  teamFormatLabel,
} from '../../utils/archivedAssetUtils'
import '../ConfirmDialog/ConfirmDialog.css'
import './ArchivedAssetsModal.css'

type ArchivedAssetsTab = 'plays' | 'formations'

type ArchivedAssetsModalProps = {
  open: boolean
  teamId: string
  teamFormat: TeamFormat
  onClose: () => void
  onImportComplete: () => void
}

const DELETE_CONFIRM_MESSAGE =
  'This permanently deletes selected archived assets. This cannot be undone.'

export function ArchivedAssetsModal({
  open,
  teamId,
  teamFormat,
  onClose,
  onImportComplete,
}: ArchivedAssetsModalProps) {
  const [activeTab, setActiveTab] = useState<ArchivedAssetsTab>('plays')
  const [plays, setPlays] = useState<ArchivedPlay[]>([])
  const [formations, setFormations] = useState<ArchivedFormation[]>([])
  const [selectedPlayIds, setSelectedPlayIds] = useState<Set<string>>(new Set())
  const [selectedFormationIds, setSelectedFormationIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const playGroups = useMemo(() => groupArchivedPlays(plays), [plays])
  const formationGroups = useMemo(() => groupArchivedFormations(formations), [formations])

  const compatiblePlayIds = useMemo(
    () => plays.filter((play) => isFormatCompatible(play.teamFormat, teamFormat)).map((p) => p.id),
    [plays, teamFormat],
  )

  const compatibleFormationIds = useMemo(
    () =>
      formations
        .filter((formation) => isFormatCompatible(formation.teamFormat, teamFormat))
        .map((f) => f.id),
    [formations, teamFormat],
  )

  const selectedIds = activeTab === 'plays' ? selectedPlayIds : selectedFormationIds
  const compatibleIds = activeTab === 'plays' ? compatiblePlayIds : compatibleFormationIds

  const loadAssets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [loadedPlays, loadedFormations] = await Promise.all([
        archivedAssetRepository.getArchivedPlays(),
        archivedAssetRepository.getArchivedFormations(),
      ])
      setPlays(loadedPlays)
      setFormations(loadedFormations)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load archived assets')
      setPlays([])
      setFormations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setSelectedPlayIds(new Set())
      setSelectedFormationIds(new Set())
      setError(null)
      setSuccess(null)
      setDeleteConfirmOpen(false)
      return
    }

    void loadAssets()
  }, [open, loadAssets])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !actionLoading && !deleteConfirmOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, actionLoading, deleteConfirmOpen, onClose])

  function toggleSelection(id: string, compatible: boolean) {
    if (!compatible) return

    if (activeTab === 'plays') {
      setSelectedPlayIds((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }

    setSelectedFormationIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAllCompatible() {
    if (activeTab === 'plays') {
      setSelectedPlayIds(new Set(compatiblePlayIds))
      return
    }
    setSelectedFormationIds(new Set(compatibleFormationIds))
  }

  function handleClearSelection() {
    if (activeTab === 'plays') {
      setSelectedPlayIds(new Set())
      return
    }
    setSelectedFormationIds(new Set())
  }

  async function handleImportSelected() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const imported =
        activeTab === 'plays'
          ? await archivedAssetRepository.importArchivedPlays(ids, teamId)
          : await archivedAssetRepository.importArchivedFormations(ids, teamId)

      setSuccess(
        imported === 1
          ? 'Imported 1 asset into your current team.'
          : `Imported ${imported} assets into your current team.`,
      )
      handleClearSelection()
      onImportComplete()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleConfirmDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const deleted =
        activeTab === 'plays'
          ? await archivedAssetRepository.deleteArchivedPlays(ids)
          : await archivedAssetRepository.deleteArchivedFormations(ids)

      setDeleteConfirmOpen(false)
      setSuccess(
        deleted === 1
          ? 'Permanently deleted 1 archived asset.'
          : `Permanently deleted ${deleted} archived assets.`,
      )
      handleClearSelection()
      await loadAssets()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed')
      setDeleteConfirmOpen(false)
    } finally {
      setActionLoading(false)
    }
  }

  if (!open) return null

  const currentGroups = activeTab === 'plays' ? playGroups : formationGroups
  const emptyMessage =
    activeTab === 'plays'
      ? 'No archived plays from deleted teams.'
      : 'No archived custom formations from deleted teams.'

  return createPortal(
    <>
      <ConfirmDialog
        open={deleteConfirmOpen}
        message={DELETE_CONFIRM_MESSAGE}
        variant="delete"
        confirmLabel={actionLoading ? 'Deleting…' : 'Delete permanently'}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (actionLoading) return
          setDeleteConfirmOpen(false)
        }}
      />

      <div
        className="archived-assets-overlay no-print"
        role="presentation"
        onClick={(event) => {
          if (actionLoading || event.target !== event.currentTarget) return
          onClose()
        }}
      >
        <div
          className="archived-assets-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archived-assets-title"
        >
          <header className="archived-assets-header">
            <div className="archived-assets-header-main">
              <h2 id="archived-assets-title" className="archived-assets-title">
                Archived Assets
              </h2>
              <p className="archived-assets-subtitle">
                Import copies into your current team ({teamFormatLabel(teamFormat)}). Archived
                originals stay saved until you delete them.
              </p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={actionLoading}
              aria-label="Close Archived Assets"
            >
              Close
            </button>
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
              Plays
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'formations'}
              className={`archived-assets-tab${activeTab === 'formations' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('formations')}
              disabled={actionLoading}
            >
              Formations
            </button>
          </div>

          <div className="archived-assets-toolbar">
            <button
              type="button"
              className="btn"
              onClick={handleSelectAllCompatible}
              disabled={actionLoading || compatibleIds.length === 0}
            >
              Select All Compatible
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleImportSelected()}
              disabled={actionLoading || selectedIds.size === 0}
            >
              {actionLoading ? 'Working…' : 'Import Selected'}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={actionLoading || selectedIds.size === 0}
            >
              Delete Selected
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
                <section key={`${group.originalTeamName}-${group.archivedAt}`} className="archived-assets-group">
                  <header className="archived-assets-group-header">
                    <h3>{group.originalTeamName}</h3>
                    <p>
                      {teamFormatLabel(group.teamFormat)} · Archived {formatArchivedDate(group.archivedAt)}
                    </p>
                  </header>
                  <ul className="archived-assets-list">
                    {group.items.map((item) => {
                      const compatible = isFormatCompatible(item.teamFormat, teamFormat)
                      const checked = selectedIds.has(item.id)

                      return (
                        <li
                          key={item.id}
                          className={`archived-assets-item${compatible ? '' : ' is-incompatible'}`}
                        >
                          <label className="archived-assets-item-label">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!compatible || actionLoading}
                              onChange={() => toggleSelection(item.id, compatible)}
                            />
                            <span className="archived-assets-item-name">{item.name}</span>
                          </label>
                          {!compatible && (
                            <p className="archived-assets-item-note">
                              {formatMismatchMessage(item.teamFormat, teamFormat)}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
