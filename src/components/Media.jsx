import { useEffect, useRef } from 'react'

// Image or video tile. Videos: muted loops, played only while visible ('view')
// or while hovered ('hover', driven by the parent through the `playing` prop).
export default function Media({ item, alt = '', mode = 'view', playing = false, fit = false, priority = false }) {
  const ref = useRef(null)
  const style = fit ? undefined : { aspectRatio: `${item.w} / ${item.h}` }

  useEffect(() => {
    if (item.type !== 'video' || mode !== 'view') return
    const v = ref.current
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()),
      { threshold: 0.25 }
    )
    io.observe(v)
    return () => io.disconnect()
  }, [item, mode])

  useEffect(() => {
    if (item.type !== 'video' || mode !== 'hover') return
    const v = ref.current
    if (playing) v.play().catch(() => {})
    else v.pause()
  }, [playing, item, mode])

  if (item.type === 'image')
    return (
      <img
        className="media"
        src={item.src}
        width={item.w}
        height={item.h}
        alt={alt}
        style={style}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    )

  return (
    <video
      ref={ref}
      className="media"
      src={item.src}
      poster={item.poster}
      width={item.w}
      height={item.h}
      style={fit ? style : { ...style, backgroundImage: `url(${item.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      muted
      loop
      playsInline
      preload={mode === 'hover' ? 'none' : 'metadata'}
      aria-label={alt}
    />
  )
}
