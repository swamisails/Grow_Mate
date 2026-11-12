// Every user-facing string in the SPA lives here (AD-16).

export const copy = {
  appName: 'GrowMate',
  /** `<title>` on every page: "{page} · GrowMate". */
  documentTitle: (page: string) => `${page} · GrowMate`,
  nav: {
    courses: 'Courses',
    signOut: 'Sign out',
    primary: 'Main',
  },
  theme: {
    toDark: 'Switch to dark mode',
    toLight: 'Switch to light mode',
  },
  states: {
    loading: 'Loading…',
    notFound: 'Page not found.',
    /** The `<title>` page name of the Not found state. */
    notFoundTitle: 'Page not found',
    home: 'Home',
  },
  signIn: {
    title: 'Sign in',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
  },
  adminCourses: {
    title: 'Courses',
    empty: 'No courses yet.',
  },
  errors: {
    generic: 'Something went wrong. Try again.',
  },
} as const
