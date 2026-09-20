import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { TLink } from '../components/Transition'
import Media from '../components/Media'
import { gsap, reduced } from '../lib/motion'
import { projects } from '../data/projects'

export default function Project() {
  const { slug } = useParams()
  const scope = useRef(null)
  const i = projects.findIndex((p) => p.slug === slug)
  const p = projects[i]

  // fade the page in (mirrors unveil's overlay fade)
  useEffect(() => {
    window.scrollTo(0, 0)
    if (reduced() || !scope.current) return
    const t = gsap.fromTo(scope.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.inOut' })
    return () => t.kill()
  }, [slug])

  if (!p)
    return (
      <main id="main" className="doc" ref={scope}>
        <p>Not found. <TLink to="/">← Projects</TLink></p>
      </main>
    )
  const next = projects[(i + 1) % projects.length]
  const verticals = p.items.filter((it) => !(it.w > it.h * 1.2)).length
  const cols = verticals % 2 === 1 ? 3 : 2 // odd count -> 3 columns
  // 3-col: fill the last row by widening the tail (rem 2 -> last 2 halves; rem 1 -> last 4 as 2x2)
  const rem = verticals % 3
  const tail = cols === 3 && verticals >= 4 ? (rem === 1 ? 4 : rem === 2 ? 2 : 0) : 0
  let vi = -1

  return (
    <main id="main" className="project" ref={scope} key={p.slug}>
      <section className="p-head">
        <h1>{p.title}</h1>
        <p>{p.blurb}</p>
      </section>
      <section className={`p-grid cols-${cols}`} aria-label={`${p.title} visuals`}>
        {p.items.map((it, n) => {
          const wide = it.w > it.h * 1.2
          if (!wide) vi++
          const isTail = !wide && vi >= verticals - tail
          return (
            <div key={it.src} className={`p-cell ${wide ? 'wide' : ''} ${isTail ? 'tail' : ''}`}>
              {wide ? (
                <Media item={it} alt={`${p.title} ${n + 1}`} />
              ) : (
                <div className="ph">
                  <Media item={it} alt={`${p.title} ${n + 1}`} fit />
                </div>
              )}
            </div>
          )
        })}
      </section>
      <TLink to={`/projects/${next.slug}`} className="p-next">
        <span>{next.title}</span>
        <span className="dim">Next project</span>
      </TLink>
    </main>
  )
}
