import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCarousel } from '../lib/carousel'
import { gsap, getLenis } from '../lib/motion'
import { TLink } from '../components/Transition'
import { projects } from '../data/projects'

const items = projects.map((p) => ({ src: p.cover.src, title: p.title, slug: p.slug }))

export default function Home() {
  const canvas = useRef(null)
  const loader = useRef(null)
  const cursor = useRef(null)
  const list = useRef(null)
  const api = useRef(null)
  const view = useRef('overview')
  const navigate = useNavigate()
  const [pct, setPct] = useState(0)
  const [label, setLabel] = useState(null)
  const [mode, setMode] = useState('overview')
  const [ready, setReady] = useState(false)

  // lock page scroll while the WebGL home is showing
  useEffect(() => {
    getLenis()?.stop()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      getLenis()?.start()
      document.documentElement.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    let dead = false
    let follow
    createCarousel({
      canvas: canvas.current,
      items,
      onProgress: setPct,
      onHover: setLabel,
      onOpen: (it) => navigate(`/projects/${it.slug}`),
    }).then((c) => {
      if (dead) return c.destroy()
      api.current = c
      if (import.meta.env.DEV) window.__cv = c
      setReady(true)
      gsap.to(loader.current, { opacity: 0, duration: 0.5, ease: 'power1.inOut', onComplete: () => (loader.current.style.display = 'none') })
      c.play()
      // cursor label eases toward the pointer
      const pos = { x: 0, y: 0 }
      follow = () => {
        pos.x += (c.pointer.x - pos.x) * 0.1
        pos.y += (c.pointer.y - pos.y) * 0.1
        if (cursor.current) cursor.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      }
      gsap.ticker.add(follow)
    })
    return () => {
      dead = true
      if (follow) gsap.ticker.remove(follow)
      api.current?.destroy()
      api.current = null
    }
  }, [navigate])

  const switchTo = (next) => {
    if (next === view.current || !api.current) return
    view.current = next
    setMode(next)
    if (next === 'index') {
      api.current.hide()
      gsap.to(list.current, { autoAlpha: 1, duration: 0.6, delay: 0.7, ease: 'power1.inOut' })
    } else {
      gsap.to(list.current, { autoAlpha: 0, duration: 0.4, ease: 'power1.inOut' })
      api.current.show()
    }
  }

  return (
    <main id="main" className="home">
      <canvas ref={canvas} className="stage" aria-label="Project carousel" />

      <div className="cursor-label" ref={cursor} aria-hidden="true">
        {label && <span>{label.title}</span>}
      </div>

      <section className="index-view" ref={list} aria-label="Project index" style={{ visibility: 'hidden', opacity: 0 }}>
        <ul>
          {projects.map((p) => (
            <li key={p.slug}>
              <TLink to={`/projects/${p.slug}`} className="ix-row" tabIndex={mode === 'index' ? 0 : -1}>
                <span className="ix-n">{p.index}</span>
                <span className="ix-t">{p.title}</span>
                <span className="ix-tag">{p.tags}</span>
                <span className="ix-y">{p.year}</span>
              </TLink>
            </li>
          ))}
        </ul>
      </section>

      <div className="switch" role="group" aria-label="View">
        <button aria-pressed={mode === 'overview'} onClick={() => switchTo('overview')} disabled={!ready}>Overview</button>
        <button aria-pressed={mode === 'index'} onClick={() => switchTo('index')} disabled={!ready}>Index</button>
      </div>

      <div className="loader" ref={loader} role="status">
        <span>{pct}%</span>
      </div>
    </main>
  )
}
