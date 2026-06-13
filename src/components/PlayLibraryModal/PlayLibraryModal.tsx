import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Play } from '../../types/play'
import type { PlayType } from '../../types/playType'
import {
  DEFAULT_PLAY_LIBRARY_FILTER,
  DEFAULT_PLAY_LIBRARY_LAYOUT,
  filterLibraryPlays,
  groupLibraryPlays,
  paginatePlays,
  PLAY_LIBRARY_LAYOUTS,
  type PlayLibraryFilter,
  type PlayLibraryLayout,
} from '../../utils/playLibraryLayout'
import {
  downloadPlaybookPdf,
  emailPlaybookPdf,
  endPlaybookPrint,
  handlePlaybookAfterPrint,
  printPlaybook,
} from '../../utils/playbookPrint'
import { PlayThumbnail } from '../PlayThumbnail/PlayThumbnail'
import '../ConfirmDialog/ConfirmDialog.css'
import './PlayLibraryModal.css'

type PlayLibraryModalProps = {
  open: boolean
  plays: Play[]
  canSharePdf?: boolean
  onLoadPlay: (playId: string) => void
  onClose: () => void
}

const PLAY_LIBRARY_FILTERS: { value: PlayLibraryFilter; label: string }[] = [
  { value: 'offense', label: 'Offense' },
  { value: 'defense', label: 'Defense' },
  { value: 'both', label: 'Both' },
]

function sectionTitleForPlayType(playType: PlayType): string {
  return playType === 'offensive' ? 'Offensive Plays' : 'Defensive Plays'
}

export function PlayLibraryModal({
  open,
  plays,
  canSharePdf = false,
  onLoadPlay,
  onClose,
}: PlayLibraryModalProps) {
  const [layout, setLayout] = useState<PlayLibraryLayout>(DEFAULT_PLAY_LIBRARY_LAYOUT)
  const [playFilter, setPlayFilter] = useState<PlayLibraryFilter>(DEFAULT_PLAY_LIBRARY_FILTER)
  const [pageIndex, setPageIndex] = useState(0)

  const filteredPlays = useMemo(
    () => filterLibraryPlays(plays, playFilter),
    [plays, playFilter],
  )

  const printSections = useMemo(
    () => groupLibraryPlays(plays, playFilter),
    [plays, playFilter],
  )

  const pages = useMemo(() => paginatePlays(filteredPlays, layout), [filteredPlays, layout])

  const totalPages = Math.max(pages.length, 1)
  const currentPage = pages[pageIndex] ?? []

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    setPageIndex(0)
  }, [layout, playFilter, open])

  useEffect(() => {
    if (pageIndex > pages.length - 1) {
      setPageIndex(Math.max(pages.length - 1, 0))
    }
  }, [pageIndex, pages.length])

  useEffect(() => {
    function handleAfterPrint() {
      handlePlaybookAfterPrint()
    }

    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
      endPlaybookPrint()
    }
  }, [])

  if (!open) return null

  function handleLayoutChange(nextLayout: PlayLibraryLayout) {
    setLayout(nextLayout)
  }

  function handleFilterChange(nextFilter: PlayLibraryFilter) {
    setPlayFilter(nextFilter)
  }

  function handleSelectPlay(playId: string) {
    onLoadPlay(playId)
    onClose()
  }

  function handlePrint() {
    printPlaybook()
  }

  function handleDownloadPdf() {
    downloadPlaybookPdf()
  }

  function handleEmailPdf() {
    emailPlaybookPdf()
  }

  function renderPageGrid(pagePlays: Play[]) {
    const items: React.ReactNode[] = []
    let lastType: PlayType | null = null

    for (const play of pagePlays) {
      if (playFilter === 'both' && play.playType !== lastType) {
        items.push(
          <h3
            key={`section-${play.playType}-${play.id}`}
            className="play-library-section-title"
          >
            {sectionTitleForPlayType(play.playType)}
          </h3>,
        )
        lastType = play.playType
      }

      items.push(
        <PlayThumbnail key={play.id} play={play} onSelect={handleSelectPlay} />,
      )
    }

    return (
      <div
        className="play-library-grid"
        style={
          {
            '--library-cols': layout,
            '--library-rows': layout,
          } as React.CSSProperties
        }
      >
        {items}
      </div>
    )
  }

  return createPortal(
    <>
      <div
        className="play-library-overlay no-print"
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose()
          }
        }}
      >
        <div
          className="play-library-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="play-library-title"
        >
          <header className="play-library-header">
            <div className="play-library-header-main">
              <h2 id="play-library-title" className="play-library-title">
                Play Library
              </h2>
              <p className="play-library-subtitle">
                {filteredPlays.length} saved {filteredPlays.length === 1 ? 'play' : 'plays'}
              </p>
            </div>

            <div className="play-library-header-actions">
              <label className="play-library-layout-label" htmlFor="play-library-filter">
                Show
              </label>
              <select
                id="play-library-filter"
                className="select-field play-library-filter-select"
                value={playFilter}
                onChange={(event) =>
                  handleFilterChange(event.target.value as PlayLibraryFilter)
                }
              >
                {PLAY_LIBRARY_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label className="play-library-layout-label" htmlFor="play-library-layout">
                Layout
              </label>
              <select
                id="play-library-layout"
                className="select-field play-library-layout-select"
                value={layout}
                onChange={(event) =>
                  handleLayoutChange(Number(event.target.value) as PlayLibraryLayout)
                }
              >
                {PLAY_LIBRARY_LAYOUTS.map((option) => (
                  <option key={option} value={option}>
                    {option}×{option}
                  </option>
                ))}
              </select>

              <button type="button" className="btn" onClick={handlePrint}>
                Print Playbook
              </button>

              {canSharePdf && (
                <div className="play-library-share" aria-label="Share PDF">
                  <span className="play-library-share-label">Share PDF</span>
                  <button type="button" className="btn" onClick={handleDownloadPdf}>
                    Download PDF
                  </button>
                  <button type="button" className="btn" onClick={handleEmailPdf}>
                    Email PDF
                  </button>
                </div>
              )}

              <button
                type="button"
                className="btn"
                onClick={onClose}
                aria-label="Close Play Library"
              >
                Close
              </button>
            </div>
          </header>

          {filteredPlays.length === 0 ? (
            <p className="play-library-empty">No saved plays yet. Save a play to see it here.</p>
          ) : (
            <>
              {renderPageGrid(currentPage)}

              {pages.length > 1 && (
                <footer className="play-library-pagination">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setPageIndex((index) => Math.max(index - 1, 0))}
                    disabled={pageIndex === 0}
                  >
                    Previous
                  </button>
                  <span className="play-library-page-indicator">
                    Page {pageIndex + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setPageIndex((index) => Math.min(index + 1, pages.length - 1))
                    }
                    disabled={pageIndex >= pages.length - 1}
                  >
                    Next
                  </button>
                </footer>
              )}
            </>
          )}
        </div>
      </div>

      <div className="play-library-print-only print-only" aria-hidden="true">
        {printSections.flatMap((section) => {
          const sectionPages = paginatePlays(section.plays, layout)

          return sectionPages.map((pagePlays, pageIndex) => (
            <section
              key={`print-${section.title}-${pageIndex}`}
              className="play-library-print-page"
            >
              {pageIndex === 0 && (
                <h2 className="play-library-print-section-title">{section.title}</h2>
              )}
              <div
                className="play-library-print-grid"
                style={
                  {
                    '--library-cols': layout,
                    '--library-rows': layout,
                  } as React.CSSProperties
                }
              >
                {pagePlays.map((play) => (
                  <PlayThumbnail key={`print-${play.id}-${pageIndex}`} play={play} printable />
                ))}
              </div>
            </section>
          ))
        })}
      </div>
    </>,
    document.body,
  )
}
