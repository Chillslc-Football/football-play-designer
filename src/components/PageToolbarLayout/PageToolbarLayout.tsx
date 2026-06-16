import type { ReactNode } from 'react'
import './PageToolbarLayout.css'

type PageToolbarLayoutProps = {
  left?: ReactNode
  actions?: ReactNode
}

export function PageToolbarLayout({ left, actions }: PageToolbarLayoutProps) {
  return (
    <div className="page-toolbar-layout">
      <div className="page-toolbar-layout-left">{left}</div>
      <div className="page-toolbar-layout-actions">{actions}</div>
    </div>
  )
}
