// Static slide viewer: reads decks/<id>/deck.json (exported PNGs). Keys: arrows/Space/PgUp/PgDn/Home/End, F fullscreen, G grid, Esc closes.
const id = new URLSearchParams(location.search).get('d')
const $ = (s) => document.querySelector(s)
let deck, i = 0
const base = `decks/${encodeURIComponent(id)}/`
const clamp = (n) => Math.max(0, Math.min(deck.slides.length - 1, n))
function show(n, push = true) {
  i = clamp(n)
  $('#slide').src = base + deck.slides[i].img
  $('#slide').alt = deck.slides[i].name
  $('#bar').style.width = ((i + 1) / deck.slides.length * 100) + '%'
  $('#count').textContent = `${i + 1} / ${deck.slides.length}`
  document.title = `${deck.title} (${i + 1}/${deck.slides.length})`
  if (push) history.replaceState(null, '', `#${i + 1}`)
  for (const k of [i + 1, i + 2]) if (deck.slides[k]) new Image().src = base + deck.slides[k].img
  document.querySelectorAll('#overview figure').forEach((f, k) => f.classList.toggle('cur', k === i))
}
function overview(open) {
  const o = $('#overview'); o.classList.toggle('open', open ?? !o.classList.contains('open'))
  if (o.classList.contains('open')) o.querySelector('.cur')?.scrollIntoView({ block: 'center' })
}
const fullscreen = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()
fetch(base + 'deck.json').then((r) => r.json()).then((d) => {
  deck = d
  $('#overview').innerHTML = d.slides.map((s, k) => `<figure data-k="${k}"><img src="${base + s.img}" loading="lazy" alt=""><figcaption>${k + 1}. ${s.name}</figcaption></figure>`).join('')
  $('#overview').addEventListener('click', (e) => { const f = e.target.closest('figure'); if (f) { show(+f.dataset.k); overview(false) } })
  show((parseInt(location.hash.slice(1)) || 1) - 1, false)
}).catch(() => { document.body.textContent = 'Deck not found.' })
$('#prev').onclick = () => show(i - 1); $('#next').onclick = () => show(i + 1)
$('#fs').onclick = fullscreen; $('#grid-btn').onclick = () => overview()
addEventListener('hashchange', () => deck && show((parseInt(location.hash.slice(1)) || 1) - 1, false))
addEventListener('keydown', (e) => {
  if (!deck || e.metaKey || e.ctrlKey || e.altKey) return
  const k = e.key
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) show(i + 1)
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) show(i - 1)
  else if (k === 'Home') show(0); else if (k === 'End') show(deck.slides.length - 1)
  else if (k === 'f' || k === 'F') fullscreen(); else if (k === 'g' || k === 'G') overview()
  else if (k === 'Escape') overview(false)
  else return
  e.preventDefault()
})
// touch swipe
let x0 = null
addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX }, { passive: true })
addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(i + (dx < 0 ? 1 : -1)); x0 = null })
// show HUD on mouse move, hide after idle
let t
addEventListener('mousemove', () => { document.body.classList.add('show'); document.body.classList.remove('hidecursor'); clearTimeout(t); t = setTimeout(() => { document.body.classList.remove('show'); document.body.classList.add('hidecursor') }, 2000) })
