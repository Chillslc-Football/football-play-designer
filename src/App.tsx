import { useEffect, useMemo, useState } from 'react'
import { FormationSelector } from './components/FormationSelector/FormationSelector'
import { Header } from './components/Header/Header'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Field } from './components/Field/Field'
import { Notes } from './components/Notes/Notes'
import { PlayControls } from './components/PlayControls/PlayControls'
import { PlayerAssignmentPanel } from './components/PlayerAssignmentPanel/PlayerAssignmentPanel'
import {
  DrawingModeSelector,
  type DrawingMode,
} from './components/DrawingModeSelector/DrawingModeSelector'
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
  getFormationLabel,
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
import { getMirrorPartner, mirrorFootballPlay } from './utils/footballMirror'
import './App.css'

function App() {
  const [play, setPlay] = useState<Play>(createEmptyPlay)
  const [savedPlays, setSavedPlays] = useState<Play[]>([])
  const [customFormations, setCustomFormations] = useState<CustomFormation[]>([])
  const [playFilterId, setPlayFilterId] = useState<PlayFilterId>(ALL_PLAYS_FILTER)
  const [selectedLoadId, setSelectedLoadId] = useState('')
  const [activeSavedPlayId, setActiveSavedPlayId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerLabel | null>(null)
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('route')

  useEffect(() => {
    setSavedPlays(getAllSavedPlays())
    setCustomFormations(getCustomFormations())
  }, [])

  const filterOptions = useMemo(
    () => getPlayFilterOptions(customFormations),
    [customFormations],
  )

  const filteredPlays = useMemo(
    () => filterPlaysByFormation(savedPlays, playFilterId),
    [savedPlays, playFilterId],
  )

  function refreshSavedPlays() {
    setSavedPlays(getAllSavedPlays())
  }

  function refreshCustomFormations() {
    setCustomFormations(getCustomFormations())
  }

  function showSaveMessage(message: string) {
    setSaveMessage(message)
    setTimeout(() => setSaveMessage(''), 2500)
  }

  /** Attach current formationId and formationName before writing to localStorage. */
  function preparePlayForSave(current: Play): Play {
    const snapshot = withFormationSnapshot(current, customFormations)
    return { ...current, ...snapshot }
  }

  function handleNewPlay() {
    setPlay(createEmptyPlay())
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setSelectedPlayerId(null)
    setSaveMessage('')
  }

  function handlePlayNameChange(name: string) {
    setPlay((current) => ({ ...current, name }))
  }

  function handleSaveChanges() {
    const playToSave = preparePlayForSave(play)

    if (activeSavedPlayId) {
      const saved = upsertPlayById(playToSave, activeSavedPlayId)
      setPlay(saved)
      setSelectedLoadId(saved.id)
      refreshSavedPlays()
      showSaveMessage('Play saved.')
      return
    }

    const existingByName = findSavedPlayByName(play.name, savedPlays)
    if (existingByName) {
      const saved = upsertPlayById(playToSave, existingByName.id)
      setPlay(saved)
      setActiveSavedPlayId(saved.id)
      setSelectedLoadId(saved.id)
      refreshSavedPlays()
      showSaveMessage('Play saved.')
      return
    }

    const saved = upsertPlayById(playToSave, play.id)
    setPlay(saved)
    setActiveSavedPlayId(saved.id)
    setSelectedLoadId(saved.id)
    refreshSavedPlays()
    showSaveMessage('Play saved.')
  }

  function handleSaveAsNew() {
    let nameToUse = play.name

    if (findSavedPlayByName(nameToUse, savedPlays)) {
      const prompted = window.prompt(
        'That play name already exists. Enter a different name:',
        nameToUse,
      )

      if (!prompted || !prompted.trim()) {
        showSaveMessage('Save cancelled — name must be unique.')
        return
      }

      if (findSavedPlayByName(prompted, savedPlays)) {
        showSaveMessage('That name also exists. Please choose a unique name.')
        return
      }

      nameToUse = prompted.trim()
    }

    const saved = addNewPlay(preparePlayForSave({ ...play, name: nameToUse }))
    setPlay(saved)
    setActiveSavedPlayId(saved.id)
    setSelectedLoadId(saved.id)
    refreshSavedPlays()
    showSaveMessage('Play saved.')
  }

  function handleLoadPlay(playId: string) {
    if (!playId) {
      setSelectedLoadId('')
      setActiveSavedPlayId(null)
      return
    }

    const loaded = getPlayById(playId)
    if (!loaded) {
      showSaveMessage('Could not load that play.')
      refreshSavedPlays()
      return
    }

    // Load saved positions and formation — do not reset to formation preset.
    setPlay(loaded)
    setSelectedLoadId(playId)
    setActiveSavedPlayId(playId)
    setPlayFilterId(loaded.formationId)
    setSelectedPlayerId(null)
    showSaveMessage(`Loaded "${loaded.name}"`)
  }

  function handlePlayFilterChange(filterId: PlayFilterId) {
    setPlayFilterId(filterId)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
  }

  function handleDeletePlay() {
    if (!selectedLoadId) return

    const deletedId = selectedLoadId
    const playName = savedPlays.find((saved) => saved.id === deletedId)?.name ?? 'Play'

    deletePlayFromStorage(deletedId)
    refreshSavedPlays()
    setSelectedLoadId('')
    setActiveSavedPlayId(null)

    if (play.id === deletedId) {
      setPlay(createEmptyPlay())
      setSelectedPlayerId(null)
    }

    showSaveMessage(`Deleted "${playName}"`)
  }

  function handleMirrorPlay() {
    setPlay((current) => mirrorFootballPlay(current))
    setSelectedPlayerId((current) => (current ? getMirrorPartner(current) : null))
  }

  /** Selecting a formation loads its preset positions (built-in or custom). */
  function handleFormationChange(formationId: string) {
    const formation = getFormationById(formationId, customFormations)
    if (!formation) return

    setPlay((current) => ({
      ...current,
      formationId,
      formationName: formation.label,
      players: createPlayersForFormation(formationId, customFormations),
      routes: createEmptyRoutes(),
      blocks: createEmptyBlocks(),
      notes: current.notes,
      playerNotes: current.playerNotes,
      mirrored: false,
    }))
    setSelectedPlayerId(null)
  }

  /** Saves the current player alignment as a new custom formation. */
  function handleSaveCurrentFormation() {
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
      positions: positionsFromPlayers(play.players),
    }

    addCustomFormation(newFormation)
    refreshCustomFormations()

    setPlay((current) => ({
      ...current,
      formationId: newFormation.id,
      formationName: newFormation.label,
    }))

    showSaveMessage(`Formation "${newFormation.label}" saved.`)
  }

  function handleDeleteCustomFormation() {
    if (!isCustomFormationId(play.formationId)) return

    const label = play.formationName
    const confirmed = window.confirm(
      `Delete custom formation "${label}"?\n\nSaved plays using this formation will keep their saved positions.`,
    )
    if (!confirmed) return

    deleteCustomFormation(play.formationId)
    refreshCustomFormations()
    showSaveMessage(`Formation "${label}" deleted.`)
  }

  function handleNotesChange(notes: string) {
    setPlay((current) => ({ ...current, notes }))
  }

  function handlePlayerNotesChange(playerId: PlayerLabel, notes: string) {
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
  }

  function handlePlayerMove(playerId: PlayerLabel, position: Position) {
    setPlay((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === playerId ? { ...player, position } : player,
      ),
    }))
  }

  function handleRouteComplete(route: Route) {
    setPlay((current) => {
      const otherRoutes = current.routes.filter((r) => r.playerId !== route.playerId)
      return {
        ...current,
        routes: [...otherRoutes, route],
      }
    })
  }

  function handleBlockComplete(block: Block) {
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

      <main className="main">
        <Toolbar
          onNewPlay={handleNewPlay}
          onSaveChanges={handleSaveChanges}
          onSaveAsNew={handleSaveAsNew}
          onMirrorPlay={handleMirrorPlay}
          isMirrored={play.mirrored}
        />

        {saveMessage && <p className="save-message">{saveMessage}</p>}

        <FormationSelector
          value={play.formationId}
          formationName={play.formationName}
          customFormations={customFormations}
          onChange={handleFormationChange}
          onSaveCurrentFormation={handleSaveCurrentFormation}
          onDeleteCustomFormation={handleDeleteCustomFormation}
        />

        <PlayControls
          playName={play.name}
          onPlayNameChange={handlePlayNameChange}
          playFilterId={playFilterId}
          filterOptions={filterOptions}
          onPlayFilterChange={handlePlayFilterChange}
          filteredPlays={filteredPlays}
          selectedLoadId={selectedLoadId}
          onLoadPlay={handleLoadPlay}
          onDeletePlay={handleDeletePlay}
        />

        <DrawingModeSelector mode={drawingMode} onChange={setDrawingMode} />

        <div className="field-workspace">
          <Field
            players={play.players}
            routes={play.routes}
            blocks={play.blocks}
            playerNotes={play.playerNotes}
            drawingMode={drawingMode}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={handleSelectPlayer}
            onPlayerMove={handlePlayerMove}
            onRouteComplete={handleRouteComplete}
            onBlockComplete={handleBlockComplete}
          />

          <PlayerAssignmentPanel
            selectedPlayerId={selectedPlayerId}
            playerNotes={play.playerNotes}
            onPlayerNotesChange={handlePlayerNotesChange}
          />
        </div>

        <Notes value={play.notes} onChange={handleNotesChange} />
      </main>
    </div>
  )
}

export default App
