import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const PRELOAD_RELOAD_KEY =
  'tribal-battle-preload-reload-at'

window.addEventListener(
  'vite:preloadError',
  (event) => {
    event.preventDefault()

    const lastReloadAt = Number(
      sessionStorage.getItem(
        PRELOAD_RELOAD_KEY,
      ) ?? 0,
    )

    if (
      Date.now() - lastReloadAt <
      60_000
    ) {
      console.error(
        'Could not load the latest application chunk.',
        event.payload,
      )
      return
    }

    sessionStorage.setItem(
      PRELOAD_RELOAD_KEY,
      String(Date.now()),
    )

    window.location.reload()
  },
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
