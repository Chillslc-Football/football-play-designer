import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useCanEdit } from './hooks/useCanEdit'
import { useTeam } from './hooks/useTeam'
import * as formationRepository from './repositories/formationRepository'
import * as cloudPlayRepository from './repositories/playRepository'
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog'
import { Header } from './components/Header/Header'
import { Field } from './components/Field/Field'
import { APP_DISPLAY_THEME } from './constants/appDisplayTheme'
import { PlaySetupPanel } from './components/PlaySetupPanel/PlaySetupPanel'
import { type DrawingMode } from './components/DrawingModeSelector/DrawingModeSelector'
import { createEmptyMotions, type Motion, type MotionType } from './types/motion'
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
  updateCustomFormation,
  type CustomFormation,
} from './utils/formationStorage'
import { DEFAULT_FORMATION_ID } from './data/builtinFormations'
import { DEFAULT_FRONT_ID } from './data/builtinFronts'
import {
  ALL_CATEGORIES_FILTER,
  filterCategoriesForPlayType,
  filterPlaysByCategory,
  filterPlaysByPlayType,
  getAvailableCategories,
  getCategoryFilterOptions,
  isDefaultCategory,
  normalizeCategories,
  removeCategoryFromPlay,
  type CategoryFilterId,
} from './utils/categoryUtils'
import {
  createDefendersForFront,
  filterPlaysByFront,
  getFrontById,
  getFrontFilterOptions,
  withFrontSnapshot,
} from './utils/frontUtils'
import {
  addCustomCategory,
  deleteCustomCategory,
  getCustomCategories,
} from './utils/categoryStorage'
import { hasFormationPositionChanges } from './utils/formationDirty'
import { playToComparable } from './utils/playDirty'
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
  removeCategoryFromAllPlays,
  upsertPlayById,
} from './utils/playStorage'
import { getDefenderMirrorPartner } from './utils/defenseMirror'
import { getMirrorPartner, mirrorFootballPlay } from './utils/footballMirror'
import {
  clampDefensePosition,
  clampOffensePosition,
  isBackfieldLimitExceeded,
  isInBackfield,
  resolveOffensePlayerPosition,
} from './utils/losClamp'
import { COORDINATE_SPACE_RENDER } from './utils/positionCoordinates'
import './App.css'

type PendingAction =
  | { type: 'newPlay' }
  | { type: 'loadPlay'; playId: string }
  | { type: 'switchTeam'; teamId: string }
  | { type: 'switchFormation'; formationId: string }
  | { type: 'switchFront'; frontId: string }
  | { type: 'logout' }
  | { type: 'saveAsNew' }
  | { type: 'deletePlay' }
  | { type: 'saveFormation' }

type DialogState =
  | { kind: 'delete-play' }
  | { kind: 'delete-formation' }
  | { kind: 'unsaved-play'; action: PendingAction }
  | { kind: 'unsaved-formation'; action: PendingAction }
  | null

const UNSAVED_MESSAGE = 'You have unsaved changes. Save before continuing?'

function App() {
  const { user, signOut } = useAuth()
  const { activeTeamId, switchTeam } = useTeam()
  const canEdit = useCanEdit()
  const useCloud = Boolean(user?.id && activeTeamId)

  const [play, setPlay] = useState<Play>(createEmptyPlay)
  const [savedPlays, setSavedPlays] = useState<Play[]>([])
  const [customFormations, setCustomFormations] = useState<CustomFormation[]>([])
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [playFilterId, setPlayFilterId] = useState<PlayFilterId>(ALL_PLAYS_FILTER)
  const [categoryFilterId, setCategoryFilterId] = useState<CategoryFilterId>(ALL_CATEGORIES_FILTER)
  const [selectedLoadId, setSelectedLoadId] = useState('')
  const [activeSavedPlayId, setActiveSavedPlayId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerLabel | null>(null)
  const [selectedDefenderId, setSelectedDefenderId] = useState<DefenderLabel | null>(null)
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('route')
  const [motionType, setMotionType] = useState<MotionType>('jog')
  const [setupPanelOpen, setSetupPanelOpen] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [playBaseline, setPlayBaseline] = useState(() => playToComparable(createEmptyPlay()))
  const [dialog, setDialog] = useState<DialogState>(null)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)

  const showSaveMessage = useCallback((message: string) => {
    setSaveMessage(message)
    setTimeout(() => setSaveMessage(''), 3500)
  }, [])

  const preparePlayForSave = useCallback(
    (current: Play): Play => {
      const categories = normalizeCategories(current.categories)
      const renderPlay: Play = {
        ...current,
        positionFormat: COORDINATE_SPACE_RENDER,
        categories,
      }

      if (current.playType === 'defensive') {
        return {
          ...renderPlay,
          ...withFrontSnapshot(current),
        }
      }

      return {
        ...renderPlay,
        ...withFormationSnapshot(current, customFormations),
      }
    },
    [customFormations],
  )

  function syncEditorAfterSave(editorPlay: Play, savedId: string) {
    const nextPlay: Play = {
      ...editorPlay,
      id: savedId,
      positionFormat: COORDINATE_SPACE_RENDER,
    }
    setPlay(nextPlay)
    updatePlayBaseline(nextPlay)
    setActiveSavedPlayId(savedId)
    setSelectedLoadId(savedId)
  }

  const updatePlayBaseline = useCallback(
    (nextPlay: Play) => {
      setPlayBaseline(playToComparable(preparePlayForSave(nextPlay)))
    },
    [preparePlayForSave],
  )

  const userId = user?.id ?? null
  const loadRequestRef = useRef(0)

  const resetEditor = useCallback(() => {
    const empty = createEmptyPlay()
    setPlay(empty)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
    setPlayFilterId(ALL_PLAYS_FILTER)
    setCategoryFilterId(ALL_CATEGORIES_FILTER)
    setCustomCategories(getCustomCategories(activeTeamId ?? null))
    setPlayBaseline(playToComparable(empty))
  }, [activeTeamId])

  const loadTeamData = useCallback(async () => {
    const requestId = ++loadRequestRef.current

    if (!userId || !activeTeamId) {
      setDataLoading(false)
      setSavedPlays(getAllSavedPlays())
      setCustomFormations(getCustomFormations())
      setCustomCategories(getCustomCategories(null))
      return
    }

    setDataLoading(true)
    try {
      const formations = await formationRepository.getFormationsByTeam(activeTeamId)
      if (requestId !== loadRequestRef.current) return

      setCustomFormations(formations)
      const plays = await cloudPlayRepository.getPlaysByTeam(activeTeamId, formations)
      if (requestId !== loadRequestRef.current) return

      setSavedPlays(plays)
      setCustomCategories(getCustomCategories(activeTeamId))
    } catch (error) {
      if (requestId !== loadRequestRef.current) return

      const message =
        error instanceof Error ? error.message : 'Failed to load team plays and formations.'
      showSaveMessage(message)
      setSavedPlays([])
      setCustomFormations([])
      setCustomCategories(getCustomCategories(activeTeamId))
    } finally {
      if (requestId === loadRequestRef.current) {
        setDataLoading(false)
      }
    }
  }, [activeTeamId, showSaveMessage, userId])

  useEffect(() => {
    resetEditor()
    void loadTeamData()
  }, [activeTeamId, userId])

  const playsForMode = useMemo(
    () => filterPlaysByPlayType(savedPlays, play.playType),
    [savedPlays, play.playType],
  )

  const formationFilterOptions = useMemo(
    () =>
      play.playType === 'defensive'
        ? getFrontFilterOptions()
        : getPlayFilterOptions(customFormations),
    [play.playType, customFormations],
  )

  const categoryFilterOptions = useMemo(
    () => getCategoryFilterOptions(play.playType, customCategories, playsForMode),
    [play.playType, customCategories, playsForMode],
  )

  const availableCategories = useMemo(
    () => getAvailableCategories(play.playType, customCategories, playsForMode),
    [play.playType, customCategories, playsForMode],
  )

  const filteredPlays = useMemo((): Play[] => {
    const byCategory = filterPlaysByCategory(playsForMode, categoryFilterId)

    if (play.playType === 'defensive') {
      return filterPlaysByFront(byCategory, playFilterId)
    }

    return filterPlaysByFormation(byCategory, playFilterId)
  }, [playsForMode, play.playType, playFilterId, categoryFilterId])

  const hasUnsavedPlayChanges = useMemo(() => {
    if (!canEdit) return false
    return playToComparable(preparePlayForSave(play)) !== playBaseline
  }, [canEdit, play, playBaseline, preparePlayForSave])

  const formationHasUnsavedChanges = useMemo(
    () => hasFormationPositionChanges(play.formationId, play.players, customFormations),
    [play.formationId, play.players, customFormations],
  )

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (hasUnsavedPlayChanges || formationHasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formationHasUnsavedChanges, hasUnsavedPlayChanges])

  function needsPlayGuard(action: PendingAction): boolean {
    return (
      action.type === 'newPlay' ||
      action.type === 'loadPlay' ||
      action.type === 'switchTeam' ||
      action.type === 'switchFormation' ||
      action.type === 'switchFront' ||
      action.type === 'logout' ||
      action.type === 'saveAsNew' ||
      action.type === 'deletePlay'
    )
  }

  function needsFormationGuard(action: PendingAction): boolean {
    return action.type === 'switchFormation' || action.type === 'saveFormation'
  }

  function requestAction(action: PendingAction) {
    if (needsPlayGuard(action) && hasUnsavedPlayChanges) {
      setDialog({ kind: 'unsaved-play', action })
      return
    }

    if (needsFormationGuard(action) && formationHasUnsavedChanges) {
      setDialog({ kind: 'unsaved-formation', action })
      return
    }

    void executeAction(action)
  }

  function executeNewPlay() {
    const empty = createEmptyPlay(play.playType)
    console.log('CREATE NEW PLAY players', {
      players: empty.players.map((player) => ({ id: player.id, ...player.position })),
      defenders: empty.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
    })
    setPlay(empty)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
    setSaveMessage('')
    updatePlayBaseline(empty)
  }

  function handleNewPlay() {
    if (!canEdit) return
    requestAction({ type: 'newPlay' })
  }

  function handlePlayNameChange(name: string) {
    setPlay((current) => ({ ...current, name }))
  }

  function handlePlayCategoriesChange(categories: string[]) {
    if (!canEdit) return
    setPlay((current) => ({ ...current, categories: normalizeCategories(categories) }))
  }

  function handleAddCustomCategory(name: string): boolean {
    const updated = addCustomCategory(activeTeamId ?? null, name)
    setCustomCategories(updated)
    return updated.some((entry) => entry.toLowerCase() === name.trim().toLowerCase())
  }

  async function handleDeletePlayCategory(categoryName: string) {
    if (!canEdit || isDefaultCategory(categoryName, play.playType)) return

    setDeletingCategory(true)

    try {
      const affectedPlays = savedPlays.filter((saved) => saved.categories.includes(categoryName))

      if (useCloud && activeTeamId) {
        for (const saved of affectedPlays) {
          const updatedPlay = preparePlayForSave(removeCategoryFromPlay(saved, categoryName))
          await cloudPlayRepository.updatePlay(
            activeTeamId,
            updatedPlay,
            customFormations,
            user?.id,
          )
        }
      } else if (affectedPlays.length > 0) {
        removeCategoryFromAllPlays(categoryName)
      }

      setCustomCategories(deleteCustomCategory(activeTeamId ?? null, categoryName))

      const updatedCurrentPlay = removeCategoryFromPlay(play, categoryName)
      setPlay(updatedCurrentPlay)
      if (activeSavedPlayId) {
        updatePlayBaseline(updatedCurrentPlay)
      }

      if (categoryFilterId === categoryName) {
        setCategoryFilterId(ALL_CATEGORIES_FILTER)
      }

      if (useCloud && activeTeamId) {
        await loadTeamData()
      } else {
        setSavedPlays(getAllSavedPlays())
      }

      showSaveMessage(`Category "${categoryName}" deleted.`)
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to delete category.')
    } finally {
      setDeletingCategory(false)
    }
  }

  function handleCategoryFilterChange(filterId: CategoryFilterId) {
    setCategoryFilterId(filterId)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
  }

  async function executeSaveChanges(): Promise<boolean> {
    if (!canEdit || isSavingRef.current) return false

    isSavingRef.current = true
    setIsSaving(true)

    const playToSave = preparePlayForSave(play)

    try {
      if (useCloud && activeTeamId) {
        const existingByName = cloudPlayRepository.findSavedPlayByName(play.name, savedPlays)
        const saveId = activeSavedPlayId ?? existingByName?.id ?? play.id

        await cloudPlayRepository.upsertPlay(
          activeTeamId,
          { ...playToSave, id: saveId },
          saveId,
          customFormations,
          user?.id,
        )
        syncEditorAfterSave(play, saveId)
        await loadTeamData()
        showSaveMessage('Play saved.')
        return true
      }

      if (activeSavedPlayId) {
        upsertPlayById(playToSave, activeSavedPlayId)
        syncEditorAfterSave(play, activeSavedPlayId)
        setSavedPlays(getAllSavedPlays())
        showSaveMessage('Play saved.')
        return true
      }

      const existingByName = findSavedPlayByName(play.name, savedPlays)
      if (existingByName) {
        upsertPlayById(playToSave, existingByName.id)
        syncEditorAfterSave(play, existingByName.id)
        setSavedPlays(getAllSavedPlays())
        showSaveMessage('Play saved.')
        return true
      }

      upsertPlayById(playToSave, play.id)
      syncEditorAfterSave(play, play.id)
      setSavedPlays(getAllSavedPlays())
      showSaveMessage('Play saved.')
      return true
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to save play.')
      return false
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  async function handleSaveChanges() {
    await executeSaveChanges()
  }

  async function executeSaveAsNew() {
    if (!canEdit || isSavingRef.current) return

    isSavingRef.current = true
    setIsSaving(true)

    try {
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
      if (useCloud && activeTeamId) {
        const saved = await cloudPlayRepository.addNewPlay(
          activeTeamId,
          preparePlayForSave({ ...play, name: nameToUse }),
          customFormations,
          user?.id,
        )
        syncEditorAfterSave({ ...play, name: nameToUse }, saved.id)
        await loadTeamData()
        showSaveMessage('Play saved.')
        return
      }

      const saved = addNewPlay(preparePlayForSave({ ...play, name: nameToUse }))
      syncEditorAfterSave({ ...play, name: nameToUse }, saved.id)
      setSavedPlays(getAllSavedPlays())
      showSaveMessage('Play saved.')
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to save play.')
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  function handleSaveAsNew() {
    if (!canEdit) return
    requestAction({ type: 'saveAsNew' })
  }

  async function executeLoadPlay(playId: string) {
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

      console.log('SET editing players', {
        players: loaded.players.map((player) => ({ id: player.id, ...player.position })),
        defenders: loaded.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
      })
      setPlay(loaded)
      setSelectedLoadId(playId)
      setActiveSavedPlayId(playId)
      setPlayFilterId(
        loaded.playType === 'defensive' ? loaded.frontId : loaded.formationId,
      )
      setSelectedPlayerId(null)
      setSelectedDefenderId(null)
      updatePlayBaseline(loaded)
      if (loaded.playType === 'defensive') {
        setDrawingMode('route')
      }
      showSaveMessage(`Loaded "${loaded.name}"`)
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to load play.')
    }
  }

  function handleLoadPlay(playId: string) {
    if (!playId) {
      setSelectedLoadId('')
      setActiveSavedPlayId(null)
      return
    }

    if (playId === activeSavedPlayId) return

    requestAction({ type: 'loadPlay', playId })
  }

  function handlePlayFilterChange(filterId: PlayFilterId) {
    setPlayFilterId(filterId)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
  }

  async function executeDeletePlay() {
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

      if (play.id === deletedId || activeSavedPlayId === deletedId) {
        const empty = createEmptyPlay(play.playType)
        setPlay(empty)
        setSelectedPlayerId(null)
        setSelectedDefenderId(null)
        updatePlayBaseline(empty)
      }

      showSaveMessage(`Deleted "${playName}"`)
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to delete play.')
    }
  }

  function handleDeletePlay() {
    if (!selectedLoadId || !canEdit) return

    const isOpenPlay =
      selectedLoadId === activeSavedPlayId ||
      selectedLoadId === play.id ||
      activeSavedPlayId === selectedLoadId

    if (isOpenPlay && hasUnsavedPlayChanges) {
      requestAction({ type: 'deletePlay' })
      return
    }

    setDialog({ kind: 'delete-play' })
  }

  function handleMirrorPlay() {
    if (!canEdit) return
    setPlay((current) => mirrorFootballPlay(current))
    setSelectedPlayerId((current) => (current ? getMirrorPartner(current) : null))
    setSelectedDefenderId((current) => (current ? getDefenderMirrorPartner(current) : null))
  }

  function handlePlayTypeChange(playType: PlayType) {
    if (!canEdit) return

    setPlayFilterId(ALL_PLAYS_FILTER)
    setCategoryFilterId(ALL_CATEGORIES_FILTER)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)

    if (playType === 'defensive' && (drawingMode === 'block' || drawingMode === 'motion')) {
      setDrawingMode('route')
    }

    setPlay((current) => {
      if (playType === 'defensive') {
        const front = getFrontById(current.frontId) ?? getFrontById(DEFAULT_FRONT_ID)
        if (!front) return { ...current, playType }

        return {
          ...current,
          playType,
          frontId: front.id,
          frontName: front.label,
          defenders: createDefendersForFront(front.id),
          defenderRoutes: createEmptyDefenderRoutes(),
          categories: filterCategoriesForPlayType(current.categories, 'defensive'),
        }
      }

      const formation =
        getFormationById(current.formationId, customFormations) ??
        getFormationById(DEFAULT_FORMATION_ID, customFormations)

      return {
        ...current,
        playType,
        formationId: formation?.id ?? current.formationId,
        formationName: formation?.label ?? current.formationName,
        categories: filterCategoriesForPlayType(current.categories, 'offensive'),
      }
    })
  }

  function handleDriveStartChange(driveStartYardLine: DriveStartYardLine) {
    if (!canEdit) return
    setPlay((current) => ({ ...current, driveStartYardLine }))
  }

  function executeFormationChange(formationId: string) {
    const formation = getFormationById(formationId, customFormations)
    if (!formation) return

    const players = createPlayersForFormation(formationId, customFormations).map((player) => ({
      ...player,
      position: clampOffensePosition(player.position),
    }))

    setPlay((current) => {
      const next = {
        ...current,
        formationId,
        formationName: formation.label,
        players,
        routes: createEmptyRoutes(),
        blocks: createEmptyBlocks(),
        motions: createEmptyMotions(),
        defenderRoutes: createEmptyDefenderRoutes(),
        notes: current.notes,
        playerNotes: current.playerNotes,
        mirrored: false,
      }
      return next
    })
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
  }

  function handleFormationChange(formationId: string) {
    if (!canEdit) return
    if (formationId === play.formationId) return

    requestAction({ type: 'switchFormation', formationId })
  }

  function executeFrontChange(frontId: string) {
    const front = getFrontById(frontId)
    if (!front) return

    const defenders = createDefendersForFront(frontId).map((defender) => ({
      ...defender,
      position: clampDefensePosition(defender.position),
    }))

    setPlay((current) => ({
      ...current,
      frontId,
      frontName: front.label,
      defenders,
      defenderRoutes: createEmptyDefenderRoutes(),
    }))
    setSelectedDefenderId(null)
  }

  function handleFrontChange(frontId: string) {
    if (!canEdit) return
    if (frontId === play.frontId) return

    requestAction({ type: 'switchFront', frontId })
  }

  async function executeSaveFormationPositions(): Promise<boolean> {
    if (!canEdit || !isCustomFormationId(play.formationId, customFormations)) return false

    const formation = customFormations.find((entry) => entry.id === play.formationId)
    if (!formation) return false

    if (isBackfieldLimitExceeded(play.players)) {
      showSaveMessage('Formation cannot be saved — maximum 5 players in the backfield.')
      return false
    }

    const updatedFormation: CustomFormation = {
      ...formation,
      positions: positionsFromPlayers(
        play.players.map((player) => ({
          ...player,
          position: clampOffensePosition(player.position),
        })),
      ),
    }

    try {
      if (useCloud && activeTeamId) {
        await formationRepository.updateFormation(activeTeamId, updatedFormation, user?.id)
        await loadTeamData()
      } else {
        updateCustomFormation(updatedFormation)
        setCustomFormations(getCustomFormations())
      }

      showSaveMessage(`Formation "${updatedFormation.label}" saved.`)
      return true
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to save formation.')
      return false
    }
  }

  async function executeSaveNewFormation() {
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

    if (isBackfieldLimitExceeded(play.players)) {
      showSaveMessage('Formation cannot be saved — maximum 5 players in the backfield.')
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

  function handleSaveCurrentFormation() {
    if (!canEdit) return

    if (isCustomFormationId(play.formationId, customFormations) && formationHasUnsavedChanges) {
      requestAction({ type: 'saveFormation' })
      return
    }

    void executeSaveNewFormation()
  }

  async function executeDeleteCustomFormation() {
    if (!canEdit || !isCustomFormationId(play.formationId, customFormations)) return

    const label = play.formationName

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

  function handleDeleteCustomFormation() {
    if (!canEdit || !isCustomFormationId(play.formationId, customFormations)) return
    setDialog({ kind: 'delete-formation' })
  }

  async function executeAction(action: PendingAction) {
    switch (action.type) {
      case 'newPlay':
        executeNewPlay()
        break
      case 'loadPlay':
        await executeLoadPlay(action.playId)
        break
      case 'switchTeam': {
        const result = await switchTeam(action.teamId)
        if (result.error) {
          showSaveMessage('Failed to switch team.')
        }
        break
      }
      case 'switchFormation':
        executeFormationChange(action.formationId)
        break
      case 'switchFront':
        executeFrontChange(action.frontId)
        break
      case 'logout':
        await signOut()
        break
      case 'saveAsNew':
        await executeSaveAsNew()
        break
      case 'deletePlay':
        setDialog({ kind: 'delete-play' })
        break
      case 'saveFormation':
        showSaveMessage('Formation saved.')
        break
      default:
        break
    }
  }

  function handleTeamSwitchRequest(teamId: string) {
    if (!teamId || teamId === activeTeamId) return
    requestAction({ type: 'switchTeam', teamId })
  }

  function handleLogoutRequest() {
    requestAction({ type: 'logout' })
  }

  function closeDialog() {
    setDialog(null)
  }

  async function continuePendingAction(action: PendingAction) {
    if (needsFormationGuard(action) && formationHasUnsavedChanges) {
      setDialog({ kind: 'unsaved-formation', action })
      return
    }

    if (action.type === 'deletePlay') {
      setDialog({ kind: 'delete-play' })
      return
    }

    await executeAction(action)
  }

  async function handleUnsavedSave() {
    if (!dialog || isSavingRef.current) return

    if (dialog.kind === 'unsaved-play') {
      const action = dialog.action
      setDialog(null)

      if (action.type === 'saveAsNew') {
        await executeSaveAsNew()
        return
      }

      const saved = await executeSaveChanges()
      if (!saved) return
      await continuePendingAction(action)
      return
    }

    if (dialog.kind === 'unsaved-formation') {
      const action = dialog.action
      const saved = await executeSaveFormationPositions()
      if (!saved) return
      setDialog(null)
      if (action.type === 'saveFormation') {
        return
      }
      await executeAction(action)
    }
  }

  async function handleUnsavedDiscard() {
    if (!dialog) return

    const action =
      dialog.kind === 'unsaved-play' || dialog.kind === 'unsaved-formation'
        ? dialog.action
        : null

    setDialog(null)

    if (!action) return

    if (action.type === 'saveFormation') {
      await executeSaveNewFormation()
      return
    }

    await continuePendingAction(action)
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

    const clampedTarget = clampOffensePosition(position)
    let blockedBackfieldEntry = false

    setPlay((current) => {
      const previous = current.players.find((player) => player.id === playerId)?.position
      const nextPosition = resolveOffensePlayerPosition(current.players, playerId, position)

      blockedBackfieldEntry =
        Boolean(previous) &&
        !isInBackfield(previous!) &&
        isInBackfield(clampedTarget) &&
        !isInBackfield(nextPosition)

      return {
        ...current,
        players: current.players.map((player) =>
          player.id === playerId ? { ...player, position: nextPosition } : player,
        ),
      }
    })

    if (blockedBackfieldEntry) {
      showSaveMessage('Maximum 5 players in the backfield.')
    }
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

  function handleMotionComplete(motion: Motion) {
    if (!canEdit || play.playType !== 'offensive') return

    setPlay((current) => {
      const otherMotions = current.motions.filter((entry) => entry.playerId !== motion.playerId)
      return {
        ...current,
        motions:
          motion.points.length === 0 ? otherMotions : [...otherMotions, motion],
      }
    })
  }

  const dialogMessage =
    dialog?.kind === 'delete-play'
      ? 'Delete this play? This cannot be undone.'
      : dialog?.kind === 'delete-formation'
        ? 'Delete this formation? This cannot be undone.'
        : UNSAVED_MESSAGE

  const dialogVariant =
    dialog?.kind === 'delete-play' || dialog?.kind === 'delete-formation' ? 'delete' : 'unsaved'

  const dialogConfirmLabel =
    dialog?.kind === 'delete-formation' ? 'Delete Formation' : 'Delete Play'

  function handleDialogConfirm() {
    if (dialog?.kind === 'delete-play') {
      closeDialog()
      void executeDeletePlay()
      return
    }

    if (dialog?.kind === 'delete-formation') {
      closeDialog()
      void executeDeleteCustomFormation()
    }
  }

  return (
    <div className={`app app-theme-${APP_DISPLAY_THEME}`}>
      <ConfirmDialog
        open={dialog !== null}
        message={dialogMessage}
        variant={dialogVariant}
        confirmLabel={dialogConfirmLabel}
        onConfirm={handleDialogConfirm}
        onCancel={closeDialog}
        onSave={() => void handleUnsavedSave()}
        onDiscard={() => void handleUnsavedDiscard()}
      />

      <Header
        playType={play.playType}
        canEdit={canEdit}
        onPlayTypeChange={handlePlayTypeChange}
        onTeamChange={handleTeamSwitchRequest}
        onLogout={handleLogoutRequest}
      />

      <div className={`app-body ${setupPanelOpen ? '' : 'setup-collapsed'}`}>
        <PlaySetupPanel
          canEdit={canEdit}
          isOpen={setupPanelOpen}
          onToggle={() => setSetupPanelOpen((open) => !open)}
          formationId={play.formationId}
          formationName={play.formationName}
          frontId={play.frontId}
          frontName={play.frontName}
          driveStartYardLine={play.driveStartYardLine}
          customFormations={customFormations}
          onFormationChange={handleFormationChange}
          onFrontChange={handleFrontChange}
          onDriveStartChange={handleDriveStartChange}
          onSaveCurrentFormation={handleSaveCurrentFormation}
          onDeleteCustomFormation={handleDeleteCustomFormation}
          playName={play.name}
          onPlayNameChange={handlePlayNameChange}
          playCategories={play.categories}
          availableCategories={availableCategories}
          customCategories={customCategories}
          onPlayCategoriesChange={handlePlayCategoriesChange}
          onAddCustomCategory={handleAddCustomCategory}
          onDeleteCustomCategory={(category) => void handleDeletePlayCategory(category)}
          deletingCategory={deletingCategory}
          playFilterId={playFilterId}
          formationFilterOptions={formationFilterOptions}
          onPlayFilterChange={handlePlayFilterChange}
          categoryFilterId={categoryFilterId}
          categoryFilterOptions={categoryFilterOptions}
          onCategoryFilterChange={handleCategoryFilterChange}
          filteredPlays={filteredPlays}
          selectedLoadId={selectedLoadId}
          onLoadPlay={handleLoadPlay}
          onDeletePlay={handleDeletePlay}
          playType={play.playType}
          drawingMode={drawingMode}
          motionType={motionType}
          onMotionTypeChange={setMotionType}
          onDrawingModeChange={setDrawingMode}
          onNewPlay={handleNewPlay}
          onSaveChanges={handleSaveChanges}
          onSaveAsNew={handleSaveAsNew}
          onMirrorPlay={handleMirrorPlay}
          isMirrored={play.mirrored}
          isSaving={isSaving}
          selectedPlayerId={selectedPlayerId}
          playerNotes={play.playerNotes}
          onPlayerNotesChange={handlePlayerNotesChange}
          playNotes={play.notes}
          onPlayNotesChange={handleNotesChange}
        />

        <main className="canvas-area">
          {(saveMessage || dataLoading) && (
            <p className="save-message">
              {dataLoading ? 'Loading team plays and formations…' : saveMessage}
            </p>
          )}

          {!canEdit && !dataLoading && !saveMessage && (
            <p className="save-message save-message-readonly">View only — contact your coach to edit.</p>
          )}

          <div className="field-stage">
            <div className="field-column">
              <Field
                playType={play.playType}
                viewOnly={!canEdit}
                players={play.players}
                defenders={play.defenders}
                routes={play.routes}
                defenderRoutes={play.defenderRoutes}
                blocks={play.blocks}
                motions={play.motions ?? []}
                playerNotes={play.playerNotes}
                drawingMode={drawingMode}
                motionType={motionType}
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
                onMotionComplete={handleMotionComplete}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
