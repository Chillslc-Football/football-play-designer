import { useEffect, useMemo, useRef, useState } from 'react'
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
  endPlaybookPrint,
  handlePlaybookAfterPrint,
  printPlaybook,
} from '../../utils/playbookPrint'
import type { TeamFormat } from '../../types/teamFormat'
import { ArchivedAssetsModal } from '../ArchivedAssetsModal/ArchivedAssetsModal'
import { PlayThumbnail } from '../PlayThumbnail/PlayThumbnail'
import { SavePlaybookPdfDialog } from '../SavePlaybookPdfDialog/SavePlaybookPdfDialog'
import { SharePlaybookDialog } from '../SharePlaybookDialog/SharePlaybookDialog'
import '../ConfirmDialog/ConfirmDialog.css'
import './PlayLibraryModal.css'

type PlayLibraryModalProps = {
  open: boolean
  plays: Play[]
  canSharePdf?: boolean
  canImportArchived?: boolean
  activeTeamId?: string | null
  teamFormat?: TeamFormat
  onArchivedImportComplete?: () => void
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
  canImportArchived = false,
  activeTeamId = null,
  teamFormat = '11v11',
  onArchivedImportComplete,
  onLoadPlay,
  onClose,
}: PlayLibraryModalProps) {
  const [layout, setLayout] = useState<PlayLibraryLayout>(DEFAULT_PLAY_LIBRARY_LAYOUT)
  const [playFilter, setPlayFilter] = useState<PlayLibraryFilter>(DEFAULT_PLAY_LIBRARY_FILTER)
  const [pageIndex, setPageIndex] = useState(0)
  const [savePdfDialogOpen, setSavePdfDialogOpen] = useState(false)
  const [sharePlaybookOpen, setSharePlaybookOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [archivedAssetsOpen, setArchivedAssetsOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)
  const showArchivedAssets = canImportArchived && Boolean(activeTeamId)

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
        if (archivedAssetsOpen || sharePlaybookOpen || savePdfDialogOpen) {
          return
        }
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, sharePlaybookOpen, savePdfDialogOpen, archivedAssetsOpen])

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

  useEffect(() => {
    if (!open) {
      setShareOpen(false)
    }
  }, [open])

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
    setShareOpen(false)
    setSavePdfDialogOpen(true)
  }

  function handleSavePdfContinue() {
    setSavePdfDialogOpen(false)
    downloadPlaybookPdf()
  }

  function handleEmailPlaybook() {
    setShareOpen(false)
    setSharePlaybookOpen(true)
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
      {showArchivedAssets && activeTeamId && (
        <ArchivedAssetsModal
          open={archivedAssetsOpen}
          teamId={activeTeamId}
          teamFormat={teamFormat}
          onClose={() => setArchivedAssetsOpen(false)}
          onImportComplete={() => {
            onArchivedImportComplete?.()
          }}
        />
      )}

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

              <div className="play-library-export-actions">
                {showArchivedAssets && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setArchivedAssetsOpen(true)}
                  >
                    Archived Assets
                  </button>
                )}

                <button type="button" className="btn" onClick={handlePrint}>
                  Print
                </button>

                {canSharePdf && (
                  <div className="play-library-share" ref={shareRef}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShareOpen((open) => !open)}
                      aria-expanded={shareOpen}
                      aria-haspopup="menu"
                      title="Share playbook"
                    >
                      Share
                    </button>
                    {shareOpen && (
                      <div className="play-library-share-menu" role="menu">
                        <button
                          type="button"
                          className="btn"
                          role="menuitem"
                          onClick={handleEmailPlaybook}
                        >
                          Email Playbook
                        </button>
                        <button
                          type="button"
                          className="btn"
                          role="menuitem"
                          onClick={handleDownloadPdf}
                        >
                          Download PDF
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

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

      <SavePlaybookPdfDialog
        open={savePdfDialogOpen}
        onContinue={handleSavePdfContinue}
        onCancel={() => setSavePdfDialogOpen(false)}
      />

      <SharePlaybookDialog
        open={sharePlaybookOpen}
        onClose={() => setSharePlaybookOpen(false)}
      />
    </>,
    document.body,
  )
}
