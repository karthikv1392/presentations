// Static slide viewer: reads decks/<id>/deck.json (exported PNGs).
// A slide may have builds: [img, ...] (states before the final image; each step fades in the next state)
// and details: [{ img, focus:{x,y,w,h} }]. Stepping goes slide -> zoom into the box -> box expands into the detail -> next.
// Keys: arrows/Space/PgUp/PgDn/Home/End, F fullscreen, G grid, Esc closes grid.
const id = new URLSearchParams(location.search).get('d')
const $ = (s) => document.querySelector(s)
const world = $('#world'), base = $('#slide'), det = $('#detail'), fade = $('#fade')
const dir = `decks/${encodeURIComponent(id)}/`
let deck, steps = [], k = 0, shown = null, timer
const noTrans = (el, fn) => { el.style.transition = 'none'; fn(); void el.offsetWidth; el.style.transition = '' }
const pad = (r) => { const px = 0.02, py = 0.035; const x = Math.max(0, r.x - px), y = Math.max(0, r.y - py); return { x, y, w: Math.min(1 - x, r.w + 2 * px), h: Math.min(1 - y, r.h + 2 * py) } }
const camera = (r) => { const s = Math.min(1 / r.w, 1 / r.h); return `translate(${(0.5 - s * (r.x + r.w / 2)) * 100}%, ${(0.5 - s * (r.y + r.h / 2)) * 100}%) scale(${s})` }
const box = (r) => { det.style.left = r.x * 100 + '%'; det.style.top = r.y * 100 + '%'; det.style.width = r.w * 100 + '%'; det.style.height = r.h * 100 + '%' }
const full = { x: 0, y: 0, w: 1, h: 1 }

function prepare(slide, di) { // park the detail image over its source box, hidden
  const d = slide.details[di]
  noTrans(det, () => { det.src = dir + d.img; box(pad(d.focus)); det.style.opacity = 0 })
  shown = di
}

function render(prev) {
  clearTimeout(timer)
  const st = steps[k], slide = deck.slides[st.si], same = prev != null && steps[prev].si === st.si
  const imgOf = (s) => (s.kind === 'build' ? slide.builds[s.bi] : slide.img)
  noTrans(fade, () => { fade.style.opacity = 0 })
  if (!same) {
    noTrans(world, () => { world.style.transform = 'none' })
    noTrans(det, () => { det.style.opacity = 0 })
    base.src = dir + imgOf(st); shown = null
  } else if (st.kind === 'build' || (st.kind === 'slide' && steps[prev].kind === 'build')) {
    const src = dir + imgOf(st)
    if (prev < k) { // forward: fade the next state in over the current one
      fade.src = src
      const done = () => { base.src = src; noTrans(fade, () => { fade.style.opacity = 0 }) }
      fade.decode().catch(() => {}).then(() => { void fade.offsetWidth; fade.style.opacity = 1; timer = setTimeout(done, 480) })
    } else base.src = src
  } else if (st.kind === 'slide' && steps[prev].kind !== 'slide') base.src = dir + slide.img
  if (st.kind === 'slide' || st.kind === 'build') {
    world.style.transform = 'none'; det.style.opacity = 0
  } else if (st.kind === 'focus') {
    const r = pad(slide.details[st.di].focus)
    if (shown !== st.di) {
      if (shown != null && det.style.opacity === '1') { det.style.opacity = 0; timer = setTimeout(() => prepare(slide, st.di), 600) } else prepare(slide, st.di)
    } else box(r)
    world.style.transform = camera(r)
  } else {
    const r = pad(slide.details[st.di].focus)
    if (shown !== st.di) prepare(slide, st.di)
    world.style.transform = camera(r)
    void det.offsetWidth; box(full); det.style.opacity = 1
  }
  $('#bar').style.width = ((st.si + 1) / deck.slides.length * 100) + '%'
  $('#count').textContent = `${st.si + 1} / ${deck.slides.length}` + (st.kind === 'build' ? ` · step ${st.bi + 1}` : st.kind === 'slide' ? '' : ` · detail`)
  document.title = `${deck.title} (${st.si + 1}/${deck.slides.length})`
  history.replaceState(null, '', `#${st.si + 1}`)
  for (const n of steps.slice(k + 1, k + 4)) { new Image().src = dir + (n.kind === 'detail' ? deck.slides[n.si].details[n.di].img : n.kind === 'build' ? deck.slides[n.si].builds[n.bi] : deck.slides[n.si].img) }
  document.querySelectorAll('#overview figure').forEach((f, i) => f.classList.toggle('cur', i === st.si))
}
const go = (n) => { const prev = k; k = Math.max(0, Math.min(steps.length - 1, n)); render(prev) }
const firstOf = (si) => steps.findIndex((s) => s.si === si && (s.kind === 'build' || s.kind === 'slide'))
const goSlide = (si) => go(firstOf(si))
function overview(open) {
  const o = $('#overview'); o.classList.toggle('open', open ?? !o.classList.contains('open'))
  if (o.classList.contains('open')) o.querySelector('.cur')?.scrollIntoView({ block: 'center' })
}
const fullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()

fetch(dir + 'deck.json').then((r) => r.json()).then((d) => {
  deck = d
  d.slides.forEach((s, si) => { (s.builds || []).forEach((_, bi) => steps.push({ si, bi, kind: 'build' })); steps.push({ si, kind: 'slide' }); (s.details || []).forEach((_, di) => { steps.push({ si, di, kind: 'focus' }); steps.push({ si, di, kind: 'detail' }) }) })
  $('#overview').innerHTML = d.slides.map((s, i) => `<figure data-k="${i}"><img src="${dir + s.img}" loading="lazy" alt=""><figcaption>${i + 1}. ${s.name}${s.details?.length ? ' (+' + s.details.length + ')' : ''}</figcaption></figure>`).join('')
  $('#overview').addEventListener('click', (e) => { const f = e.target.closest('figure'); if (f) { goSlide(+f.dataset.k); overview(false) } })
  const start = (parseInt(location.hash.slice(1)) || 1) - 1
  k = Math.max(0, firstOf(start)); render(null)
}).catch(() => { document.body.textContent = 'Deck not found.' })

$('#prev').onclick = () => go(k - 1); $('#next').onclick = () => go(k + 1)
$('#fs').onclick = fullscreen; $('#grid-btn').onclick = () => overview()
addEventListener('hashchange', () => { if (!deck) return; const si = (parseInt(location.hash.slice(1)) || 1) - 1; if (steps[k].si !== si) goSlide(si) })
addEventListener('keydown', (e) => {
  if (!deck || e.metaKey || e.ctrlKey || e.altKey) return
  const key = e.key
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(key)) go(k + 1)
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(key)) go(k - 1)
  else if (key === 'Home') go(0); else if (key === 'End') go(steps.length - 1)
  else if (key === 'f' || key === 'F') fullscreen(); else if (key === 'g' || key === 'G') overview()
  else if (key === 'Escape') overview(false)
  else return
  e.preventDefault()
})
let x0 = null
addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX }, { passive: true })
addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(k + (dx < 0 ? 1 : -1)); x0 = null })
let t
addEventListener('mousemove', () => { document.body.classList.add('show'); document.body.classList.remove('hidecursor'); clearTimeout(t); t = setTimeout(() => { document.body.classList.remove('show'); document.body.classList.add('hidecursor') }, 2000) })
