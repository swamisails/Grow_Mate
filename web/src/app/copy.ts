// Every user-facing string in the SPA lives here (AD-16).

/** Month names in dates, fixed here rather than taken from the browser's locale. */
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export const copy = {
  appName: 'GrowMate',
  /** `<title>` on every page: "{page} · GrowMate". */
  documentTitle: (page: string) => `${page} · GrowMate`,
  nav: {
    home: 'Home',
    courses: 'Courses',
    registrationDecisions: 'Registration decisions',
    requests: 'Requests',
    notices: 'Notices',
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
    /** The Mentor check card: the Employee's own Registration decisions (R3). */
    mentorCheck: 'Mentor check',
    approved: 'Approved',
    refused: 'Refused',
    /** Under a heading whose list is empty. */
    none: 'None.',
  },
  notices: {
    title: 'Notices',
    empty: 'No notices.',
    /** The Registration-decision notice's sentence for each `outcome` (R3). */
    registrationDecision: {
      approved: (course: string) => `You can now mentor ${course}.`,
      refused: (course: string) => `You weren't approved to mentor ${course}.`,
    },
    /** Day 3, one sentence per party. `person` is the other person; the Course title is text. */
    requestReminderDay3: {
      mentor: (learner: string, course: string) => `Reminder: ${learner} requested you to guide them with ${course}.`,
      learner: (mentor: string, course: string) => `Your request to ${mentor} for ${course} is still waiting.`,
    },
    /** Day 6, one sentence per party. `person` is the other person; the Course title is text. */
    requestCancelledDay6: {
      learner: (mentor: string, course: string) => `Your request to ${mentor} for ${course} was cancelled. You can request a mentor again.`,
      mentor: (learner: string, course: string) => `${learner}'s request for ${course} was cancelled.`,
    },
  },
  /** A timestamp the API returns, as its UTC calendar date (AD-5): "16 Nov 2026". */
  date: (iso: string) => {
    const date = new Date(iso)
    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`
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
  employeeCourses: {
    title: 'Courses',
    pageName: 'Course',
    empty: 'No courses yet.',
    description: 'Description',
  },
  mentors: {
    /** The Course page's Mentors card (R6). */
    title: 'Mentors',
    empty: 'No mentors for this course yet.',
    request: 'Request',
  },
  requests: {
    title: 'Requests',
    empty: 'No requests.',
    accept: 'Accept',
    sentence: (name: string, course: string) => `${name} requested you to guide them with ${course}`,
  },
  progress: {
    notYetStarted: 'Not yet started',
    inProgress: 'In progress',
    label: (word: string) => `Progress: ${word}`,
  },
  mentorCheck: {
    /** Sign-up step 2 (AD-15). */
    title: 'Mentor check',
    courses: 'Courses you can mentor',
    submit: 'Submit',
    skip: 'Skip',
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
    /** Beside the correct option in a published Course's read-only view. */
    correctTag: '(Correct)',
    correctFor: (n: number) => `Correct, option ${n}`,
    addQuestion: 'Add question',
    removeQuestion: 'Remove question',
    removeQuestionFor: (n: number) => `Remove question ${n}`,
    addOption: 'Add option',
    addOptionFor: (n: number) => `Add option to question ${n}`,
    removeOption: 'Remove option',
    removeOptionFor: (n: number) => `Remove option ${n}`,
    save: 'Save',
    publish: 'Publish',
    confirmation: "Published courses can't be edited.",
  },
  /** The confirmation dialog for a final action (Publish, a Registration decision). */
  confirmation: {
    cancel: 'Cancel',
  },
  registrationDecisions: {
    /** Admin's Registration decisions (R3). */
    title: 'Registration decisions',
    empty: 'No registration decisions.',
    columnEmployee: 'Employee',
    columnCourse: 'Course',
    columnDecision: 'Decision',
    approve: 'Approve',
    refuse: 'Refuse',
    /** The confirmation dialog's message for either decision. */
    final: 'This decision is final.',
  },
  /** The tag for each Registration decision `outcome` the API returns. */
  registrationOutcome: {
    approved: 'Approved',
    refused: 'Refused',
  },
  errors: {
    generic: 'Something went wrong. Try again.',
  },
} as const
