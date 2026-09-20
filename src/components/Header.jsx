import { useLocation } from 'react-router-dom'
import { TLink } from './Transition'
import { site } from '../data/projects'

export default function Header() {
  const { pathname } = useLocation()
  const cur = (ok) => (ok ? 'page' : undefined)
  return (
    <header className="header">
      <nav aria-label="Main">
        <ul>
          <li>
            <TLink to="/" aria-label={`${site.name} home`}>
              {site.name}
            </TLink>
          </li>
          <li>
            <TLink to="/" aria-current={cur(pathname === '/' || pathname.startsWith('/projects'))}>Projects</TLink>
          </li>
          <li>
            <a href={`mailto:${site.email}`}>Contact</a>
          </li>
        </ul>
      </nav>
    </header>
  )
}
