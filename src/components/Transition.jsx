import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { useHref, useLocation, useNavigate } from 'react-router-dom'
import { gsap, getLenis, reduced } from '../lib/motion'

const Ctx = createContext({ go: () => {} })

export function TransitionProvider({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const curtain = useRef(null)
  const busy = useRef(false)

  useEffect(() => {
    gsap.set(curtain.current, { autoAlpha: 0 })
  }, [])

  const go = useCallback(
    (to) => {
      if (busy.current || to === pathname) return
      const jump = () => {
        navigate(to)
        window.scrollTo(0, 0)
        getLenis()?.scrollTo(0, { immediate: true, force: true })
      }
      if (reduced()) return jump()
      busy.current = true
      gsap
        .timeline({ onComplete: () => (busy.current = false) })
        .set(curtain.current, { autoAlpha: 0 })
        .to(curtain.current, { autoAlpha: 1, duration: 0.4, ease: 'power1.inOut' })
        .add(jump)
        .to(curtain.current, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' }, '+=0.05')
    },
    [navigate, pathname]
  )

  return (
    <Ctx.Provider value={{ go }}>
      {children}
      <div className="curtain" ref={curtain} aria-hidden="true" />
    </Ctx.Provider>
  )
}

export function TLink({ to, children, ...rest }) {
  const { go } = useContext(Ctx)
  const href = useHref(to)
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        go(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
