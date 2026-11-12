import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted woff2 fonts (DESIGN.md, Typography), bundled into the build.
import '@fontsource-variable/lexend'
import '@fontsource-variable/nunito-sans'
import './app/tokens.css'
import './app/styles.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
