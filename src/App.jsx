import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { initScroll, ScrollTrigger } from './lib/motion'
import { TransitionProvider } from './components/Transition'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Project from './pages/Project'

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    const destroy = initScroll()
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    return () => {
      window.removeEventListener('load', refresh)
      destroy()
    }
  }, [])

  return (
    <TransitionProvider>
      <a className="skip" href="#main">Skip to content</a>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:slug" element={<Project />} />
        <Route path="*" element={<Home />} />
      </Routes>
      {pathname !== '/' && <Footer />}
    </TransitionProvider>
  )
}
