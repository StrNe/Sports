import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore'
import { BottomNav, MobileTopBar, MoreSheet, QuickAddSheet, Sidebar, Toast } from './components/layout'
import { FormHost } from './components/forms'
import { ConfirmHost, SyncBoot } from './components/sync'
import Dashboard from './pages/Dashboard'

// Les pages secondaires sont chargées à la demande pour accélérer le premier affichage
const Planning = lazy(() => import('./pages/Planning'))
const Running = lazy(() => import('./pages/Running'))
const Renfo = lazy(() => import('./pages/Renfo'))
const Muscu = lazy(() => import('./pages/Muscu'))
const Goals = lazy(() => import('./pages/Goals'))
const Sleep = lazy(() => import('./pages/Sleep'))
const Meals = lazy(() => import('./pages/Meals'))
const Tools = lazy(() => import('./pages/Tools'))
const Settings = lazy(() => import('./pages/Settings'))

function useTheme() {
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const root = document.documentElement
    const apply = () => {
      // Dans claude.ai, le thème choisi par le lecteur est posé sur data-theme
      const host = root.getAttribute('data-theme')
      const systemDark = host === 'dark' ? true : host === 'light' ? false : mq.matches
      const dark = theme === 'dark' || (theme === 'system' && systemDark)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f0f0e' : '#f4f4f1')
    }
    apply()
    mq.addEventListener('change', apply)
    const obs = new MutationObserver(apply)
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', apply)
      obs.disconnect()
    }
  }, [theme])
}

export default function App() {
  useTheme()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <MobileTopBar />
      <main className="px-4 pb-28 pt-5 sm:px-6 lg:ml-60 lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<div className="py-20 text-center text-sm text-ink-3">Chargement…</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/course" element={<Running />} />
            <Route path="/renfo" element={<Renfo />} />
            <Route path="/muscu" element={<Muscu />} />
            <Route path="/objectifs" element={<Goals />} />
            <Route path="/sommeil" element={<Sleep />} />
            <Route path="/repas" element={<Meals />} />
            <Route path="/outils" element={<Tools />} />
            <Route path="/reglages" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
          </Suspense>
        </div>
      </main>
      <BottomNav />
      <QuickAddSheet />
      <MoreSheet />
      <FormHost />
      <ConfirmHost />
      <SyncBoot />
      <Toast />
    </div>
  )
}
