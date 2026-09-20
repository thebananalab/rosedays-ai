// Reads originals (read-only), writes optimized copies to public/media + src/data/manifest.json
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const SRC = '/Users/rosedays/Desktop/Proyectos/AI portfolio/Portafolio Curado Rosedays'
const OUT = path.resolve('public/media')
const MANIFEST = path.resolve('src/data/manifest.json')
const IMG = /\.(png|jpe?g)$/i
const VID = /\.mp4$/i

const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const prettify = (s) => s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()

const done = (p) => fs.existsSync(p) && fs.statSync(p).size > 0

async function image(file, outBase) {
  const out = outBase + '.webp'
  const img = sharp(file).rotate()
  const meta = await img.metadata()
  if (!done(out)) await img.resize({ width: 1800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out)
  const m = await sharp(out).metadata()
  return { type: 'image', src: '/media/' + path.relative(OUT, out), w: m.width, h: m.height }
}

function video(file, outBase) {
  const mp4 = outBase + '.mp4'
  const poster = outBase + '.jpg'
  if (!done(mp4))
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-an',
      '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-crf', '27', '-preset', 'slow',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
  if (!done(poster))
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.5', '-i', mp4, '-frames:v', '1', '-q:v', '4', poster])
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', mp4]).toString().trim().split('x').map(Number)
  const rel = (p) => '/media/' + path.relative(OUT, p)
  return { type: 'video', src: rel(mp4), poster: rel(poster), w, h }
}

async function media(file, dir, name) {
  fs.mkdirSync(dir, { recursive: true })
  const base = path.join(dir, name)
  if (IMG.test(file)) return image(file, base)
  if (VID.test(file)) return video(file, base)
  return null
}

const projects = []
const dirs = fs.readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
for (const [i, d] of dirs.entries()) {
  const slug = slugify(d)
  const files = fs.readdirSync(path.join(SRC, d)).filter((f) => IMG.test(f) || VID.test(f)).sort()
  const items = []
  for (const [j, f] of files.entries()) {
    const it = await media(path.join(SRC, d, f), path.join(OUT, slug), String(j + 1).padStart(2, '0'))
    if (it) items.push(it)
  }
  // cover: prefer first image, else first video poster
  projects.push({ slug, title: prettify(d), items })
  console.log(slug, items.length)
}

// extras: reel + portrait
const extras = {}
const reel = path.join(SRC, 'reel_rosedays_1.mp4')
if (fs.existsSync(reel)) extras.reel = await media(reel, path.join(OUT, '_site'), 'reel')
const portrait = path.join(SRC, '1701177296165.jpeg')
if (fs.existsSync(portrait)) extras.portrait = await media(portrait, path.join(OUT, '_site'), 'portrait')

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true })
fs.writeFileSync(MANIFEST, JSON.stringify({ projects, extras }, null, 2))
console.log('manifest written')
