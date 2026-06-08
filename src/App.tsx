import { useState } from 'react'
import { FormationSelector } from './components/FormationSelector/FormationSelector'
import { Header } from './components/Header/Header'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Field } from './components/Field/Field'
import { Notes } from './components/Notes/Notes'
import { PlayerAssignmentPanel } from './components/PlayerAssignmentPanel/PlayerAssignmentPanel'
import {
  createPlayersForFormation,
  type FormationId,
} from './data/formations'
import { createEmptyPlay, type Play } from './types/play'
import { mirrorPlayers, type PlayerLabel, type Position } from './types/player'
import { createEmptyRoutes, mirrorRoutes, type Route } from './types/route'
import './App.css'

const STORAGE_KEY = 'football-play-designer-saved-play'

function App() {
  const [play, setPlay] = useState<Play>(createEmptyPlay)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerLabel | null>(null)

  function handleNewPlay() {
    setPlay(createEmptyPlay())
    setSelectedPlayerId(null)
    setSaveMessage('')
  }

  function handleSavePlay() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(play))
    setSaveMessage('Play saved!')
    setTimeout(() => setSaveMessage(''), 2500)
  }

  function handleMirrorPlay() {
    setPlay((current) => ({
      ...current,
      mirrored: !current.mirrored,
      players: mirrorPlayers(current.players),
      routes: mirrorRoutes(current.routes),
      // playerNotes are keyed by id — they stay with each player automatically.
    }))
  }

  function handleFormationChange(formationId: FormationId) {
    setPlay((current) => ({
      ...current,
      formation: formationId,
      players: createPlayersForFormation(formationId),
      routes: createEmptyRoutes(),
      // Play notes and per-player assignment notes are kept.
      notes: current.notes,
      playerNotes: current.playerNotes,
      mirrored: false,
    }))
    setSelectedPlayerId(null)
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
      // playerNotes unchanged — notes follow the player id, not the position.
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

  return (
    <div className="app">
      <Header />

      <main className="main">
        <Toolbar
          onNewPlay={handleNewPlay}
          onSavePlay={handleSavePlay}
          onMirrorPlay={handleMirrorPlay}
          isMirrored={play.mirrored}
        />

        {saveMessage && <p className="save-message">{saveMessage}</p>}

        <FormationSelector value={play.formation} onChange={handleFormationChange} />

        <div className="field-workspace">
          <Field
            players={play.players}
            routes={play.routes}
            playerNotes={play.playerNotes}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={handleSelectPlayer}
            onPlayerMove={handlePlayerMove}
            onRouteComplete={handleRouteComplete}
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
