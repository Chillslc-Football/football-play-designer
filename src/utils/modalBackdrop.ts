import type { MouseEvent } from 'react'

/** Close on backdrop press only — avoids closing when text selection ends outside the dialog. */
export function handleModalBackdropMouseDown(
  event: MouseEvent<HTMLElement>,
  onClose: () => void,
): void {
  if (event.target === event.currentTarget) {
    onClose()
  }
}
