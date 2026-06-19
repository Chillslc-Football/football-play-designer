import { useEffect, useMemo, useRef, useState } from 'react'
import type { Play } from '../../types/play'
import type { PlayType } from '../../types/playType'
import {
  ALL_CATEGORIES_FILTER,
  filterPlaysByCategory,
  filterPlaysByPlayType,
  getCategoryFilterOptions,
  type CategoryFilterId,
} from '../../utils/categoryUtils'
import type { CustomFormation } from '../../utils/formationStorage'
import {
  ALL_PLAYS_FILTER,
  filterPlaysByFormation,
  getPlayFilterOptions,
  type PlayFilterId,
} from '../../utils/formationUtils'
import { filterPlaysByFront, getFrontFilterOptions } from '../../utils/frontUtils'
import './LoadPlayModal.css'

type LoadPlayModalProps = {
  open: boolean
  playType: PlayType
  savedPlays: Play[]
  customFormations: CustomFormation[]
  customCategories: string[]
  onLoadPlay: (playId: string) => void
  onClose: () => void
}

function filterPlaysBySearch(plays: Play[], query: string): Play[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return plays
  return plays.filter((play) => play.name.toLowerCase().includes(trimmed))
}

export function LoadPlayModal({
  open,
  playType,
  savedPlays,
  customFormations,
  customCategories,
  onLoadPlay,
  onClose,
}: LoadPlayModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilterId, setCategoryFilterId] = useState<CategoryFilterId>(ALL_CATEGORIES_FILTER)
  const [schemeFilterId, setSchemeFilterId] = useState<PlayFilterId>(ALL_PLAYS_FILTER)
  const [selectedPlayId, setSelectedPlayId] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const playsForMode = useMemo(
    () => filterPlaysByPlayType(savedPlays, playType),
    [savedPlays, playType],
  )

  const categoryFilterOptions = useMemo(
    () => getCategoryFilterOptions(playType, customCategories, playsForMode),
    [playType, customCategories, playsForMode],
  )

  const schemeFilterOptions = useMemo(
    () =>
      playType === 'defensive'
        ? getFrontFilterOptions()
        : getPlayFilterOptions(customFormations),
    [playType, customFormations],
  )

  const filteredPlays = useMemo((): Play[] => {
    const bySearch = filterPlaysBySearch(playsForMode, searchQuery)
    const byCategory = filterPlaysByCategory(bySearch, categoryFilterId)

    if (playType === 'defensive') {
      return filterPlaysByFront(byCategory, schemeFilterId)
    }

    return filterPlaysByFormation(byCategory, schemeFilterId)
  }, [playsForMode, searchQuery, categoryFilterId, schemeFilterId, playType])

  const sortedPlays = useMemo(
    () => [...filteredPlays].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredPlays],
  )

  useEffect(() => {
    if (!open) return

    setSearchQuery('')
    setCategoryFilterId(ALL_CATEGORIES_FILTER)
    setSchemeFilterId(ALL_PLAYS_FILTER)
    setSelectedPlayId('')
    searchInputRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!selectedPlayId) return
    if (!sortedPlays.some((play) => play.id === selectedPlayId)) {
      setSelectedPlayId('')
    }
  }, [sortedPlays, selectedPlayId])

  if (!open) return null

  function handleLoadSelected() {
    if (!selectedPlayId) return
    onLoadPlay(selectedPlayId)
  }

  return (
    <div
      className="load-play-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="load-play-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="load-play-title"
      >
        <h2 id="load-play-title" className="load-play-dialog-title">
          Load Play
        </h2>

        <div className="load-play-filters">
          <div className="form-group">
            <label htmlFor="load-play-search" className="field-label">
              Search
            </label>
            <input
              ref={searchInputRef}
              id="load-play-search"
              type="search"
              className="input-field"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by play name..."
              autoComplete="off"
            />
          </div>

          <div className="load-play-filters-row">
            <div className="form-group">
              <label htmlFor="load-play-category-filter" className="field-label">
                Category
              </label>
              <select
                id="load-play-category-filter"
                className="select-field"
                value={categoryFilterId}
                onChange={(event) => setCategoryFilterId(event.target.value)}
              >
                {categoryFilterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="load-play-scheme-filter" className="field-label">
                {playType === 'defensive' ? 'Front Filter' : 'Formation Filter'}
              </label>
              <select
                id="load-play-scheme-filter"
                className="select-field"
                value={schemeFilterId}
                onChange={(event) => setSchemeFilterId(event.target.value)}
              >
                {schemeFilterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <ul className="load-play-list" aria-label="Saved plays">
          {sortedPlays.length === 0 ? (
            <li className="load-play-list-empty">No plays match your filters.</li>
          ) : (
            sortedPlays.map((play) => (
              <li key={play.id}>
                <button
                  type="button"
                  className={`load-play-list-item${selectedPlayId === play.id ? ' is-selected' : ''}`}
                  onClick={() => setSelectedPlayId(play.id)}
                  aria-pressed={selectedPlayId === play.id}
                >
                  <span className="load-play-list-item-name">{play.name}</span>
                  <span className="load-play-list-item-meta">
                    {play.categories.length > 0 ? play.categories.join(', ') : 'No category'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="load-play-dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleLoadSelected}
            disabled={!selectedPlayId}
          >
            Load Selected Play
          </button>
        </div>
      </div>
    </div>
  )
}
