import manifest from './manifest.json'

// media paths in the manifest are root-relative; prefix with the deploy base (GitHub Pages subpath)
const base = import.meta.env.BASE_URL.replace(/\/$/, '')
const fix = (m) => (m ? { ...m, src: base + m.src, ...(m.poster ? { poster: base + m.poster } : {}) } : m)

// ---- EDIT ME: site-wide copy (placeholders) --------------------------------
export const site = {
  name: 'ROSEDAYS.AI',
  tagline: 'AI visual direction — surreal fashion, ocean myth & moving image.',
  email: 'lerosedays@icloud.com',
  instagram: { label: '@rosedays', href: 'https://instagram.com/' },
  location: 'Available worldwide',
  year: '26',
  bio: [
    'Placeholder bio. ROSEDAYS.AI is a visual director working with generative tools to build surreal worlds — fashion editorials, ocean myths and moving image.',
    'Every project starts as a world, not a prompt: palette, texture, character, motion. The tools change fast; the eye is what stays.',
  ],
  services: ['Art direction', 'AI image & video', 'Fashion editorial', 'Campaign visuals', 'Motion / reels', 'Creative consulting'],
}

// ---- EDIT ME: per-project details (keyed by slug). Defaults apply otherwise --
const defaults = { year: '2026', tags: 'AI visual direction', blurb: 'Placeholder description for this project.' }
const meta = {
  // 'balloon-dreams': { year: '2026', tags: 'Fashion editorial · Video', blurb: '…' },
}

export const projects = manifest.projects.map((raw, i) => {
  const p = { ...raw, items: raw.items.map(fix) }
  const firstImage = p.items.find((m) => m.type === 'image')
  const firstVideo = p.items.find((m) => m.type === 'video')
  const cover = firstImage || (firstVideo && { type: 'image', src: firstVideo.poster, w: firstVideo.w, h: firstVideo.h })
  return {
    ...defaults,
    ...meta[p.slug],
    slug: p.slug,
    title: p.title,
    index: String(i + 1).padStart(2, '0'),
    items: p.items,
    cover,
    preview: firstVideo || null,
    videos: p.items.filter((m) => m.type === 'video').length,
  }
})

export const extras = Object.fromEntries(Object.entries(manifest.extras).map(([k, v]) => [k, fix(v)]))
