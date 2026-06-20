import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PlaybookPrintPages } from '../components/PlaybookPrintPages/PlaybookPrintPages'
import type { Play } from '../types/play'
import type { PlayLibraryFilter, PlayLibraryLayout } from './playLibraryLayout'

const PDF_SCALE = 2
const LETTER_WIDTH_IN = 8.5
const LETTER_HEIGHT_IN = 11

export const PDF_EXPORT_ERROR_MESSAGE = 'Could not generate PDF. Try Print Playbook instead.'

export function buildPlaybookPdfFilename(teamName?: string | null): string {
  const trimmed = teamName?.trim()
  if (trimmed) {
    const slug = trimmed
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
    if (slug) {
      return `${slug}-playbook.pdf`
    }
  }
  return 'playbook.pdf'
}

async function waitForExportLayout(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })

  if (document.fonts?.ready) {
    await document.fonts.ready
  }
}

export async function generateAndDownloadPlaybookPdf(options: {
  plays: Play[]
  layout: PlayLibraryLayout
  filter: PlayLibraryFilter
  filename?: string
}): Promise<void> {
  const host = document.createElement('div')
  host.className = 'playbook-pdf-export-host'
  host.setAttribute('aria-hidden', 'true')
  document.body.appendChild(host)

  let root: Root | null = null

  try {
    root = createRoot(host)
    root.render(
      createElement(PlaybookPrintPages, {
        plays: options.plays,
        layout: options.layout,
        filter: options.filter,
      }),
    )

    await waitForExportLayout()

    const pageElements = host.querySelectorAll<HTMLElement>('.play-library-print-page')
    if (pageElements.length === 0) {
      throw new Error('No playbook pages to export')
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter',
    })

    for (let index = 0; index < pageElements.length; index += 1) {
      const pageElement = pageElements[index]
      const canvas = await html2canvas(pageElement, {
        scale: PDF_SCALE,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)

      if (index > 0) {
        pdf.addPage([LETTER_WIDTH_IN, LETTER_HEIGHT_IN], 'portrait')
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, LETTER_WIDTH_IN, LETTER_HEIGHT_IN)
    }

    pdf.save(options.filename ?? 'playbook.pdf')
  } finally {
    root?.unmount()
    host.remove()
  }
}
