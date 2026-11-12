import type { ReactNode, Ref } from 'react'
import { useDocumentTitle } from './documentTitle'
import { Icon, type IconName } from './icons'

type PageHeaderProps = {
  /** The page name: the `<h1>` and the first part of `<title>`. */
  title: string
  /** The Material Symbol in the 48px page-title tile. */
  icon: IconName
  /** At most one primary action, at the right edge of the row. */
  action?: ReactNode
  /** A record-state tag beside the title, e.g. Published in the Course editor. */
  tag?: ReactNode
  /** Given only when the page moves focus to its `<h1>`; the heading is then focusable by script, not by Tab. */
  titleRef?: Ref<HTMLHeadingElement>
}

/** Opens every page: page-title tile, `<h1>` and an optional primary action (DESIGN.md, Layout). */
export function PageHeader({ title, icon, action, tag, titleRef }: PageHeaderProps) {
  useDocumentTitle(title)

  return (
    <div className="page-header">
      <span className="page-header__tile">
        <Icon name={icon} className="page-header__icon" />
      </span>
      <h1 className="page-header__title" ref={titleRef} tabIndex={titleRef ? -1 : undefined}>
        {title}
      </h1>
      {tag}
      {action && <div className="page-header__action">{action}</div>}
    </div>
  )
}
