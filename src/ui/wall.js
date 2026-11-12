// The photo wall: every picture as a loose print you can drag and throw.
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WALL } from '../data.js'
gsap.registerPlugin(Draggable, InertiaPlugin)

export function initWall(area) {
  const rnd = (i, k) => { const s = Math.sin(i * 91.7 + k * 13.3) * 43758.5; return s - Math.floor(s) }
  let z = 10
  const cards = WALL.map(([f, cap], i) => {
    const c = document.createElement('figure'); c.className = 'wcard'
    c.innerHTML = `<img src="photos/${f}.jpg" alt="${cap}" draggable="false"><figcaption class="mono">${String(i + 1).padStart(2, '0')} · ${cap}</figcaption>`
    area.append(c); return c
  })
  const place = () => {
    const W = area.clientWidth, H = area.clientHeight, cols = W < 700 ? 3 : 6, rows = Math.ceil(cards.length / cols)
    cards.forEach((c, i) => {
      const cw = c.offsetWidth, ch = c.offsetHeight || cw * 1.2
      const x = ((i % cols) + .5) / cols * W - cw / 2 + (rnd(i, 1) - .5) * W / cols * .7
      const y = (Math.floor(i / cols) + .5) / rows * H - ch / 2 + (rnd(i, 2) - .5) * H / rows * .5
      c._home = { x: Math.max(0, Math.min(W - cw, x)), y: Math.max(0, Math.min(H - ch, y)), r: (rnd(i, 3) - .5) * 22 }
    })
  }
  const settle = () => cards.forEach(c => gsap.set(c, { x: c._home.x, y: c._home.y, rotation: c._home.r }))
  const imgs = cards.map(c => c.querySelector('img'))
  Promise.all(imgs.map(im => im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r }))).then(() => {
    place()
    cards.forEach(c => gsap.set(c, { x: area.clientWidth / 2 - c.offsetWidth / 2, y: area.clientHeight / 2 - c.offsetHeight / 2, rotation: 0, scale: .6, opacity: 0 }))
    ScrollTrigger.create({ trigger: area, start: 'top 65%', once: true, onEnter: () => cards.forEach((c, i) => gsap.to(c, { x: c._home.x, y: c._home.y, rotation: c._home.r, scale: 1, opacity: 1, duration: 1.4, ease: 'expo.out', delay: i * .045 })) })
    Draggable.create(cards, {
      bounds: area, inertia: true, edgeResistance: .7, throwResistance: 1800,
      onPress() { gsap.set(this.target, { zIndex: ++z }); gsap.to(this.target, { scale: 1.06, rotation: 0, duration: .3 }) },
      onRelease() { gsap.to(this.target, { scale: 1, rotation: (Math.random() - .5) * 16, duration: .6, ease: 'power3.out' }) }
    })
    ScrollTrigger.refresh()
  })
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { place(); if (cards[0] && +gsap.getProperty(cards[0], 'opacity') === 1) settle() }, 200) })
}
