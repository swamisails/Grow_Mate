import { configure } from '@testing-library/dom'

// A full run shares the machine with many jsdom environments. The default one-second
// findBy wait expires while a page is still loading.
configure({ asyncUtilTimeout: 5000 })
