import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis = null
export const getLenis = () => lenis

export function initScroll() {
  if (reduced()) return () => {}
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (t) => lenis.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  return () => {
    gsap.ticker.remove(tick)
    lenis.destroy()
    lenis = null
  }
}

// First paint starts fast; later pages wait for the transition curtain to lift.
let first = true
const introDelay = () => {
  const d = first ? 0.15 : 0.55
  first = false
  return d
}

// Standard page choreography:
//  [data-hero] .wi  -> words rise on load
//  [data-in]        -> fade/slide in on load
//  [data-reveal]    -> clip reveal on scroll
export function usePage(scope) {
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reduced()) return
      const delay = introDelay()
      gsap.from('[data-hero] .wi', { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.07, delay })
      gsap.from('[data-in]', { y: 22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: delay + 0.25 })
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: 'inset(14% 0% 0% 0%)', opacity: 0 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            opacity: 1,
            duration: 1.2,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 94%', once: true },
          }
        )
      })
    }, scope)
    return () => ctx.revert()
  }, [scope])
}

export { gsap, ScrollTrigger }
