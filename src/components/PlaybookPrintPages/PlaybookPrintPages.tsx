import { useMemo } from 'react'
import type { Play } from '../../types/play'
import {
  groupLibraryPlays,
  paginatePlays,
  type PlayLibraryFilter,
  type PlayLibraryLayout,
} from '../../utils/playLibraryLayout'
import { PlayThumbnail } from '../PlayThumbnail/PlayThumbnail'
import '../PlayLibraryModal/PlayLibraryModal.css'

type PlaybookPrintPagesProps = {
  plays: Play[]
  layout: PlayLibraryLayout
  filter: PlayLibraryFilter
  className?: string
}

export function PlaybookPrintPages({
  plays,
  layout,
  filter,
  className = 'play-library-pdf-export',
}: PlaybookPrintPagesProps) {
  const printSections = useMemo(
    () => groupLibraryPlays(plays, filter),
    [plays, filter],
  )

  return (
    <div className={className}>
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
  )
}
