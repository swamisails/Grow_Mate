import type { ReactNode } from 'react'
import { useDocumentTitle } from './documentTitle'
import { Icon, type IconName } from './icons'

type PageHeaderProps = {
  /** The page name: the `<h1>` and the first part of `<title>`. */
  title: string
  /** The Material Symbol in the 48px page-title tile. */
  icon: IconName
  /** At most one primary action, at the right edge of the row. */
  action?: ReactNode
}

/** Opens every page: page-title tile, `<h1>` and an optional primary action (DESIGN.md, Layout). */
export function PageHeader({ title, icon, action }: PageHeaderProps) {
  useDocumentTitle(title)

  return (
    <div className="page-header">
      <span className="page-header__tile">
        <Icon name={icon} className="page-header__icon" />
      </span>
      <h1 className="page-header__title">{title}</h1>
      {action && <div className="page-header__action">{action}</div>}
    </div>
  )
}
