import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore'
import { BottomNav, MobileTopBar, MoreSheet, QuickAddSheet, Sidebar, Toast } from './components/layout'
import { FormHost } from './components/forms'
import Dashboard from './pages/Dashboard'
import Planning from './pages/Planning'
import Running from './pages/Running'
import Renfo from './pages/Renfo'
import Muscu from './pages/Muscu'
import Goals from './pages/Goals'
import Sleep from './pages/Sleep'
import Meals from './pages/Meals'
import Tools from './pages/Tools'
import Settings from './pages/Settings'

function useTheme() {
  const theme = useStore((s) => s.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f0f0e' : '#f4f4f1')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
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
        </div>
      </main>
      <BottomNav />
      <QuickAddSheet />
      <MoreSheet />
      <FormHost />
      <Toast />
    </div>
  )
}
