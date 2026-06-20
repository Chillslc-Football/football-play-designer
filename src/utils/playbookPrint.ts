const PLAYBOOK_PRINT_BODY_CLASS = 'play-library-printing'

/** Activates print-only playbook layout (shared by print and download). */
export function beginPlaybookPrint(): void {
  document.body.classList.add(PLAYBOOK_PRINT_BODY_CLASS)
}

/** Clears print-only playbook layout after print/download. */
export function endPlaybookPrint(): void {
  document.body.classList.remove(PLAYBOOK_PRINT_BODY_CLASS)
}

/** Opens the system print dialog for the playbook (printer or Save as PDF). */
export function printPlaybook(): void {
  beginPlaybookPrint()
  window.print()
}

/**
 * Opens the system print dialog so the user can choose Save as PDF.
 * Call after showing SavePlaybookPdfDialog instructions.
 */
export function downloadPlaybookPdf(): void {
  beginPlaybookPrint()
  window.print()
}

/** Call from afterprint handler to clean up print-only layout. */
export function handlePlaybookAfterPrint(): void {
  endPlaybookPrint()
}
