import { describe, expect, it } from 'vitest'
import { matchPath, matchRoute, type RouteDef } from './router'

const Page = () => null
const route = (path: string): RouteDef => ({ path, access: 'admin', layout: 'admin', Component: Page })

describe('matchPath', () => {
  it('reads :param segments and needs every other segment to be equal', () => {
    expect(matchPath('/admin/courses/:id', '/admin/courses/42')).toEqual({ id: '42' })
    expect(matchPath('/admin/courses/:id', '/admin/courses/a%20b')).toEqual({ id: 'a b' })
    expect(matchPath('/admin/courses/:id', '/admin/courses')).toBeNull()
    expect(matchPath('/admin/courses/:id', '/admin/courses/')).toBeNull()
    expect(matchPath('/admin/courses/:id', '/admin/courses/42/more')).toBeNull()
    expect(matchPath('/admin/courses/:id', '/admin/other/42')).toBeNull()
    expect(matchPath('/admin/courses/:id', '/admin/courses/%E0%A4%A')).toBeNull()
  })
})

describe('matchRoute', () => {
  const routes = [route('/admin/courses'), route('/admin/courses/:id'), route('/admin/courses/new')]

  it('prefers an exact path over a pattern, whatever the list order', () => {
    expect(matchRoute(routes, '/admin/courses/new')).toEqual({ route: routes[2], params: {} })
    expect(matchRoute(routes, '/admin/courses/5')).toEqual({ route: routes[1], params: { id: '5' } })
    expect(matchRoute(routes, '/admin/courses')).toEqual({ route: routes[0], params: {} })
    expect(matchRoute(routes, '/nope')).toBeNull()
  })
})
