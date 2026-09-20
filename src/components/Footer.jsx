import { site } from '../data/projects'

export default function Footer() {
  return (
    <footer className="footer">
      <a href={`mailto:${site.email}`}>{site.email}</a>
      <a href={site.instagram.href} target="_blank" rel="noreferrer">{site.instagram.label}</a>
      <span>{site.location}</span>
      <span>© {site.year}</span>
    </footer>
  )
}
