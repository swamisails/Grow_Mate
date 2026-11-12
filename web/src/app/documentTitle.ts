import { useEffect } from 'react'
import { copy } from './copy'

/** Names the open page in `<title>` ("{page} · GrowMate"), so it changes on every navigation. */
export function useDocumentTitle(page: string): void {
  useEffect(() => {
    document.title = copy.documentTitle(page)
  }, [page])
}
