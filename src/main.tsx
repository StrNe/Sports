import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, MemoryRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

registerSW({ immediate: true })

// Dans claude.ai, l'adresse de la page n'accepte pas de chemins après le # : navigation en mémoire
const Router = import.meta.env.MODE === 'artifact' ? MemoryRouter : HashRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
