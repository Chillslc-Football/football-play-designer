import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useSchemeTemplates } from './context/SchemeTemplateProvider'
import { useAppShell } from './context/AppShellContext'
import { useCanEdit } from './hooks/useCanEdit'
import { useTeam } from './hooks/useTeam'
import * as formationRepository from './repositories/formationRepository'
import * as cloudPlayRepository from './repositories/playRepository'
import * as schemeTemplateRepository from './repositories/schemeTemplateRepository'
import { AdminTemplateEditBar } from './components/AdminTemplateEditBar/AdminTemplateEditBar'
import { LoadPlayModal } from './components/LoadPlayModal/LoadPlayModal'
import { NewPlaySetupDialog, type PlaySetupDialogMode } from './components/NewPlaySetupDialog/NewPlaySetupDialog'
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog'
import { CategoryReminderDialog } from './components/CategoryReminderDialog/CategoryReminderDialog'
import { Field } from './components/Field/Field'
import { FieldZoomControl } from './components/FieldZoomControl/FieldZoomControl'
import { PageToolbarLayout } from './components/PageToolbarLayout/PageToolbarLayout'
import { PlayTypeSelector } from './components/PlayTypeSelector/PlayTypeSelector'
import { APP_DISPLAY_THEME } from './constants/appDisplayTheme'
import { PlaySetupPanel } from './components/PlaySetupPanel/PlaySetupPanel'
import { type DrawingMode } from './components/DrawingModeSelector/DrawingModeSelector'
import { createEmptyMotions, type MotionType } from './types/motion'
import type { DefenderLabel } from './types/defender'
import type { DefenderRoute } from './types/defenderRoute'
import { createEmptyDefenderRoutes } from './types/defenderRoute'
import type { PlayType } from './types/playType'
import type { DriveStartYardLine } from './types/driveStart'
import { createEmptyBlocks } from './types/block'
import {
  createEmptyPlay,
  duplicatePlay,
  type Play,
} from './types/play'
import {
  normalizePositionLabel,
  type PlayerLabel,
  type Position,
} from './types/player'
import type { PlayerAction, PlayerActionType } from './types/playerAction'
import { createEmptyPlayerActionChains } from './types/playerAction'
import {
  addCustomFormation,
  createCustomFormationId,
  deleteCustomFormation,
  getCustomFormations,
  updateCustomFormation,
  type CustomFormation,
} from './utils/formationStorage'
import { DEFAULT_FORMATION_ID } from './data/builtinFormations'
import { applyPlayerSpacing } from './utils/playerSpacing'
import {
  deleteAllPlayerActionsOfType,
  ensurePlayPlayerActions,
  flattenPlayerActionsToLegacy,
  upsertPlayerAction,
} from './utils/playerActionChains'
import { loadFieldZoom, saveFieldZoom, type FieldZoomValue } from './utils/fieldZoom'
import { loadFieldGrid, saveFieldGrid } from './utils/fieldGrid'
import { FieldGridControl } from './components/FieldGridControl/FieldGridControl'
import { createEmptyRoutes } from './types/route'
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
  positionLabelsFromPlayers,
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
  DUPLICATE_PLAY_NAME_MESSAGE,
  normalizePlayName,
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
import {
  createPlayForAdminTemplateEdit,
  positionsFromAdminTemplatePlay,
} from './utils/adminTemplateEditPlay'
import {
  clearPlayDesignerDraft,
  PLAY_DESIGNER_DRAFT_DEBOUNCE_MS,
  readPlayDesignerDraft,
  writePlayDesignerDraft,
} from './utils/playDesignerDraftStorage'
import {
  buildNewPlayFromSetup,
  applyPlaySetupEdit,
  getNewPlaySetupDefaults,
  getPlaySetupDefaultsFromPlay,
  type NewPlaySetupInput,
} from './utils/newPlaySetup'
import { useMediaQuery } from './hooks/useMediaQuery'
import './App.css'

const MOBILE_VIEWPORT_MEDIA = '(max-width: 768px)'

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
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_MEDIA)
  const { user, signOut } = useAuth()
  const shell = useAppShell()
  const adminTemplateEdit = shell?.adminTemplateEdit ?? null
  const { loading: schemeTemplatesLoading, refreshTemplates } = useSchemeTemplates()
  const { activeTeamId, switchTeam } = useTeam()
  const canEdit = useCanEdit()
  const fieldCanEdit = canEdit || Boolean(adminTemplateEdit)
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
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('position')
  const [motionType, setMotionType] = useState<MotionType>('jog')
  const [setupPanelOpen, setSetupPanelOpen] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [playBaseline, setPlayBaseline] = useState(() => playToComparable(createEmptyPlay()))
  const [dialog, setDialog] = useState<DialogState>(null)
  const [categoryReminderOpen, setCategoryReminderOpen] = useState(false)
  const [newPlaySetupOpen, setNewPlaySetupOpen] = useState(false)
  const [loadPlayModalOpen, setLoadPlayModalOpen] = useState(false)
  const [playSetupMode, setPlaySetupMode] = useState<PlaySetupDialogMode>('create')
  const [newPlaySetupDefaults, setNewPlaySetupDefaults] = useState(() =>
    getNewPlaySetupDefaults(createEmptyPlay()),
  )
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [templateCreateLabel, setTemplateCreateLabel] = useState('')
  const [templateSaving, setTemplateSaving] = useState(false)
  const [fieldZoom, setFieldZoom] = useState<FieldZoomValue>(() => loadFieldZoom())
  const [fieldGridEnabled, setFieldGridEnabled] = useState(() => loadFieldGrid())
  const [fieldToolbarHost, setFieldToolbarHost] = useState<HTMLDivElement | null>(null)
  const fieldWorkspaceRef = useRef<HTMLDivElement>(null)
  const isSavingRef = useRef(false)
  const editorInitializedForRef = useRef<string | null>(null)
  const prevActiveTeamIdRef = useRef<string | null>(activeTeamId)

  useEffect(() => {
    const workspace = fieldWorkspaceRef.current
    if (!workspace) return

    let frame = 0
    const centerScroll = () => {
      workspace.scrollLeft = Math.max(0, (workspace.scrollWidth - workspace.clientWidth) / 2)
      workspace.scrollTop = Math.max(0, (workspace.scrollHeight - workspace.clientHeight) / 2)
    }

    frame = requestAnimationFrame(() => {
      centerScroll()
      requestAnimationFrame(centerScroll)
    })

    return () => cancelAnimationFrame(frame)
  }, [fieldZoom])

  const showSaveMessage = useCallback((message: string) => {
    setSaveMessage(message)
    setTimeout(() => setSaveMessage(''), 3500)
  }, [])

  const preparePlayForSave = useCallback(
    (current: Play): Play => {
      const categories = normalizeCategories(current.categories)
      const renderPlay: Play = ensurePlayPlayerActions({
        ...current,
        positionFormat: COORDINATE_SPACE_RENDER,
        categories,
      })

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
    clearPlayDesignerDraft(user?.id ?? null, activeTeamId)
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
    void loadTeamData()
  }, [activeTeamId, userId])

  useEffect(() => {
    if (userId && prevActiveTeamIdRef.current && prevActiveTeamIdRef.current !== activeTeamId) {
      clearPlayDesignerDraft(userId, prevActiveTeamIdRef.current)
    }
    prevActiveTeamIdRef.current = activeTeamId
  }, [activeTeamId, userId])

  const editorScopeKey = userId && activeTeamId ? `${userId}:${activeTeamId}` : null

  useEffect(() => {
    if (schemeTemplatesLoading || adminTemplateEdit) return

    if (!editorScopeKey || !userId || !activeTeamId) {
      editorInitializedForRef.current = null
      resetEditor()
      return
    }

    if (editorInitializedForRef.current === editorScopeKey) {
      return
    }

    editorInitializedForRef.current = editorScopeKey

    const draft = readPlayDesignerDraft(userId, activeTeamId)
    if (draft) {
      const restoredPlay = ensurePlayPlayerActions(draft.play)
      setPlay(restoredPlay)
      setActiveSavedPlayId(draft.activeSavedPlayId)
      setSelectedLoadId(draft.selectedLoadId)
      setPlayBaseline(draft.playBaseline)
      setSelectedPlayerId(null)
      setSelectedDefenderId(null)
      setPlayFilterId(
        restoredPlay.playType === 'defensive' ? restoredPlay.frontId : restoredPlay.formationId,
      )
      console.log('[PlayDesigner] Restored session draft', {
        userId,
        activeTeamId,
        playId: restoredPlay.id,
        playName: restoredPlay.name,
        savedAt: new Date(draft.savedAt).toISOString(),
      })
      return
    }

    resetEditor()
  }, [
    activeTeamId,
    adminTemplateEdit,
    editorScopeKey,
    resetEditor,
    schemeTemplatesLoading,
    userId,
  ])

  useEffect(() => {
    if (!adminTemplateEdit) return

    setPlay(createPlayForAdminTemplateEdit(adminTemplateEdit))
    setSetupPanelOpen(false)
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setTemplateCreateLabel(adminTemplateEdit.mode === 'create' ? '' : adminTemplateEdit.label)
  }, [adminTemplateEdit])

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

  useEffect(() => {
    if (!userId || !activeTeamId || !canEdit || adminTemplateEdit) return

    if (!hasUnsavedPlayChanges) {
      clearPlayDesignerDraft(userId, activeTeamId)
      return
    }

    const timeoutId = window.setTimeout(() => {
      writePlayDesignerDraft({
        userId,
        activeTeamId,
        play,
        activeSavedPlayId,
        selectedLoadId,
        playBaseline,
      })
    }, PLAY_DESIGNER_DRAFT_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [
    activeSavedPlayId,
    activeTeamId,
    adminTemplateEdit,
    canEdit,
    hasUnsavedPlayChanges,
    play,
    playBaseline,
    selectedLoadId,
    userId,
  ])

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

  function findDuplicatePlayName(
    name: string,
    excludePlayId: string | null | undefined = activeSavedPlayId,
  ): Play | undefined {
    return useCloud
      ? cloudPlayRepository.findSavedPlayByName(name, savedPlays, excludePlayId)
      : findSavedPlayByName(name, savedPlays, excludePlayId)
  }

  const validateSetupPlayName = useCallback(
    (name: string): string | null => {
      if (playSetupMode === 'edit') return null

      const excludePlayId = playSetupMode === 'create' ? null : activeSavedPlayId
      return findDuplicatePlayName(name, excludePlayId)
        ? DUPLICATE_PLAY_NAME_MESSAGE
        : null
    },
    [playSetupMode, savedPlays, activeSavedPlayId, useCloud],
  )

  function openNewPlaySetup() {
    setPlaySetupMode('create')
    setNewPlaySetupDefaults(getNewPlaySetupDefaults(play))
    setNewPlaySetupOpen(true)
  }

  function openEditPlaySetup() {
    if (!canEdit) return
    setPlaySetupMode('edit')
    setNewPlaySetupDefaults(getPlaySetupDefaultsFromPlay(play))
    setNewPlaySetupOpen(true)
  }

  function openSaveAsDuplicateRecovery() {
    setCategoryReminderOpen(false)
    setPlaySetupMode('save-as')
    setNewPlaySetupDefaults(getPlaySetupDefaultsFromPlay(play))
    setNewPlaySetupOpen(true)
  }

  function handleNewPlaySetupCancel() {
    setNewPlaySetupOpen(false)
  }

  async function handleSaveAsSetupSubmit(setup: NewPlaySetupInput) {
    const updatedPlay = applyPlaySetupEdit(play, setup, customFormations)
    const saved = await executeSaveAsNew(updatedPlay, { openRecoveryOnDuplicate: false })
    if (saved) {
      setNewPlaySetupOpen(false)
    }
  }

  function handleNewPlaySetupSubmit(setup: NewPlaySetupInput) {
    if (playSetupMode === 'save-as') {
      void handleSaveAsSetupSubmit(setup)
      return
    }

    if (playSetupMode === 'edit') {
      const formationChanged =
        play.playType === 'offensive' &&
        setup.formationId !== '' &&
        setup.formationId !== play.formationId
      const frontChanged =
        setup.frontId !== null &&
        (setup.frontId !== play.frontId || play.defenders.length === 0)
      const opposingFormationChanged =
        play.playType === 'defensive' &&
        setup.formationId !== (play.opponentFormationId ?? '')

      const next = applyPlaySetupEdit(play, setup, customFormations)
      setPlay(next)

      if (formationChanged || frontChanged || opposingFormationChanged) {
        setSelectedPlayerId(null)
        setSelectedDefenderId(null)
      }

      setNewPlaySetupOpen(false)
      return
    }

    const next = buildNewPlayFromSetup(play, setup, customFormations)
    setPlay(next)
    setSelectedLoadId('')
    setActiveSavedPlayId(null)
    setSelectedPlayerId(null)
    setSelectedDefenderId(null)
    setSaveMessage('')
    updatePlayBaseline(next)
    clearPlayDesignerDraft(user?.id ?? null, activeTeamId)
    setNewPlaySetupOpen(false)
  }

  function executeNewPlay() {
    openNewPlaySetup()
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

  async function executeSaveAsNew(
    sourcePlay?: Play,
    options?: { openRecoveryOnDuplicate?: boolean },
  ): Promise<boolean> {
    if (!canEdit || isSavingRef.current) return false

    const playToSaveAs = sourcePlay ?? play
    const openRecoveryOnDuplicate = options?.openRecoveryOnDuplicate ?? true

    isSavingRef.current = true
    setIsSaving(true)

    try {
      if (findDuplicatePlayName(playToSaveAs.name)) {
        if (openRecoveryOnDuplicate) {
          openSaveAsDuplicateRecovery()
          showSaveMessage(DUPLICATE_PLAY_NAME_MESSAGE)
        }
        return false
      }

      const duplicatedPlay = duplicatePlay(playToSaveAs, normalizePlayName(playToSaveAs.name))
      const preparedPlay = preparePlayForSave(duplicatedPlay)

      if (useCloud && activeTeamId) {
        const saved = await cloudPlayRepository.addNewPlay(
          activeTeamId,
          preparedPlay,
          customFormations,
          user?.id,
        )
        syncEditorAfterSave(duplicatedPlay, saved.id)
        setSelectedPlayerId(null)
        setSelectedDefenderId(null)
        await loadTeamData()
        showSaveMessage('Play saved.')
        return true
      }

      const saved = addNewPlay(preparedPlay)
      syncEditorAfterSave(duplicatedPlay, saved.id)
      setSelectedPlayerId(null)
      setSelectedDefenderId(null)
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

  async function proceedSaveAsNew() {
    if (!canEdit || isSavingRef.current) return

    if (normalizeCategories(play.categories).length === 0) {
      setCategoryReminderOpen(true)
      return
    }

    await executeSaveAsNew()
  }

  function handleCategoryReminderCancel() {
    setCategoryReminderOpen(false)
  }

  async function handleCategoryReminderSaveWithoutCategory() {
    const saved = await executeSaveAsNew()
    if (saved) {
      setCategoryReminderOpen(false)
    }
  }

  async function handleCategoryReminderSaveWithCategory(categories: string[]) {
    const normalized = normalizeCategories(categories)
    const playWithCategories = { ...play, categories: normalized }
    setPlay(playWithCategories)
    const saved = await executeSaveAsNew(playWithCategories)
    if (saved) {
      setCategoryReminderOpen(false)
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
      setPlay(ensurePlayPlayerActions(loaded))
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

  function handleOpenLoadPlayModal() {
    setLoadPlayModalOpen(true)
  }

  function handleLoadPlayFromModal(playId: string) {
    setLoadPlayModalOpen(false)
    handleLoadPlay(playId)
  }

  function handleLoadPlayModalClose() {
    setLoadPlayModalOpen(false)
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

    if (playType === 'defensive' && (drawingMode === 'block' || drawingMode === 'motion' || drawingMode === 'position')) {
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
        playerActions: createEmptyPlayerActionChains(),
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

  function handleOpponentFrontChange(frontId: string) {
    if (!canEdit) return
    const front = getFrontById(frontId)
    if (!front) return

    setPlay((current) => ({
      ...current,
      frontId,
      frontName: front.label,
    }))
  }

  function handleOpponentFormationChange(formationId: string) {
    if (!canEdit) return
    const formation = getFormationById(formationId, customFormations)
    if (!formation) return

    setPlay((current) => ({
      ...current,
      formationId,
      formationName: formation.label,
    }))
  }

  function handleLoadDefensiveFront() {
    if (!canEdit || play.playType !== 'offensive' || play.defenders.length > 0) return
    executeFrontChange(play.frontId)
  }

  function executeLoadOpposingFormation() {
    const formation = getFormationById(play.formationId, customFormations)
    if (!formation) return

    const players = createPlayersForFormation(play.formationId, customFormations).map((player) => ({
      ...player,
      position: clampOffensePosition(player.position),
    }))

    setPlay((current) => ({
      ...current,
      formationId: formation.id,
      formationName: formation.label,
      players,
    }))
    setSelectedPlayerId(null)
  }

  function handleLoadOffensiveFormation() {
    if (!canEdit || play.playType !== 'defensive' || play.players.length > 0) return
    executeLoadOpposingFormation()
  }

  function handleRemoveDefensiveFront() {
    if (!canEdit || play.playType !== 'offensive' || play.defenders.length === 0) return

    setPlay((current) => ({
      ...current,
      defenders: [],
      defenderRoutes: createEmptyDefenderRoutes(),
    }))
    setSelectedDefenderId(null)
  }

  function handleRemoveOffensiveFormation() {
    if (!canEdit || play.playType !== 'defensive' || play.players.length === 0) return

    setPlay((current) => ({
      ...current,
      players: [],
    }))
    setSelectedPlayerId(null)
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
      positionLabels: positionLabelsFromPlayers(play.players),
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
      positionLabels: positionLabelsFromPlayers(play.players),
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
        await proceedSaveAsNew()
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
        await proceedSaveAsNew()
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

    if (action.type === 'newPlay' || action.type === 'loadPlay') {
      clearPlayDesignerDraft(userId, activeTeamId)
    }

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

  function handlePlayerLabelChange(playerId: PlayerLabel, label: string) {
    if (!canEdit) return
    const normalized = normalizePositionLabel(label)
    setPlay((current) => ({
      ...current,
      players: current.players.map((player) =>
        player.id === playerId ? { ...player, label: normalized } : player,
      ),
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
    if (!fieldCanEdit || play.playType !== 'offensive') return

    const clampedTarget = clampOffensePosition(position)
    let blockedBackfieldEntry = false

    setPlay((current) => {
      const previous = current.players.find((player) => player.id === playerId)?.position
      const spacedPosition = applyPlayerSpacing(current.players, playerId, position)
      const nextPosition = resolveOffensePlayerPosition(current.players, playerId, spacedPosition)

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
    if (!fieldCanEdit || play.playType !== 'defensive') return

    setPlay((current) => {
      const spacedPosition = applyPlayerSpacing(current.defenders, defenderId, position)
      const nextPosition = clampDefensePosition(spacedPosition)

      return {
        ...current,
        defenders: current.defenders.map((defender) =>
          defender.id === defenderId ? { ...defender, position: nextPosition } : defender,
        ),
      }
    })
  }

  function handlePlayerActionComplete(playerId: PlayerLabel, action: PlayerAction) {
    if (!fieldCanEdit || play.playType !== 'offensive' || adminTemplateEdit) return

    setPlay((current) => {
      const updatedPlayerActions = upsertPlayerAction(
        current.playerActions ?? {},
        playerId,
        action,
      )
      const legacy = flattenPlayerActionsToLegacy(updatedPlayerActions)

      return ensurePlayPlayerActions({
        ...current,
        playerActions: updatedPlayerActions,
        routes: legacy.routes,
        blocks: legacy.blocks,
        motions: legacy.motions,
      })
    })
  }

  function handleDeleteAllPlayerActionsOfType(playerId: PlayerLabel, type: PlayerActionType) {
    if (!fieldCanEdit || play.playType !== 'offensive' || adminTemplateEdit) return

    setPlay((current) => {
      const updatedPlayerActions = deleteAllPlayerActionsOfType(
        current.playerActions ?? {},
        playerId,
        type,
      )
      const legacy = flattenPlayerActionsToLegacy(updatedPlayerActions)

      return ensurePlayPlayerActions({
        ...current,
        playerActions: updatedPlayerActions,
        routes: legacy.routes,
        blocks: legacy.blocks,
        motions: legacy.motions,
      })
    })
  }

  function handleDefenderRouteComplete(route: DefenderRoute) {
    if (!fieldCanEdit || play.playType !== 'defensive' || adminTemplateEdit) return

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

  async function handleSaveAdminTemplate() {
    if (!adminTemplateEdit || !shell) return

    const label =
      adminTemplateEdit.mode === 'create'
        ? templateCreateLabel.trim()
        : adminTemplateEdit.label.trim()

    if (!label) {
      showSaveMessage('Template name is required.')
      return
    }

    setTemplateSaving(true)

    try {
      const extracted = positionsFromAdminTemplatePlay(play, adminTemplateEdit.kind)
      const slug =
        adminTemplateEdit.mode === 'edit' && adminTemplateEdit.slug
          ? adminTemplateEdit.slug
          : schemeTemplateRepository.slugifyTemplateLabel(label)

      if (adminTemplateEdit.kind === 'formation') {
        const input = {
          slug,
          label,
          positions: extracted.positions as Record<PlayerLabel, Position>,
          positionLabels:
            extracted.positionLabels && Object.keys(extracted.positionLabels).length > 0
              ? extracted.positionLabels
              : undefined,
        }

        if (adminTemplateEdit.recordId) {
          await schemeTemplateRepository.updateFormationTemplate(adminTemplateEdit.recordId, input)
        } else {
          await schemeTemplateRepository.createFormationTemplate(input, user?.id)
        }
      } else {
        const input = {
          slug,
          label,
          positions: extracted.positions as Record<DefenderLabel, Position>,
        }

        if (adminTemplateEdit.recordId) {
          await schemeTemplateRepository.updateDefensiveFrontTemplate(adminTemplateEdit.recordId, input)
        } else {
          await schemeTemplateRepository.createDefensiveFrontTemplate(input, user?.id)
        }
      }

      await refreshTemplates()
      shell.setAdminTemplateEdit(null)
      shell.setView('admin-templates')
      showSaveMessage('Template saved.')
    } catch (error) {
      showSaveMessage(error instanceof Error ? error.message : 'Failed to save template.')
    } finally {
      setTemplateSaving(false)
    }
  }

  function handleCancelAdminTemplate() {
    shell?.setAdminTemplateEdit(null)
    shell?.setView('admin-templates')
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

  if (shell) {
    shell.designerHeaderHandlersRef.current = {
      onTeamChange: handleTeamSwitchRequest,
      onLogout: handleLogoutRequest,
    }
  }

  const setPageToolbar = shell?.setPageToolbar

  useLayoutEffect(() => {
    if (!setPageToolbar) return

    if (adminTemplateEdit) {
      setPageToolbar(
        <AdminTemplateEditBar
          kind={adminTemplateEdit.kind}
          mode={adminTemplateEdit.mode}
          label={adminTemplateEdit.label}
          createLabel={templateCreateLabel}
          saving={templateSaving}
          onCreateLabelChange={setTemplateCreateLabel}
          onSave={() => void handleSaveAdminTemplate()}
          onCancel={handleCancelAdminTemplate}
        />,
      )
    } else {
      setPageToolbar(
        <PageToolbarLayout
          left={
            <PlayTypeSelector
              playType={play.playType}
              canEdit={canEdit}
              onChange={handlePlayTypeChange}
            />
          }
        />,
      )
    }

    return () => {
      setPageToolbar(null)
    }
  }, [setPageToolbar, adminTemplateEdit, templateCreateLabel, templateSaving, play.playType, canEdit])

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

      <CategoryReminderDialog
        open={categoryReminderOpen}
        playType={play.playType}
        availableCategories={availableCategories}
        onSaveWithoutCategory={() => void handleCategoryReminderSaveWithoutCategory()}
        onSaveWithCategory={(categories) => void handleCategoryReminderSaveWithCategory(categories)}
        onCancel={handleCategoryReminderCancel}
      />

      <NewPlaySetupDialog
        open={newPlaySetupOpen}
        mode={playSetupMode}
        playType={play.playType}
        customFormations={customFormations}
        availableCategories={availableCategories}
        defaults={newPlaySetupDefaults}
        validatePlayName={playSetupMode === 'edit' ? undefined : validateSetupPlayName}
        onSubmit={handleNewPlaySetupSubmit}
        onCancel={handleNewPlaySetupCancel}
      />

      <LoadPlayModal
        open={loadPlayModalOpen}
        playType={play.playType}
        savedPlays={savedPlays}
        customFormations={customFormations}
        customCategories={customCategories}
        onLoadPlay={handleLoadPlayFromModal}
        onClose={handleLoadPlayModalClose}
      />

      <div className={`app-body ${setupPanelOpen && !adminTemplateEdit ? '' : 'setup-collapsed'}`}>
        {!adminTemplateEdit && (
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
          hasDefendersOnField={play.defenders.length > 0}
          hasOffenseOnField={play.players.length > 0}
          onOpponentFrontChange={handleOpponentFrontChange}
          onOpponentFormationChange={handleOpponentFormationChange}
          onLoadDefensiveFront={handleLoadDefensiveFront}
          onLoadOffensiveFormation={handleLoadOffensiveFormation}
          onRemoveDefensiveFront={handleRemoveDefensiveFront}
          onRemoveOffensiveFormation={handleRemoveOffensiveFormation}
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
          libraryPlays={savedPlays}
          selectedLoadId={selectedLoadId}
          onLoadPlay={handleLoadPlay}
          onDeletePlay={handleDeletePlay}
          playType={play.playType}
          drawingMode={drawingMode}
          motionType={motionType}
          onMotionTypeChange={setMotionType}
          onDrawingModeChange={setDrawingMode}
          onNewPlay={handleNewPlay}
          onOpenLoadPlay={handleOpenLoadPlayModal}
          onEditPlaySetup={openEditPlaySetup}
          onSaveChanges={handleSaveChanges}
          onSaveAsNew={handleSaveAsNew}
          onMirrorPlay={handleMirrorPlay}
          isMirrored={play.mirrored}
          isSaving={isSaving}
          selectedPlayerId={selectedPlayerId}
          selectedPlayerLabel={
            selectedPlayerId
              ? (play.players.find((player) => player.id === selectedPlayerId)?.label ?? '')
              : ''
          }
          players={play.players}
          onSelectPlayer={handleSelectPlayer}
          playerNotes={play.playerNotes}
          onPlayerNotesChange={handlePlayerNotesChange}
          onPlayerLabelChange={handlePlayerLabelChange}
          playNotes={play.notes}
          onPlayNotesChange={handleNotesChange}
        />
        )}

        <main className="canvas-area">
          {(saveMessage || dataLoading) && (
            <p className="save-message">
              {dataLoading ? 'Loading team plays and formations…' : saveMessage}
            </p>
          )}

          {!canEdit && !adminTemplateEdit && !dataLoading && !saveMessage && (
            <p className="save-message save-message-readonly">View only — contact your coach to edit.</p>
          )}

          {isMobileViewport && (
            <p className="play-designer-mobile-notice" role="status">
              Play Designer editing works best on desktop. You can still view your playbook from mobile.
            </p>
          )}

          <div className="field-stage">
            <div className="field-workspace">
              <div className="field-column" ref={fieldWorkspaceRef}>
                <div className="field-zoom-workspace">
                  <div
                    className="field-zoom-slot"
                    style={{ '--field-zoom': fieldZoom } as React.CSSProperties}
                  >
                    <Field
                        playType={play.playType}
                        viewOnly={!fieldCanEdit}
                        schemePositionsOnly={Boolean(adminTemplateEdit)}
                        showAlignmentGrid={fieldGridEnabled}
                        players={play.players}
                        defenders={play.defenders}
                        defenderRoutes={play.defenderRoutes}
                        playerActions={play.playerActions ?? {}}
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
                        onPlayerActionComplete={handlePlayerActionComplete}
                        onDeleteAllPlayerActionsOfType={handleDeleteAllPlayerActionsOfType}
                        onDefenderRouteComplete={handleDefenderRouteComplete}
                        onDrawingModeChange={setDrawingMode}
                        onMotionTypeChange={setMotionType}
                        toolbarPortalTarget={fieldToolbarHost}
                    />
                  </div>
                </div>
              </div>
              <div className="field-workspace-status">
                <div className="field-workspace-toolbar-host" ref={setFieldToolbarHost} />
                <div className="field-workspace-status-controls">
                  <FieldGridControl
                    enabled={fieldGridEnabled}
                    onChange={(enabled) => {
                      setFieldGridEnabled(enabled)
                      saveFieldGrid(enabled)
                    }}
                  />
                  <FieldZoomControl
                    value={fieldZoom}
                    onChange={(zoom) => {
                      setFieldZoom(zoom)
                      saveFieldZoom(zoom)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
