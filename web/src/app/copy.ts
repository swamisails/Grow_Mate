// Every user-facing string in the SPA lives here (AD-16).

export const copy = {
  appName: 'GrowMate',
  /** `<title>` on every page: "{page} · GrowMate". */
  documentTitle: (page: string) => `${page} · GrowMate`,
  nav: {
    home: 'Home',
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
    noAccount: 'No account?',
    signUpLink: 'Sign up',
  },
  signUp: {
    title: 'Sign up',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    submit: 'Sign up',
    haveAccount: 'Have an account?',
    signInLink: 'Sign in',
  },
  home: {
    title: 'Home',
    learning: 'Learning',
    learningEmpty: "You aren't learning a course yet.",
  },
  adminCourses: {
    title: 'Courses',
    empty: 'No courses yet.',
    newCourse: 'New Course',
    columnTitle: 'Title',
    columnStatus: 'Status',
  },
  /** The tag for each `status` the API returns. */
  courseStatus: {
    draft: 'Draft',
    published: 'Published',
  },
  courseEditor: {
    /** The page name while the Course loads. */
    pageName: 'Course editor',
    newTitle: 'New Course',
    details: 'Course details',
    title: 'Title',
    description: 'Description',
    stages: {
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
    },
    passMark: 'Pass mark (%)',
    question: (n: number) => `Question ${n}`,
    questionText: 'Question',
    options: 'Options',
    option: (n: number) => `Option ${n}`,
    correct: 'Correct',
    correctFor: (n: number) => `Correct, option ${n}`,
    addQuestion: 'Add question',
    removeQuestion: 'Remove question',
    removeQuestionFor: (n: number) => `Remove question ${n}`,
    addOption: 'Add option',
    addOptionFor: (n: number) => `Add option to question ${n}`,
    removeOption: 'Remove option',
    removeOptionFor: (n: number) => `Remove option ${n}`,
    save: 'Save',
  },
  errors: {
    generic: 'Something went wrong. Try again.',
  },
} as const
