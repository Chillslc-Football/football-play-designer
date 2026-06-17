import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Play } from '../../types/play'
import {
  DEFAULT_PLAY_LIBRARY_FILTER,
  DEFAULT_PLAY_LIBRARY_LAYOUT,
  groupLibraryPlays,
  paginatePlays,
} from '../../utils/playLibraryLayout'
import { PlayThumbnail } from '../PlayThumbnail/PlayThumbnail'

type PlaybookPrintHostProps = {
  plays: Play[]
}

export function PlaybookPrintHost({ plays }: PlaybookPrintHostProps) {
  const printSections = useMemo(
    () => groupLibraryPlays(plays, DEFAULT_PLAY_LIBRARY_FILTER),
    [plays],
  )

  const layout = DEFAULT_PLAY_LIBRARY_LAYOUT

  return createPortal(
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
    </div>,
    document.body,
  )
}
