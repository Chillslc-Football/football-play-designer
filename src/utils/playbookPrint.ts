const PLAYBOOK_PRINT_BODY_CLASS = 'play-library-printing'

let openEmailDraftAfterPrint = false

/** Activates print-only playbook layout (shared by print, download, and email). */
export function beginPlaybookPrint(): void {
  document.body.classList.add(PLAYBOOK_PRINT_BODY_CLASS)
}

/** Clears print-only playbook layout after print/download/email. */
export function endPlaybookPrint(): void {
  document.body.classList.remove(PLAYBOOK_PRINT_BODY_CLASS)
}

/** Opens the system print dialog for the playbook (printer or Save as PDF). */
export function printPlaybook(): void {
  openEmailDraftAfterPrint = false
  beginPlaybookPrint()
  window.print()
}

/**
 * Opens the system print dialog so the user can choose Save as PDF.
 * Call after showing SavePlaybookPdfDialog instructions.
 */
export function downloadPlaybookPdf(): void {
  openEmailDraftAfterPrint = false
  beginPlaybookPrint()
  window.print()
}

/** Downloads via print dialog, then opens a mailto draft for manual attachment. */
export function emailPlaybookPdf(): void {
  openEmailDraftAfterPrint = true
  beginPlaybookPrint()
  window.print()
}

/** Call from afterprint handler to clean up and optionally open mailto. */
export function handlePlaybookAfterPrint(): void {
  endPlaybookPrint()

  if (!openEmailDraftAfterPrint) {
    return
  }

  openEmailDraftAfterPrint = false
  const subject = encodeURIComponent('Playbook PDF')
  const body = encodeURIComponent('Attached is the playbook PDF.')
  window.location.href = `mailto:?subject=${subject}&body=${body}`
}
