import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useCanEdit } from './hooks/useCanEdit'
import { useTeam } from './hooks/useTeam'
import * as formationRepository from './repositories/formationRepository'
import * as cloudPlayRepository from './repositories/playRepository'
import { Header } from './components/Header/Header'
import { Field } from './components/Field/Field'
import { Notes } from './components/Notes/Notes'
import { PlaySetupPanel } from './components/PlaySetupPanel/PlaySetupPanel'
import { PlayerAssignmentPanel } from './components/PlayerAssignmentPanel/PlayerAssignmentPanel'
import { PlayTypeSelector } from './components/PlayTypeSelector/PlayTypeSelector'
import { type DrawingMode } from './components/DrawingModeSelector/DrawingModeSelector'
import type { DefenderLabel } from './types/defender'
import type { DefenderRoute } from './types/defenderRoute'
import { createEmptyDefenderRoutes } from './types/defenderRoute'
import type { PlayType } from './types/playType'
import type { DriveStartYardLine } from './types/driveStart'
import { createEmptyBlocks, type Block } from './types/block'
import { createEmptyPlay, type Play } from './types/play'
import { type PlayerLabel, type Position } from './types/player'
import { createEmptyRoutes, type Route } from './types/route'
import {
  addCustomFormation,
  createCustomFormationId,
  deleteCustomFormation,
  getCustomFormations,
  type CustomFormation,
} from './utils/formationStorage'
import {
  ALL_PLAYS_FILTER,
  createPlayersForFormation,
  filterPlaysByFormation,
  getFormationById,
  getPlayFilterOptions,
  isCustomFormationId,
  isFormationNameTaken,
  positionsFromPlayers,
  type PlayFilterId,
  withFormationSnapshot,
} from './utils/formationUtils'
import {
  addNewPlay,
  deletePlayFromStorage,
  findSavedPlayByName,
  getAllSavedPlays,
  getPlayById,
  upsertPlayById,
} from './utils/playStorage'
import { getDefenderMirrorPartner } from './utils/defenseMirror'
import { getMirrorPartner, mirrorFootballPlay } from './utils/footballMirror'
import { clampDefensePosition, clampOffensePosition } from './utils/losClamp'
import './App.css'

function App() {
  const { user } = useAuth()
  const { activeTeamId } = useTeam()
  const canEdit = useCanEdit()
  const useCloud = Boolean(user?.id && activeTeamId)

  const [play, setPlay] = useState<Play>(createEmptyPlay)
  const [savedPlays, setSavedPlays] = useState<Play[]>([])
  const [customFormations, setCustomFormations] = useState<CustomFormation[]>([])
  const [playFilterId, setPlayFilterId] = useState<PlayFilterId>(ALL_PLAYS_FILTER)
  const [selectedLoadId, setSelectedLoadId] = useState('')
  const [activeSavedPlayId, setActiveSavedPlayId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerLabel | null>(null)
  const [selectedDefenderId, setSelectedDefenderId] = useState<DefenderLabel | null>(null)
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('route')
  const [setupPanelOpen, setSetupPanelOpen] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)

  const showSaveMessage = useCallback((message: string) => {
    setSaveMessage(message)
    setTimeout(() => setSaveMessage(''), 3500)
  }, [])

  const resetEditor = useCallback(() => {
    setPlay(createEmptyPlay())
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
    setPlayFilterId(ALL_PLAYS_FILTER)
  }, [])

  const loadTeamData = useCallback(async () => {
    if (!useCloud || !activeTeamId) {
      setSavedPlays(getAllSavedPlays())
      setCustomFormations(getCustomFormations())
      return
    }

    setDataLoading(true)
    try {
      const formations = await formationRepository.getFormationsByTeam(activeTeamId)
      setCustomFormations(formations)
      const plays = await cloudPlayRepository.getPlaysByTeam(activeTeamId, formations)
      setSavedPlays(plays)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load team plays and formations.'
      showSaveMessage(message)
      setSavedPlays([])
      setCustomFormations([])
    } finally {
      setDataLoading(false)
    }
  }, [activeTeamId, showSaveMessage, useCloud])

  useEffect(() => {
    resetEditor()
    void loadTeamData()
  }, [activeTeamId, loadTeamData, resetEditor, useCloud])

  const filterOptions = useMemo(
    () => getPlayFilterOptions(customFormations),
    [customFormations],
  )

  const filteredPlays = useMemo(
    () => filterPlaysByFormation(savedPlays, playFilterId),
    [savedPlays, playFilterId],
  )

  function preparePlayForSave(current: Play): Play {
    const snapshot = withFormationSnapshot(current, customFormations)
    return { ...current, ...snapshot }
  }

  function handleNewPlay() {
    setPlay(createEmptyPlay())
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
    setSaveMessage('')
  }

  function handlePlayNameChange(name: string) {
    setPlay((current) => ({ ...current, name }))
  }

  async function handleSaveChanges() {
    if (!canEdit) return

    const playToSave = preparePlayForSave(play)

    try {
      if (useCloud && activeTeamId) {
        const existingByName = cloudPlayRepository.findSavedPlayByName(play.name, savedPlays)
        const saveId = activeSavedPlayId ?? existingByName?.id ?? play.id

        const saved = await cloudPlayRepository.upsertPlay(
          activeTeamId,
          { ...playToSave, id: saveId },
          saveId,
          customFormations,
          user?.id,
        )
        setPlay(saved)
        setActiveSavedPlayId(saved.id)
        setSelectedLoadId(saved.id)
        await loadTeamData()
        showSaveMessage('Play saved.')
        return
      }

      if (activeSavedPlayId) {
        const saved = upsertPlayById(playToSave, activeSavedPlayId)
        setPlay(saved)
        setSelectedLoadId(saved.id)
        setSavedPlays(getAllSavedPlays())
        showSaveMessage('Play saved.')
        return
      }

      const existingByName = findSavedPlayByName(play.name, savedPlays)
      if (existingByName) {
        const saved = upsertPlayById(playToSave, existingByName.id)
        setPlay(saved)
        setActiveSavedPlayId(saved.id)
        setSelectedLoadId(saved.id)
        setSavedPlays(getAllSavedPlays())
        showSaveMessage('Play saved.')
        return
      }

      const saved = upsertPlayById(playToSave, play.id)
      setPlay(saved)
      setActiveSavedPlayId(saved.id)
      setSelectedLoadId(saved.id)
      setSavedPlays(getAllSavedPlays())
      showSaveMessage('Play saved.')
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to save play.')
    }
  }

  async function handleSaveAsNew() {
    if (!canEdit) return

    let nameToUse = play.name
    const findByName = useCloud
      ? (name: string, plays: Play[]) => cloudPlayRepository.findSavedPlayByName(name, plays)
      : findSavedPlayByName

    if (findByName(nameToUse, savedPlays)) {
      const prompted = window.prompt(
        'That play name already exists. Enter a different name:',
        nameToUse,
      )

      if (!prompted || !prompted.trim()) {
        showSaveMessage('Save cancelled — name must be unique.')
        return
      }

      if (findByName(prompted, savedPlays)) {
        showSaveMessage('That name also exists. Please choose a unique name.')
        return
      }

      nameToUse = prompted.trim()
    }

    try {
      if (useCloud && activeTeamId) {
        const saved = await cloudPlayRepository.addNewPlay(
          activeTeamId,
          preparePlayForSave({ ...play, name: nameToUse }),
          customFormations,
          user?.id,
        )
        setPlay(saved)
        setActiveSavedPlayId(saved.id)
        setSelectedLoadId(saved.id)
        await loadTeamData()
        showSaveMessage('Play saved.')
        return
      }

      const saved = addNewPlay(preparePlayForSave({ ...play, name: nameToUse }))
      setPlay(saved)
      setActiveSavedPlayId(saved.id)
      setSelectedLoadId(saved.id)
      setSavedPlays(getAllSavedPlays())
      showSaveMessage('Play saved.')
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to save play.')
    }
  }

  async function handleLoadPlay(playId: string) {
    if (!playId) {
      setSelectedLoadId('')
      setActiveSavedPlayId(null)
      return
    }

    try {
      const loaded =
        useCloud && activeTeamId
          ? await cloudPlayRepository.getPlayById(activeTeamId, playId, customFormations)
          : getPlayById(playId)

      if (!loaded) {
        showSaveMessage('Could not load that play.')
        await loadTeamData()
        return
      }

      setPlay(loaded)
      setSelectedLoadId(playId)
      setActiveSavedPlayId(playId)
      setPlayFilterId(loaded.formationId)
      setSelectedPlayerId(null)
      setSelectedDefenderId(null)
      if (loaded.playType === 'defensive') {
        setDrawingMode('route')
      }
      showSaveMessage(`Loaded "${loaded.name}"`)
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to load play.')
    }
  }

  function handlePlayFilterChange(filterId: PlayFilterId) {
    setPlayFilterId(filterId)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
  }

  async function handleDeletePlay() {
    if (!selectedLoadId || !canEdit) return

    const deletedId = selectedLoadId
    const playName = savedPlays.find((saved) => saved.id === deletedId)?.name ?? 'Play'

    try {
      if (useCloud && activeTeamId) {
        await cloudPlayRepository.deletePlay(activeTeamId, deletedId)
        await loadTeamData()
      } else {
        deletePlayFromStorage(deletedId)
        setSavedPlays(getAllSavedPlays())
      }

      setSelectedLoadId('')
      setActiveSavedPlayId(null)

      if (play.id === deletedId) {
        setPlay(createEmptyPlay())
        setSelectedPlayerId(null)
        setSelectedDefenderId(null)
      }

      showSaveMessage(`Deleted "${playName}"`)
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to delete play.')
    }
  }

  function handleMirrorPlay() {
    if (!canEdit) return
    setPlay((current) => mirrorFootballPlay(current))
    setSelectedPlayerId((current) => (current ? getMirrorPartner(current) : null))
    setSelectedDefenderId((current) => (current ? getDefenderMirrorPartner(current) : null))
  }

  function handlePlayTypeChange(playType: PlayType) {
    if (!canEdit) return
    setPlay((current) => ({ ...current, playType }))
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
    if (playType === 'defensive' && drawingMode === 'block') {
      setDrawingMode('route')
    }
  }

  function handleDriveStartChange(driveStartYardLine: DriveStartYardLine) {
    if (!canEdit) return
    setPlay((current) => ({ ...current, driveStartYardLine }))
  }

  function handleFormationChange(formationId: string) {
    if (!canEdit) return
    const formation = getFormationById(formationId, customFormations)
    if (!formation) return

    const players = createPlayersForFormation(formationId, customFormations).map((player) => ({
      ...player,
      position: clampOffensePosition(player.position),
    }))

    setPlay((current) => ({
      ...current,
      formationId,
      formationName: formation.label,
      players,
      routes: createEmptyRoutes(),
      blocks: createEmptyBlocks(),
      defenderRoutes: createEmptyDefenderRoutes(),
      notes: current.notes,
      playerNotes: current.playerNotes,
      mirrored: false,
    }))
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
  }

  async function handleSaveCurrentFormation() {
    if (!canEdit) return

    const name = window.prompt('Enter a name for this formation:')
    if (!name || !name.trim()) {
      showSaveMessage('Formation save cancelled.')
      return
    }

    if (isFormationNameTaken(name, customFormations)) {
      showSaveMessage('That formation name already exists. Choose a unique name.')
      return
    }

    const newFormation: CustomFormation = {
      id: createCustomFormationId(),
      label: name.trim(),
      positions: positionsFromPlayers(
        play.players.map((player) => ({
          ...player,
          position: clampOffensePosition(player.position),
        })),
      ),
    }

    try {
      if (useCloud && activeTeamId) {
        const saved = await formationRepository.addFormation(activeTeamId, newFormation, user?.id)
        await loadTeamData()
        setPlay((current) => ({
          ...current,
          formationId: saved.id,
          formationName: saved.label,
        }))
        showSaveMessage(`Formation "${saved.label}" saved.`)
        return
      }

      addCustomFormation(newFormation)
      setCustomFormations(getCustomFormations())

      setPlay((current) => ({
        ...current,
        formationId: newFormation.id,
        formationName: newFormation.label,
      }))

      showSaveMessage(`Formation "${newFormation.label}" saved.`)
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to save formation.')
    }
  }

  async function handleDeleteCustomFormation() {
    if (!canEdit || !isCustomFormationId(play.formationId)) return

    const label = play.formationName
    const confirmed = window.confirm(
      `Delete custom formation "${label}"?\n\nSaved plays using this formation will keep their saved positions.`,
    )
    if (!confirmed) return

    try {
      if (useCloud && activeTeamId) {
        await formationRepository.deleteFormation(activeTeamId, play.formationId)
        await loadTeamData()
      } else {
        deleteCustomFormation(play.formationId)
        setCustomFormations(getCustomFormations())
      }
      showSaveMessage(`Formation "${label}" deleted.`)
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to delete formation.')
    }
  }

  function handleNotesChange(notes: string) {
    if (!canEdit) return
    setPlay((current) => ({ ...current, notes }))
  }

  function handlePlayerNotesChange(playerId: PlayerLabel, notes: string) {
    if (!canEdit) return
    setPlay((current) => ({
      ...current,
      playerNotes: {
        ...current.playerNotes,
        [playerId]: notes,
      },
    }))
  }

  function handleSelectPlayer(playerId: PlayerLabel) {
    setSelectedPlayerId(playerId)
    setSelectedDefenderId(null)
  }

  function handleSelectDefender(defenderId: DefenderLabel) {
    setSelectedDefenderId(defenderId)
    setSelectedPlayerId(null)
  }

  function handlePlayerMove(playerId: PlayerLabel, position: Position) {
    if (!canEdit || play.playType !== 'offensive') return

    const clamped = clampOffensePosition(position)
    setPlay((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === playerId ? { ...player, position: clamped } : player,
      ),
    }))
  }

  function handleDefenderMove(defenderId: DefenderLabel, position: Position) {
    if (!canEdit || play.playType !== 'defensive') return

    const clamped = clampDefensePosition(position)
    setPlay((current) => ({
      ...current,
      defenders: current.defenders.map((defender) =>
        defender.id === defenderId ? { ...defender, position: clamped } : defender,
      ),
    }))
  }

  function handleRouteComplete(route: Route) {
    if (!canEdit || play.playType !== 'offensive') return

    setPlay((current) => {
      const otherRoutes = current.routes.filter((r) => r.playerId !== route.playerId)
      return {
        ...current,
        routes:
          route.points.length === 0 ? otherRoutes : [...otherRoutes, route],
      }
    })
  }

  function handleDefenderRouteComplete(route: DefenderRoute) {
    if (!canEdit || play.playType !== 'defensive') return

    setPlay((current) => {
      const otherRoutes = current.defenderRoutes.filter(
        (entry) => entry.defenderId !== route.defenderId,
      )
      return {
        ...current,
        defenderRoutes:
          route.points.length === 0 ? otherRoutes : [...otherRoutes, route],
      }
    })
  }

  function handleBlockComplete(block: Block) {
    if (!canEdit || play.playType !== 'offensive') return

    setPlay((current) => {
      const otherBlocks = current.blocks.filter((b) => b.playerId !== block.playerId)
      return {
        ...current,
        blocks: [...otherBlocks, block],
      }
    })
  }

  return (
    <div className="app">
      <Header />

      <div className={`app-body ${setupPanelOpen ? '' : 'setup-collapsed'}`}>
        <PlaySetupPanel
          canEdit={canEdit}
          isOpen={setupPanelOpen}
          onToggle={() => setSetupPanelOpen((open) => !open)}
          formationId={play.formationId}
          formationName={play.formationName}
          driveStartYardLine={play.driveStartYardLine}
          customFormations={customFormations}
          onFormationChange={handleFormationChange}
          onDriveStartChange={handleDriveStartChange}
          onSaveCurrentFormation={handleSaveCurrentFormation}
          onDeleteCustomFormation={handleDeleteCustomFormation}
          playName={play.name}
          onPlayNameChange={handlePlayNameChange}
          playFilterId={playFilterId}
          filterOptions={filterOptions}
          onPlayFilterChange={handlePlayFilterChange}
          filteredPlays={filteredPlays}
          selectedLoadId={selectedLoadId}
          onLoadPlay={handleLoadPlay}
          onDeletePlay={handleDeletePlay}
          playType={play.playType}
          drawingMode={drawingMode}
          onDrawingModeChange={setDrawingMode}
          onNewPlay={handleNewPlay}
          onSaveChanges={handleSaveChanges}
          onSaveAsNew={handleSaveAsNew}
          onMirrorPlay={handleMirrorPlay}
          isMirrored={play.mirrored}
        />

        <main className="canvas-area">
          <PlayTypeSelector
            playType={play.playType}
            canEdit={canEdit}
            onChange={handlePlayTypeChange}
          />

          {(saveMessage || dataLoading) && (
            <p className="save-message">
              {dataLoading ? 'Loading team plays and formations…' : saveMessage}
            </p>
          )}

          {!canEdit && !dataLoading && !saveMessage && (
            <p className="save-message save-message-readonly">View only — contact your coach to edit.</p>
          )}

          <div className="field-stage">
            <div className="field-stage-main">
              <div className="field-column">
                <Field
                  playType={play.playType}
                  viewOnly={!canEdit}
                  players={play.players}
                  defenders={play.defenders}
                  routes={play.routes}
                  defenderRoutes={play.defenderRoutes}
                  blocks={play.blocks}
                  playerNotes={play.playerNotes}
                  drawingMode={drawingMode}
                  driveStartYardLine={play.driveStartYardLine}
                  selectedPlayerId={selectedPlayerId}
                  selectedDefenderId={selectedDefenderId}
                  onSelectPlayer={handleSelectPlayer}
                  onSelectDefender={handleSelectDefender}
                  onPlayerMove={handlePlayerMove}
                  onDefenderMove={handleDefenderMove}
                  onRouteComplete={handleRouteComplete}
                  onDefenderRouteComplete={handleDefenderRouteComplete}
                  onBlockComplete={handleBlockComplete}
                />
              </div>

              <PlayerAssignmentPanel
                selectedPlayerId={selectedPlayerId}
                playerNotes={play.playerNotes}
                canEdit={canEdit}
                onPlayerNotesChange={handlePlayerNotesChange}
              />
            </div>

            <div className="notes-wrapper">
              <Notes value={play.notes} canEdit={canEdit} onChange={handleNotesChange} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
