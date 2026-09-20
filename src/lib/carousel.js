// 3D image carousel — behaviour modelled on the unveil.fr home:
//  - planes sit on a diagonal line (rotated -30° in Y) that recedes in depth
//  - wheel / drag / touch move them along an endless loop (eased with lerp)
//  - intro: tiles fly in from the side, group scales .825 -> 1
//  - hover slides a tile sideways; click flattens it to the centre, then opens it
//  - image edges blur into the page through a custom shader
import * as THREE from 'three'
import gsap from 'gsap'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec2 uMeshSize;
  uniform vec2 uImageSize;
  uniform sampler2D uImageTexture;
  uniform sampler2D uBlurTexture;
  varying vec2 vUv;

  void main() {
    vec2 ratio = vec2(
      min((uMeshSize.x / uMeshSize.y) / (uImageSize.x / uImageSize.y), 1.0),
      min((uMeshSize.y / uMeshSize.x) / (uImageSize.y / uImageSize.x), 1.0)
    );
    vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);

    float margin = 0.15;
    float p = 1.0;
    if (vUv.x < margin) p *= smoothstep(0.0, margin, vUv.x);
    if (vUv.x > 1.0 - margin) p *= smoothstep(1.0, 1.0 - margin, vUv.x);
    if (vUv.y < margin) p *= smoothstep(0.0, margin, vUv.y);
    if (vUv.y > 1.0 - margin) p *= smoothstep(1.0, 1.0 - margin, vUv.y);

    vec4 blur = texture2D(uBlurTexture, uv);
    vec4 img = texture2D(uImageTexture, uv);
    blur.a *= 0.75;
    gl_FragColor = mix(img, blur, 1.0 - p);
  }
`

const SPACING = 0.375 // world-x gap between neighbours
const SLOT = 1.5 // tile width in world units

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Tiny canvas, upscaled with linear filtering = cheap blur that works in every browser.
function blurCanvas(img) {
  const c = document.createElement('canvas')
  c.width = 24
  c.height = Math.max(1, Math.round((24 * img.naturalHeight) / img.naturalWidth))
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
  return c
}

export async function createCarousel({ canvas, items, onProgress, onHover, onOpen }) {
  const canHover = window.matchMedia('(hover: hover)').matches
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  const scene = new THREE.Scene()
  const group = new THREE.Group()
  scene.add(group)
  const camera = new THREE.PerspectiveCamera(14, 1, 0.1, 100)
  camera.position.z = 26

  let w = 1
  let h = 1
  const resize = () => {
    w = window.innerWidth
    h = window.innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    group.position.x = w > h ? 1.2 : 0 // centre the diagonal's visual mass
  }
  resize()
  window.addEventListener('resize', resize)

  // ---- load textures (drives the % loader) ----
  let loaded = 0
  const images = await Promise.all(
    items.map(async (it) => {
      const img = await loadImage(it.src)
      onProgress?.(Math.round((++loaded / items.length) * 100))
      return img
    })
  )

  const F = (items.length * SPACING) / 2
  const T = { x: -20 } // intro / exit offset (in "index" units)
  const scroll = { current: 0, previous: 0 }
  const drag = { active: false, moved: false, value: 0, smooth: 0, lastX: 0, lastY: 0 }
  let openIndex = null
  let hovered = null
  let running = true

  const tiles = items.map((it, i) => {
    const root = new THREE.Group()
    const mover = new THREE.Group()
    const inner = new THREE.Group()
    const be = images[i].naturalHeight / images[i].naturalWidth
    let H = SLOT
    let W = SLOT * be
    const fe = 1 - (be - 1) * 0.5
    H *= fe
    W *= fe

    const geo = new THREE.BoxGeometry(H, W, 0.0175)
    const imgTex = new THREE.Texture(images[i])
    imgTex.needsUpdate = true
    imgTex.anisotropy = 4
    const blurTex = new THREE.CanvasTexture(blurCanvas(images[i]))
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uImageTexture: { value: imgTex },
        uBlurTexture: { value: blurTex },
        uImageSize: { value: new THREE.Vector2(images[i].naturalWidth, images[i].naturalHeight) },
        uMeshSize: { value: new THREE.Vector2(H, W) },
      },
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.x = -(H - SLOT) / 2

    const hit = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    hit.scale.x = 1.5
    hit.userData.index = i

    inner.add(mesh)
    mover.add(inner)
    mover.add(hit)
    root.add(mover)
    group.add(root)
    return { i, root, mover, inner, mesh, hit, be, hovered: false }
  })

  // ---- per frame ----
  const raycaster = new THREE.Raycaster()
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, inside: false }

  function setHover(next) {
    if (next === hovered) return
    hovered = next
    tiles.forEach((t) => {
      const on = t.i === next && openIndex === null
      gsap.to(t.inner.position, { x: on ? (canHover ? 2 / 3 : 0.325) : 0, y: on ? -0.1 : 0, ease: 'expo.out', duration: 0.5, overwrite: true })
    })
    canvas.style.cursor = next === null ? (drag.active ? 'grabbing' : 'grab') : 'pointer'
    onHover?.(next === null ? null : items[next])
  }

  function frame() {
    if (!running) return
    scroll.previous += (scroll.current - scroll.previous) * 0.15
    drag.smooth += (drag.value - drag.smooth) * 0.1

    const aspect = w / h
    const q = canHover ? 100 : 50
    const J = scroll.previous / 25 - drag.smooth / q + T.x

    for (const t of tiles) {
      t.root.visible = openIndex === null ? true : openIndex === t.i
      if (openIndex !== null) continue
      const x = gsap.utils.wrap(-F, F, (t.i - J) * SPACING)
      t.mover.position.x = x
      t.mover.position.y = 0
      t.mover.position.z = aspect < 1 ? -x * 6 : -x * aspect * 1.5
      t.mover.rotation.x = 0
      t.mover.rotation.y = -Math.PI / 6
      t.mover.visible = t.mover.position.z < 12.5 && t.mover.position.z > -12.5
    }

    // hover: raycast on desktop, tile nearest the centre on touch
    if (openIndex === null) {
      if (canHover) {
        if (!pointer.inside || drag.moved) setHover(null)
        else {
          raycaster.setFromCamera({ x: pointer.nx, y: pointer.ny }, camera)
          const hits = raycaster.intersectObjects(tiles.filter((t) => t.mover.visible).map((t) => t.hit))
          setHover(hits.length ? hits[0].object.userData.index : null)
        }
      } else {
        const vis = tiles.filter((t) => t.mover.visible)
        const c = vis.reduce((a, b) => (Math.abs(a.mover.position.z) < Math.abs(b.mover.position.z) ? a : b), vis[0])
        setHover(c ? c.i : null)
      }
    }
    renderer.render(scene, camera)
  }
  gsap.ticker.add(frame)

  // ---- input ----
  const onWheel = (e) => {
    if (openIndex !== null) return
    scroll.current += ((e.deltaY + e.deltaX) * 1.2) / 20
  }
  let downAt = 0
  const onDown = (e) => {
    if (e.target !== canvas || openIndex !== null) return
    drag.active = true
    drag.moved = false
    drag.lastX = e.clientX
    drag.lastY = e.clientY
    downAt = e.timeStamp
    canvas.style.cursor = 'grabbing'
  }
  const onMove = (e) => {
    pointer.inside = e.target === canvas
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.nx = (e.clientX / w) * 2 - 1
    pointer.ny = -(e.clientY / h) * 2 + 1
    if (!drag.active) return
    const dx = e.clientX - drag.lastX
    const dy = e.clientY - drag.lastY
    drag.lastX = e.clientX
    drag.lastY = e.clientY
    drag.value += dx - dy
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 2) {
      drag.moved = true
      gsap.to(group.scale, { x: 0.825, y: 0.825, z: 0.825, duration: 0.75, ease: 'expo.out', overwrite: true })
    }
  }
  const onUp = (e) => {
    if (!drag.active) return
    const wasDrag = drag.moved
    drag.active = false
    drag.moved = false
    canvas.style.cursor = hovered === null ? 'grab' : 'pointer'
    if (wasDrag) gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.75, ease: 'expo.out', overwrite: true })
    else if (e.timeStamp - downAt < 300 && hovered !== null) open(hovered)
  }
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  canvas.style.cursor = 'grab'

  // ---- choreography ----
  function play() {
    T.x = -20
    gsap.to(T, { x: 0, ease: 'expo.out', duration: 2, overwrite: true })
    group.scale.setScalar(0.825)
    gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 1, delay: 1.25, ease: 'expo.out', overwrite: true })
  }
  const hide = () => gsap.to(T, { x: 10, ease: 'expo.inOut', duration: 1.25, overwrite: true })
  const show = () => {
    T.x = -20
    gsap.to(T, { x: 0, ease: 'expo.out', duration: 2, overwrite: true })
  }

  function open(i) {
    if (openIndex !== null) return
    setHover(null)
    openIndex = i
    const t = tiles[i]
    const aspect = w / h
    gsap.to(t.inner.position, { x: 0, y: 0, duration: 0.6, ease: 'expo.out', overwrite: true })
    gsap.to(t.mesh.position, { x: 0, duration: 1.25 / 1.5, ease: 'expo.out' })
    gsap.to(t.mover.position, {
      x: 0,
      duration: 1.25 / 1.5,
      ease: 'expo.out',
      onUpdate: () => (t.mover.position.z = -t.mover.position.x * aspect * 1.5),
    })
    gsap.to(t.mover.rotation, { y: 0, duration: 1.25, ease: 'expo.inOut', onComplete: () => onOpen?.(items[i]) })
    onHover?.(null)
  }

  function destroy() {
    running = false
    gsap.ticker.remove(frame)
    gsap.killTweensOf([T, group.scale])
    window.removeEventListener('resize', resize)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    tiles.forEach((t) => {
      t.mesh.geometry.dispose()
      t.mesh.material.uniforms.uImageTexture.value.dispose()
      t.mesh.material.uniforms.uBlurTexture.value.dispose()
      t.mesh.material.dispose()
    })
    renderer.dispose()
  }

  const debug = () =>
    tiles
      .filter((t) => t.mover.visible)
      .map((t) => {
        const v = new THREE.Vector3()
        t.mover.getWorldPosition(v).project(camera)
        return { i: t.i, sx: Math.round((v.x * w) / 2 + w / 2), sy: Math.round((-v.y * h) / 2 + h / 2), z: +t.mover.position.z.toFixed(1) }
      })
  return { play, hide, show, open, destroy, pointer, debug, get hovered() { return hovered } }
}
