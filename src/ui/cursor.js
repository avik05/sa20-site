// Custom cursor with a contextual label, plus magnetic buttons.
import gsap from 'gsap'
export function initCursor({ enabled }) {
  const el = document.getElementById('cur')
  if (!enabled) { el.remove(); return }
  document.documentElement.classList.add('has-cur')
  const lab = el.querySelector('b'), ring = el.querySelector('i')
  const xTo = gsap.quickTo(el, 'x', { duration: .35, ease: 'power3' }), yTo = gsap.quickTo(el, 'y', { duration: .35, ease: 'power3' })
  let shown = false
  addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); if (!shown) { shown = true; gsap.to(el, { opacity: 1, duration: .3 }) } }, { passive: true })
  document.addEventListener('pointerleave', () => { shown = false; gsap.to(el, { opacity: 0, duration: .3 }) })
  const LABELS = [['[data-cur]', t => t.dataset.cur], ['.wcard', () => 'Drag'], ['#roomCv', () => 'Look'], ['.reel .pin', () => 'Scroll']]
  document.addEventListener('pointerover', e => {
    let text = ''
    for (const [sel, fn] of LABELS) { const t = e.target.closest?.(sel); if (t) { text = fn(t); break } }
    const link = !text && e.target.closest?.('a,button')
    lab.textContent = text
    el.classList.toggle('label', !!text); el.classList.toggle('link', !!link)
  })
  addEventListener('pointerdown', () => gsap.to(ring, { scale: .8, duration: .15 })); addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: .4, ease: 'elastic.out(1,.4)' }))
  // magnetic buttons
  document.querySelectorAll('[data-mag]').forEach(b => {
    const x = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), y = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' })
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .35); y((e.clientY - r.top - r.height / 2) * .45) })
    b.addEventListener('pointerleave', () => { gsap.to(b, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.35)' }) })
  })
}
