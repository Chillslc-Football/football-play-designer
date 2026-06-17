import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppShellView } from '../../context/AppShellContext'
import type { Play } from '../../types/play'
import type { PlayType } from '../../types/playType'
import type { MotionType } from '../../types/motion'
import type { CustomFormation } from '../../utils/formationStorage'
import {
  getFormationById,
  resolveFormationDisplayName,
} from '../../utils/formationUtils'
import { getFrontById, resolveFrontDisplayName } from '../../utils/frontUtils'
import {
  getResolvedFormationTemplates,
  getResolvedFrontTemplates,
} from '../../utils/schemeTemplateStore'
import {
  downloadPlaybookPdf,
  emailPlaybookPdf,
  printPlaybook,
} from '../../utils/playbookPrint'
import { PlayTypeSelector } from '../PlayTypeSelector/PlayTypeSelector'
import type { DrawingMode } from '../DrawingModeSelector/DrawingModeSelector'
import './RibbonBar.css'

type RibbonBarProps = {
  canEdit: boolean
  canSharePdf: boolean
  playType: PlayType
  onPlayTypeChange: (playType: PlayType) => void
  selectedLoadId: string
  sortedPlays: Play[]
  onLoadPlay: (playId: string) => void
  onNewPlay: () => void
  onSaveChanges: () => void
  onSaveAsNew: () => void
  onDeletePlay: () => void
  isSaving?: boolean
  formationId: string
  formationName: string
  frontId: string
  frontName: string
  customFormations: CustomFormation[]
  onFormationChange: (formationId: string) => void
  onFrontChange: (frontId: string) => void
  onMirrorPlay: () => void
  isMirrored: boolean
  hasDefendersOnField: boolean
  hasOffenseOnField: boolean
  onRemoveDefensiveFront: () => void
  onRemoveOffensiveFormation: () => void
  drawingMode: DrawingMode
  motionType: MotionType
  onDrawingModeChange: (mode: DrawingMode) => void
  onMotionTypeChange: (motionType: MotionType) => void
  onClearPlay: () => void
  onNavigate: (view: AppShellView) => void
}

function RibbonSection({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`ribbon-section ${className}`}>
      <span className="ribbon-section-label">{label}</span>
      <div className="ribbon-section-actions">{children}</div>
    </div>
  )
}

export function RibbonBar({
  canEdit,
  canSharePdf,
  playType,
  onPlayTypeChange,
  selectedLoadId,
  sortedPlays,
  onLoadPlay,
  onNewPlay,
  onSaveChanges,
  onSaveAsNew,
  onDeletePlay,
  isSaving = false,
  formationId,
  formationName,
  frontId,
  frontName,
  customFormations,
  onFormationChange,
  onFrontChange,
  onMirrorPlay,
  isMirrored,
  hasDefendersOnField,
  hasOffenseOnField,
  onRemoveDefensiveFront,
  onRemoveOffensiveFormation,
  drawingMode,
  motionType,
  onDrawingModeChange,
  onMotionTypeChange,
  onClearPlay,
  onNavigate,
}: RibbonBarProps) {
  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shareOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShareOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [shareOpen])

  const saveDisabled = !canEdit || isSaving
  const canDelete = selectedLoadId !== ''
  const isOffensive = playType === 'offensive'
  const routeLabel = isOffensive ? 'Route' : 'Movement'

  const formationExists = getFormationById(formationId, customFormations) !== null
  const frontExists = getFrontById(frontId) !== null

  const deletedFormationLabel =
    isOffensive && !formationExists
      ? resolveFormationDisplayName(formationId, formationName, customFormations)
      : null

  const deletedFrontLabel =
    !isOffensive && !frontExists ? resolveFrontDisplayName(frontId, frontName) : null

  const schemeSelect = useMemo(() => {
    if (!isOffensive) {
      return (
        <div className="ribbon-select-group">
          <label htmlFor="ribbon-front-select" className="ribbon-select-label">
            Front
          </label>
          <select
            id="ribbon-front-select"
            className="select-field ribbon-select"
            value={frontId}
            onChange={(e) => onFrontChange(e.target.value)}
            disabled={!canEdit}
          >
            <optgroup label="Built-in Fronts">
              {getResolvedFrontTemplates().map((front) => (
                <option key={front.id} value={front.id}>
                  {front.label}
                </option>
              ))}
            </optgroup>
            {deletedFrontLabel && <option value={frontId}>{deletedFrontLabel}</option>}
          </select>
        </div>
      )
    }

    return (
      <div className="ribbon-select-group">
        <label htmlFor="ribbon-formation-select" className="ribbon-select-label">
          Formation
        </label>
        <select
          id="ribbon-formation-select"
          className="select-field ribbon-select"
          value={formationId}
          onChange={(e) => onFormationChange(e.target.value)}
          disabled={!canEdit}
        >
          <optgroup label="Built-in Formations">
            {getResolvedFormationTemplates().map((formation) => (
              <option key={formation.id} value={formation.id}>
                {formation.label}
              </option>
            ))}
          </optgroup>
          {customFormations.length > 0 && (
            <optgroup label="Custom Formations">
              {customFormations.map((formation) => (
                <option key={formation.id} value={formation.id}>
                  {formation.label}
                </option>
              ))}
            </optgroup>
          )}
          {deletedFormationLabel && <option value={formationId}>{deletedFormationLabel}</option>}
        </select>
      </div>
    )
  }, [
    isOffensive,
    frontId,
    formationId,
    customFormations,
    canEdit,
    onFrontChange,
    onFormationChange,
    deletedFrontLabel,
    deletedFormationLabel,
  ])

  function handleMotionJog() {
    onDrawingModeChange('motion')
    onMotionTypeChange('jog')
  }

  function handleMotionSprint() {
    onDrawingModeChange('motion')
    onMotionTypeChange('sprint')
  }

  function handleShareToggle() {
    setShareOpen((open) => !open)
  }

  function handleShareAction(action: () => void) {
    action()
    setShareOpen(false)
  }

  return (
    <div className="ribbon-bar no-print" aria-label="Play Designer ribbon">
      <div className="ribbon-bar-row">
        <RibbonSection label="File">
          <button
            type="button"
            className="btn ribbon-btn"
            onClick={onNewPlay}
            disabled={!canEdit}
          >
            New Play
          </button>

          <div className="ribbon-select-group">
            <label htmlFor="ribbon-load-play" className="ribbon-select-label">
              Load Play
            </label>
            <select
              id="ribbon-load-play"
              className="select-field ribbon-select ribbon-load-select"
              value={selectedLoadId}
              onChange={(e) => onLoadPlay(e.target.value)}
            >
              <option value="">Select a saved play…</option>
              {sortedPlays.map((saved) => (
                <option key={saved.id} value={saved.id}>
                  {saved.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn ribbon-btn ribbon-btn-primary"
            onClick={onSaveChanges}
            disabled={saveDisabled}
          >
            {isSaving ? 'Saving…' : 'Save Play'}
          </button>

          <button
            type="button"
            className="btn ribbon-btn"
            onClick={onSaveAsNew}
            disabled={saveDisabled}
          >
            {isSaving ? 'Saving…' : 'Save As'}
          </button>

          <button
            type="button"
            className="btn ribbon-btn ribbon-btn-danger"
            onClick={onDeletePlay}
            disabled={!canDelete || !canEdit}
          >
            Delete Play
          </button>

          <button type="button" className="btn ribbon-btn" onClick={() => printPlaybook()}>
            Print
          </button>

          <div className="ribbon-share" ref={shareRef}>
            <button
              type="button"
              className="btn ribbon-btn"
              onClick={handleShareToggle}
              aria-expanded={shareOpen}
              aria-haspopup="menu"
              disabled={!canSharePdf}
              title={canSharePdf ? 'Share playbook PDF' : 'View only — contact your coach to share'}
            >
              Share
            </button>
            {shareOpen && canSharePdf && (
              <div className="ribbon-share-menu" role="menu">
                <button
                  type="button"
                  className="btn"
                  role="menuitem"
                  onClick={() => handleShareAction(downloadPlaybookPdf)}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  className="btn"
                  role="menuitem"
                  onClick={() => handleShareAction(emailPlaybookPdf)}
                >
                  Email PDF
                </button>
              </div>
            )}
          </div>
        </RibbonSection>

        <RibbonSection label="Formation" className="ribbon-play-type">
          <PlayTypeSelector
            playType={playType}
            canEdit={canEdit}
            onChange={onPlayTypeChange}
          />
          {schemeSelect}
          <button
            type="button"
            className={`btn ribbon-btn ${isMirrored ? 'ribbon-btn-active' : ''}`}
            onClick={onMirrorPlay}
            disabled={!canEdit}
            title="Mirror play side across Center (C)"
          >
            Mirror Play
          </button>
          {isOffensive ? (
            <button
              type="button"
              className="btn ribbon-btn"
              onClick={onRemoveDefensiveFront}
              disabled={!canEdit || !hasDefendersOnField}
            >
              Remove Front
            </button>
          ) : (
            <button
              type="button"
              className="btn ribbon-btn"
              onClick={onRemoveOffensiveFormation}
              disabled={!canEdit || !hasOffenseOnField}
            >
              Remove Formation
            </button>
          )}
        </RibbonSection>

        <RibbonSection label="Draw">
          <button
            type="button"
            className={`btn ribbon-btn ${drawingMode === 'route' ? 'ribbon-btn-draw-active' : ''}`}
            onClick={() => onDrawingModeChange('route')}
            disabled={!canEdit}
          >
            {routeLabel}
          </button>
          <button
            type="button"
            className={`btn ribbon-btn ribbon-btn-draw-motion ${
              drawingMode === 'motion' && motionType === 'jog' ? 'ribbon-btn-draw-active' : ''
            }`}
            onClick={handleMotionJog}
            disabled={!canEdit || !isOffensive}
          >
            Motion Jog
          </button>
          <button
            type="button"
            className={`btn ribbon-btn ribbon-btn-draw-motion ${
              drawingMode === 'motion' && motionType === 'sprint' ? 'ribbon-btn-draw-active' : ''
            }`}
            onClick={handleMotionSprint}
            disabled={!canEdit || !isOffensive}
          >
            Motion Sprint
          </button>
          <button
            type="button"
            className={`btn ribbon-btn ribbon-btn-draw-block ${
              drawingMode === 'block' ? 'ribbon-btn-draw-active' : ''
            }`}
            onClick={() => onDrawingModeChange('block')}
            disabled={!canEdit || !isOffensive}
          >
            Block
          </button>
          <button type="button" className="btn ribbon-btn" disabled title="Undo — coming soon">
            Undo
          </button>
          <button type="button" className="btn ribbon-btn" disabled title="Redo — coming soon">
            Redo
          </button>
          <button
            type="button"
            className="btn ribbon-btn"
            onClick={onClearPlay}
            disabled={!canEdit}
          >
            Clear Play
          </button>
        </RibbonSection>

        <RibbonSection label="Team">
          <button type="button" className="btn ribbon-btn" onClick={() => onNavigate('team-hub')}>
            Team Hub
          </button>
          <button
            type="button"
            className="btn ribbon-btn"
            onClick={() => onNavigate('team-updates')}
          >
            Updates
          </button>
          <button type="button" className="btn ribbon-btn" onClick={() => onNavigate('messages')}>
            Messages
          </button>
          <button type="button" className="btn ribbon-btn" onClick={() => onNavigate('calendar')}>
            Calendar
          </button>
        </RibbonSection>
      </div>
    </div>
  )
}
