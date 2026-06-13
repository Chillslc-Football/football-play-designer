import { useMemo } from 'react'
import type { Play } from '../../types/play'
import { ensurePlayPlayerActions } from '../../utils/playerActionChains'
import { PlayFieldPreview } from '../PlayFieldPreview/PlayFieldPreview'
import './PlayThumbnail.css'

type PlayThumbnailProps = {
  play: Play
  onSelect?: (playId: string) => void
  /** When true, renders a static card for print layout (not clickable). */
  printable?: boolean
}

export function PlayThumbnail({ play, onSelect, printable = false }: PlayThumbnailProps) {
  const previewPlay = useMemo(() => ensurePlayPlayerActions(play), [play])

  const preview = (
    <div className="play-thumbnail-preview">
      <PlayFieldPreview play={previewPlay} />
    </div>
  )

  const name = <span className="play-thumbnail-name">{previewPlay.name}</span>

  if (printable || !onSelect) {
    return (
      <div className="play-thumbnail play-thumbnail-static">
        {preview}
        {name}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="play-thumbnail play-thumbnail-button"
      onClick={() => onSelect(play.id)}
      aria-label={`Load play ${previewPlay.name}`}
    >
      {preview}
      {name}
    </button>
  )
}
