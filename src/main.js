import './styles.css'
import './extra.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { REEL, EVENTS, CH_PREVIEW } from './data.js'
import { initPhotosGL } from './gl/photos.js'
import { initMountain } from './scenes/mountain.js'
import { initGlobe } from './scenes/globe.js'
import { initCursor } from './ui/cursor.js'
import { initWall } from './ui/wall.js'
import { sound } from './ui/sound.js'

gsap.registerPlugin(ScrollTrigger, SplitText)

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)]
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches
const TOUCH = matchMedia('(pointer:coarse)').matches
const small = () => innerWidth <= 900
const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } })()
const FX = webgl && !RM            // heavy effects allowed
document.documentElement.classList.toggle('fx', FX)
document.documentElement.classList.toggle('touch', TOUCH)

/* ---------- smooth scroll ---------- */
let lenis = null
if (!RM) {
  lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(t => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}
const scrollToEl = el => lenis ? lenis.scrollTo(el, { duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) }) : el.scrollIntoView()
const lock = on => { if (lenis) on ? lenis.stop() : lenis.start(); document.documentElement.style.overflow = on ? 'hidden' : '' }

/* ---------- reel + marquee content ---------- */
const track = $('#track')
track.innerHTML = REEL.map((c, i) => `<article class="fr ${c.v} ${c.ph ? '' : 'np'}" ${c.mc ? `data-mc="${c.mc}"` : ''}>
 <div class="top"><span class="mono">${String(i + 1).padStart(2, '0')} / ${REEL.length}</span><span class="mono">${c.d}</span></div>
 <div class="bd"><h4>${c.t}</h4><p>${c.p}</p>${c.ph ? `<div class="ph in" data-src="${c.ph[0]}" data-label="${c.ph[1]}"></div>` : `<div class="ghost">${String(i + 1).padStart(2, '0')}</div>`}</div></article>`).join('')
const mq = $('#mq')
mq.innerHTML = (EVENTS.map(e => `<span>${e}</span><span>✳</span>`).join('')).repeat(2)

/* ---------- word split (quotes, cold open) ---------- */
$$('.card h2').forEach(h => h.removeAttribute('data-split'))
$$('[data-split]').forEach(el => {
  let i = 0
  const walk = n => {
    [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment()
        c.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return; if (/^\s+$/.test(t)) { f.append(' '); return }
          const w = document.createElement('span'); w.className = 'w'; const s = document.createElement('span'); s.textContent = t; s.style.setProperty('--i', i++); w.append(s); f.append(w)
        })
        c.replaceWith(f)
      } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c)
    })
  }
  walk(el)
})

/* ---------- photo slots ---------- */
const photoItems = []
$$('.ph').forEach(el => {
  const src = el.dataset.src
  el.insertAdjacentHTML('beforeend', `<div class="slot"><span class="mono">Photo slot</span><span class="lab">${el.dataset.label || ''}</span><span class="mono">${src}</span></div>`)
  const im = new Image(); im.alt = el.dataset.label || ''
  im.onload = () => { el.append(im); requestAnimationFrame(() => el.classList.add('has')); if (!el.closest('.fr')) photoItems.push({ el, img: im }); photosGL?.add(el, im) }
  im.onerror = () => { const f = el.closest('.fr'); if (f) { f.classList.add('np'); const g = document.createElement('div'); g.className = 'ghost'; g.textContent = f.querySelector('.top .mono').textContent.slice(0, 2); el.replaceWith(g) } }
  im.src = src
})

/* ---------- reveal + counters ---------- */
const counted = new WeakSet()
function count(el) {
  if (counted.has(el)) return; counted.add(el)
  const to = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: 0 }
  gsap.to(o, { v: to, duration: RM ? 0 : 1.8, ease: 'power4.out', onUpdate: () => el.textContent = o.v.toFixed(dec) })
}
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return
  e.target.classList.add('in')
  $$('[data-count]', e.target.parentElement).forEach(count)
  io.unobserve(e.target)
}), { threshold: .18, rootMargin: '0px 0px -6% 0px' })
$$('.rv,[data-split],.ph,[data-rv],.stat,.vs').forEach(e => io.observe(e))

const sheetRows = $$('#sheet .r.ok,#sheet .r.no'); const okSet = sheetRows.map(r => r.classList.contains('ok'))
sheetRows.forEach(r => r.classList.remove('ok'))
new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { sheetRows.forEach((r, i) => setTimeout(() => { if (okSet[i]) { r.classList.add('ok'); sound.tick(900 + i * 60) } }, RM ? 0 : 350 + i * 260)); o.disconnect() } }), { threshold: .5 }).observe($('#sheet'))

/* ---------- chapter select ---------- */
const chapters = $$('[data-ch]')
const nav = $('#nav'), mb = $('#menuBtn'), navPrev = $('#navPrev'), navNum = $('#navNum')
$('#navList').innerHTML = chapters.map(c => { c.id = c.id || 'ch' + c.dataset.ch; return `<li><a href="#${c.id}" data-ch="${c.dataset.ch}" data-cur="Go"><span class="mono">${c.dataset.ch}</span><span class="t">${c.dataset.title}</span><span class="mono d">${c.dataset.date}</span></a></li>` }).join('')
const prevImgs = {}
Object.entries(CH_PREVIEW).forEach(([k, v]) => { const i = new Image(); i.src = `photos/${v}.jpg`; i.dataset.k = k; navPrev.prepend(i); prevImgs[k] = i })
const showPrev = k => { Object.values(prevImgs).forEach(i => i.classList.toggle('on', i.dataset.k === k)); navNum.textContent = k }
$$('#navList a').forEach(a => {
  a.addEventListener('mouseenter', () => { showPrev(a.dataset.ch); sound.tick(700) })
  a.addEventListener('click', e => { e.preventDefault(); toggleNav(false); sound.whoosh(); setTimeout(() => scrollToEl($(a.getAttribute('href'))), 350) })
})
let navOpen = false
function toggleNav(o) {
  if (o === navOpen) return; navOpen = o
  nav.classList.toggle('open', o); mb.setAttribute('aria-expanded', o); lock(o)
  if (o) { showPrev(chapters[curCh]?.dataset.ch || '00'); sound.whoosh(); gsap.fromTo('#navList li', { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .9, ease: 'power4.out', stagger: .04, delay: .25 }) }
}
mb.onclick = () => toggleNav(true); $('#navClose').onclick = () => toggleNav(false)
addEventListener('keydown', e => { if (e.key === 'Escape') toggleNav(false) })
$$('a[href="#top"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); scrollToEl($('#top')) }))

/* ---------- kinetic chapter cards ---------- */
if (!RM) {
  $$('.card').forEach((card, idx) => {
    const h = $('h2', card), num = $('.num', card), meta = $('.meta', card)
    const st = new SplitText(h, { type: 'words,chars', wordsClass: 'kw', charsClass: 'kc' })
    const wipe = document.createElement('div'); wipe.className = 'wipe ' + (idx % 2 ? 'm' : 'a'); card.append(wipe)
    gsap.set(st.chars, { yPercent: 130, rotate: 10 })
    gsap.set([num, meta], { opacity: 0 })
    gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 45%', once: true, onEnter: () => sound.whoosh() } })
      .fromTo(wipe, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: .6, ease: 'power4.inOut' })
      .set([num, meta], { opacity: 1 })
      .set(wipe, { transformOrigin: '50% 0%' })
      .to(wipe, { scaleY: 0, duration: .75, ease: 'power4.inOut' })
      .to(st.chars, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'power4.out', stagger: .028 }, '-=.6')
      .from(num, { xPercent: 12, duration: 1.6, ease: 'power3.out' }, '<')
    gsap.fromTo(num, { yPercent: -10 }, { yPercent: 22, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } })
    // the title breaks apart as the card leaves
    gsap.to(st.words, {
      y: () => gsap.utils.random(-320, -60), x: () => gsap.utils.random(-80, 80), rotate: () => gsap.utils.random(-18, 18), opacity: 0,
      ease: 'power1.in', stagger: { each: .04, from: 'random' },
      scrollTrigger: { trigger: card, start: 'bottom 70%', end: 'bottom 0%', scrub: .5 }
    })
  })
  // pull quotes drift
  $$('.q blockquote').forEach(q => gsap.fromTo(q, { y: 60 }, { y: -60, ease: 'none', scrollTrigger: { trigger: q, start: 'top bottom', end: 'bottom top', scrub: true } }))
  // staggered photo strips
  $$('.strip figure').forEach((f, i) => gsap.fromTo(f, { y: 40 + (i % 3) * 50 }, { y: -(30 + (i % 3) * 40), ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } }))
  // marquee driven by scroll velocity
  mq.style.animation = 'none'
  let mx = 0, mdir = -1
  gsap.ticker.add(() => {
    const v = lenis ? lenis.velocity : 0
    if (Math.abs(v) > .5) mdir = v > 0 ? -1 : 1
    mx += mdir * (1.1 + Math.abs(v) * .35)
    const half = mq.scrollWidth / 2
    if (mx <= -half) mx += half; if (mx > 0) mx -= half
    mq.style.transform = `translate3d(${mx}px,0,0) skewX(${clamp(v * -.25, -12, 12)}deg)`
  })
}

/* ---------- scroll engine for pinned scenes ---------- */
const prog = $('#prog'), hudCh = $('#hudCh'), hudDate = $('#hudDate'), mcEl = $('#mc'), mcN = $('#mcN')
const reel = $('#reel'), nine = $('#nine'), route = $('#route')
const nineL = $$('.l', nine), flash = $('.flash', nine), legs = $$('.leg', route), caps = $$('.cap', route), pts = $$('.pt[data-leg]', route)
const mcMarks = $$('[data-mc]'); let curCh = -1, curMc = -1, curNine = -1, curCap = -1
const secProg = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)) }
function sizeReel() { reel.style.height = (small() || RM) ? '' : (track.scrollWidth - innerWidth + innerHeight * 1.3) + 'px' }
let mountain = null, globe = null, photosGL = null
function frame() {
  const H = innerHeight, max = document.documentElement.scrollHeight - H
  prog.style.transform = `scaleX(${clamp(scrollY / max)})`
  let ci = 0; chapters.forEach((c, i) => { if (c.getBoundingClientRect().top < H * .5) ci = i })
  if (ci !== curCh) { curCh = ci; const c = chapters[ci]; hudCh.textContent = (ci ? c.dataset.ch + ' — ' : '') + c.dataset.title; hudDate.textContent = c.dataset.date }
  { const p = secProg(nine), n = nineL.length, i = Math.min(n - 1, Math.floor(p * n))
    if (i !== curNine) { if (curNine >= 0) sound.tick(i === n - 1 ? 440 : 620, i === n - 1 ? .5 : .12); curNine = i; nineL.forEach((l, k) => l.classList.toggle('on', k === i)); flash.classList.toggle('on', i === n - 1) }
    mountain?.setProgress(p, i === n - 1) }
  if (!(small() || RM)) { const p = clamp((secProg(reel) - .04) / .9); track.style.transform = `translate3d(${-p * (track.scrollWidth - innerWidth)}px,0,0)` }
  const rr = reel.getBoundingClientRect(); let mc = 0
  if (rr.top < H * .6) mcMarks.forEach(m => { if (rr.bottom < 0 || m.getBoundingClientRect().left < innerWidth * .7) mc = Math.max(mc, +m.dataset.mc + (m.dataset.mc === '2' ? 1 : 0)) })
  mcEl.classList.toggle('on', rr.top < H * .6)
  if (mc !== curMc) { if (curMc >= 0 && mc > curMc) sound.tick(1200, .15); curMc = mc; mcN.textContent = mc; mcN.classList.remove('bump'); void mcN.offsetWidth; mcN.classList.add('bump') }
  { const p = secProg(route) * legs.length * 1.08
    legs.forEach((l, i) => { const k = clamp(p - i); l.style.strokeDashoffset = 1 - k; pts[i].classList.toggle('on', k > .97) })
    const a = Math.min(legs.length - 1, Math.floor(p)); if (a !== curCap) { curCap = a; caps.forEach((c, i) => c.classList.toggle('on', i === a)) }
    globe?.setProgress(p) }
}
let tick = false
addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { frame(); tick = false }) } }, { passive: true })
addEventListener('resize', () => { sizeReel(); frame(); ScrollTrigger.refresh() })
track.addEventListener('scroll', frame, { passive: true })

/* ---------- modules ---------- */
if (FX && !small()) { photosGL = initPhotosGL({ canvas: $('#gl'), lenis, hero: $('.hero') }); photoItems.forEach(p => photosGL.add(p.el, p.img)) }
if (FX) { mountain = initMountain($('#mtn'), nine); if (!small()) globe = initGlobe($('#globe'), route) }
initCursor({ enabled: !TOUCH && !RM })
initWall($('#wallArea'))

/* sound toggle + ui ticks */
const sndBtn = $('#sndBtn')
sndBtn.onclick = () => { const on = sound.toggle(); sndBtn.textContent = on ? 'SOUND ON' : 'SOUND OFF'; sndBtn.setAttribute('aria-pressed', on) }
document.addEventListener('mouseover', e => { const t = e.target.closest?.('button,.fr'); if (t && t !== document._lastHover) { document._lastHover = t; sound.tick(760, .05) } })
document.addEventListener('click', e => { if (e.target.closest?.('button,a')) sound.tick(520, .12) })

/* the room is loaded only when someone asks for it */
let roomApi = null
$$('[data-room]').forEach(b => b.addEventListener('click', async () => {
  toggleNav(false); lock(true); sound.whoosh()
  const el = $('#room'); el.classList.add('open'); el.setAttribute('aria-hidden', 'false')
  if (!roomApi) { const m = await import('./room/room.js'); roomApi = m.initRoom(el, { sound, onClose: () => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); lock(false) } }) }
  roomApi.open()
}))

/* ---------- preloader ---------- */
const pre = $('#pre'), yr = $('#preYr'), pc = $('#prePc')
const start = () => {
  pre.classList.add('done'); setTimeout(() => pre.remove(), 1300); sizeReel(); frame(); ScrollTrigger.refresh()
  $$('.hero [data-split],.hero .rv').forEach(e => e.classList.add('in'))
  if (!RM) gsap.from('.hero h1', { yPercent: 18, scale: 1.08, duration: 2, ease: 'power4.out' })
}
if (RM) start()
else { const o = { k: 0 }; gsap.to(o, { k: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { yr.textContent = 2022 + Math.round(o.k * 4); pc.textContent = String(Math.round(o.k * 100)).padStart(3, '0') }, onComplete: () => setTimeout(start, 200) }) }
document.fonts?.ready.then(() => { sizeReel(); frame(); ScrollTrigger.refresh() })
window.__sa20 = { lenis, get globe() { return globe }, get room() { return roomApi } }
