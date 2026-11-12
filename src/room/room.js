// SA 20, rebuilt from the photos: a walkable model of the room.
// Units are metres. Window wall is at -Z, the door at +Z. Mahesh's side is -X, Avik's is +X.
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'

const W = 3.4, D = 5.2, H = 2.9, zW = -D / 2, zD = D / 2, xL = -W / 2, xR = W / 2
const EYE = 1.55

const HOTSPOTS = [
  { p: [xR - .05, 1.6, .15], k: "Avik's wall", t: 'Seven F1 posters, ordered from Posterized. The SF-24 took the longest to line up: it is six sheets.' },
  { p: [xL + .05, 1.55, -.85], k: "Mahesh's wall", t: 'Every Macky Ar album as a poster, plus the full discography. A gift from Avik. Pasting them straight took an evening.' },
  { p: [.39, .95, zW + .32], k: "Avik's desk", t: 'The wave mat, the Hot Wheels cases, the McLaren diecast from his birthday, and the three-in-one clock, speaker and charger bought with the ideathon voucher.' },
  { p: [-.39, .95, zW + .32], k: "Mahesh's desk", t: 'Album ten, Sever Inertia, was recorded here in 17 days: one audio interface, a borrowed guitar and a borrowed mic.' },
  { p: [0, 2.35, zW + .06], k: 'The lights', t: 'Bought from Amazon and put up together. They react to sound. Switch the room lights off to see them properly.' },
  { p: [xR - .12, 1.08, zW + .6], k: 'The Lando frame', t: 'The signed Lando Norris photo from Avik\'s birthday in May made the trip from Kolkata. It lives on the pinboard.' },
  { p: [0, .05, .4], k: 'The floor', t: '22 September, end of term one. Both mattresses came down here, with pizza, shawarma and a laptop between them. Asleep within minutes.' },
  { p: [.35, 1.2, zD - .05], k: 'The door', t: 'Room SA 20, ground floor, Saraswati hostel. The allocation email arrived two hours before the flight.' },
  { p: [-.39, .8, zW + .75], k: '3 AM', t: 'Maggi, every night of mid-terms and end-terms, eaten roughly here.' }
]

export function initRoom(root, { sound, onClose }) {
  const canvas = root.querySelector('#roomCv')
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0a09)
  const cam = new THREE.PerspectiveCamera(68, 1, .05, 60)
  const loader = new THREE.TextureLoader()
  const tex = (name) => { const t = loader.load(`room/${name}`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }

  /* ---------- canvas textures ---------- */
  const cvTex = (w, h, draw, rep) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]) }
    return t
  }
  const tileT = cvTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a3a19c'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},${Math.random() < .5 ? 255 : 0},.025)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2) }
    g.strokeStyle = '#7d7b77'; g.lineWidth = 3; g.strokeRect(0, 0, w, h)
  }, [W / .6, D / .6])
  const woodT = cvTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d9a970'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(120,70,20,${Math.random() * .12})`; g.lineWidth = Math.random() * 2; const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 6, w * .6, y - 6, w, y + 2); g.stroke() }
  })
  const sheetA = cvTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6f9dc8'; g.fillRect(0, 0, w, h)
    for (let i = 0; i < 9; i++) { const x = (i % 3) * 170 + 60 + (Math.floor(i / 3) % 2) * 50, y = Math.floor(i / 3) * 170 + 70; g.fillStyle = '#eef3f6'; g.beginPath(); g.ellipse(x, y, 44, 34, .3, 0, 7); g.fill(); g.strokeStyle = '#dfe9f1'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + 60 + k * 14, y + 30 + k * 10, 7, 0, 7); g.stroke() } }
  })
  const sheetM = cvTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9a54a'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const cx = x * 90 + (y % 2) * 45 + 20, cy = y * 90 + 30; g.fillStyle = '#c8632a'; for (let p = 0; p < 6; p++) { g.beginPath(); g.ellipse(cx + Math.cos(p * 1.047) * 16, cy + Math.sin(p * 1.047) * 16, 12, 7, p * 1.047, 0, 7); g.fill() } g.fillStyle = '#7a8b3a'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill() }
  })
  const rugT = (cols) => cvTex(128, 256, (g, w, h) => { const n = 9; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(0, i * h / n, w, h / n + 1) } for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 1) } })
  const screenT = (bg, draw) => cvTex(512, 320, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); draw(g, w, h) })

  /* ---------- materials + helpers ---------- */
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...o })
  const mWall = M(0xf1eee7, { roughness: .95 }), mWood = M(0xffffff, { map: woodT, roughness: .65 }), mMetal = M(0xe9e9e6, { roughness: .45, metalness: .3 })
  const mBlue = M(0x2c5d8f, { roughness: .95 }), mBlack = M(0x18181a, { roughness: .6 }), mGrey = M(0xb9bcc0, { roughness: .5, metalness: .2 }), mWhite = M(0xf4f4f2, { roughness: .6 })
  const room = new THREE.Group(); scene.add(room)
  const box = (w, h, d, mat, x, y, z, parent = room, shadow = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m }
  const cyl = (r, h, mat, x, y, z, parent = room, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m }
  const plane = (w, h, mat, x, y, z, ry = 0, rx = 0, parent = room) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; parent.add(m); return m }
  const colliders = []
  const solid = (x1, x2, z1, z2) => colliders.push([Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2)])

  /* ---------- shell ---------- */
  plane(W, D, M(0xffffff, { map: tileT, roughness: .55 }), 0, 0, 0, 0, -Math.PI / 2)
  const top = new THREE.Group(); room.add(top)                       // hidden in overview
  const mCeil = M(0xf4f2ec, { emissive: 0xffffff, emissiveIntensity: .28 }); plane(W, D, mCeil, 0, H, 0, 0, Math.PI / 2, top)
  plane(W, H, mWall, 0, H / 2, zW, 0)
  plane(W, H, mWall, 0, H / 2, zD, Math.PI)
  plane(D, H, mWall, xL, H / 2, 0, Math.PI / 2)
  plane(D, H, mWall, xR, H / 2, 0, -Math.PI / 2)
  const mSkirt = M(0x6f6e6b)
  box(W, .09, .015, mSkirt, 0, .045, zW + .008, room, false); box(W, .09, .015, mSkirt, 0, .045, zD - .008, room, false)
  box(.015, .09, D, mSkirt, xL + .008, .045, 0, room, false); box(.015, .09, D, mSkirt, xR - .008, .045, 0, room, false)
  // the beams that run along both side walls under the ceiling, with a tube light under each
  box(.22, .5, D, mWall, xL + .11, H - .25, 0, top, false); box(.22, .5, D, mWall, xR - .11, H - .25, 0, top, false)
  const mTube = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2 })
  box(.035, .035, 1.25, mTube, xL + .24, H - .53, -.2, top, false); box(.035, .035, 1.25, mTube, xR - .24, H - .53, -.2, top, false)

  /* ---------- window, curtains, rope light ---------- */
  const mSky = new THREE.MeshStandardMaterial({ color: 0x9fc4e6, emissive: 0xbfdcf5, emissiveIntensity: .9 })
  plane(1.7, 1.35, mSky, 0, 1.55, zW + .004)
  for (let i = -3; i <= 3; i++) box(.014, 1.35, .01, mBlack, i * .24, 1.55, zW + .012, room, false)
  for (let j = 0; j < 4; j++) box(1.7, .012, .01, mBlack, 0, 1.0 + j * .37, zW + .012, room, false)
  const mCurtain = new THREE.MeshStandardMaterial({ color: 0x4d87b5, roughness: .95, side: THREE.DoubleSide, emissive: 0x1f6fa8, emissiveIntensity: .12 })
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(.74, 1.75, 40, 1), p = g.attributes.position
    for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getX(k) * 34 + i) * .028 + Math.sin(p.getX(k) * 11) * .012)
    g.computeVertexNormals()
    const m = new THREE.Mesh(g, mCurtain); m.position.set((i - 1) * .7, 1.42, zW + .09); m.castShadow = true; m.receiveShadow = true; room.add(m)
  }
  const rod = cyl(.016, 2.3, M(0xe8dcc0, { roughness: .4 }), 0, 2.28, zW + .1, room, 12); rod.rotation.z = Math.PI / 2
  for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 8, 16), M(0xe8dcc0)); r.position.set(-1.02 + i * .136, 2.28, zW + .1); r.rotation.y = Math.PI / 2; room.add(r) }
  const mRope = new THREE.MeshStandardMaterial({ color: 0xffd9a8, emissive: 0xff9a3c, emissiveIntensity: .7 })
  box(.016, 1.75, .016, mRope, -1.17, 1.72, zW + .012, room, false); box(.016, 1.75, .016, mRope, 1.17, 1.72, zW + .012, room, false); box(2.356, .016, .016, mRope, 0, 2.6, zW + .012, room, false)
  // sockets on the window wall
  box(.16, .08, .012, mWhite, -1.25, .82, zW + .008, room, false); box(.16, .08, .012, mWhite, 1.25, .82, zW + .008, room, false)

  /* ---------- beds ---------- */
  const bed = (side, sheet, pillowCol) => {
    const g = new THREE.Group(); room.add(g)
    const cx = side * (W / 2 - .5), z1 = zW + .06, len = 1.95, cz = z1 + len / 2
    g.position.set(cx, 0, cz)
    box(.9, .34, len - .04, mWood, 0, .27, 0, g)                                   // storage base
    const f = .03                                                                // white metal frame
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(f, .46, f, mMetal, sx * .46, .23, sz * (len / 2 - .015), g)
    for (const sx of [-1, 1]) box(f, f, len, mMetal, sx * .46, .455, 0, g)
    for (const sz of [-1, 1]) { box(.92, f, f, mMetal, 0, .455, sz * (len / 2 - .015), g); box(.92, f, f, mMetal, 0, .06, sz * (len / 2 - .015), g) }
    box(.012, .26, .78, mWood, -side * .456, .27, .45, g); box(.02, .012, .12, mGrey, -side * .468, .27, .45, g)   // drawer + handle
    const mat = box(.92, .15, len, M(0xffffff, { map: sheet, roughness: .95 }), 0, .545, 0, g)
    box(.94, .1, len + .02, M(0xffffff, { map: sheet, roughness: .95 }), 0, .47, 0, g, false)                    // sheet overhang
    box(.9, .42, .025, mWood, 0, .72, -len / 2 + .012, g)                                                        // headboard
    const pil = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), M(pillowCol, { roughness: 1 })); pil.scale.set(.62, .13, .38); pil.position.set(0, .68, -len / 2 + .32); pil.castShadow = true; g.add(pil)
    solid(cx - .5, cx + .5, z1 - .1, z1 + len + .03)
    return g
  }
  const bedM = bed(-1, sheetM, 0xf3f1ec), bedA = bed(1, sheetA, 0xb9c0bd)
  // Mahesh's blanket, never folded
  const blanket = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 14), M(0x8fc0bd, { roughness: 1 })); blanket.scale.set(.8, .14, 1.1); blanket.position.set(.05, .68, .25); blanket.rotation.y = .3; blanket.castShadow = true; bedM.add(blanket)

  /* ---------- desks ---------- */
  const deskZ = zW + .4, deskY = .75
  const desk = (cx, drawerSide) => {
    box(.76, .03, .52, mWood, cx, deskY, deskZ)
    box(.34, .4, .46, mWood, cx + drawerSide * .2, deskY - .215, deskZ)
    for (const k of [0, 1]) { box(.3, .17, .01, mWood, cx + drawerSide * .2, deskY - .12 - k * .19, deskZ + .235, room, false); box(.1, .012, .02, mGrey, cx + drawerSide * .2, deskY - .12 - k * .19, deskZ + .25, room, false) }
    for (const sx of [-1, 1]) { box(.03, deskY, .03, mMetal, cx + sx * .36, deskY / 2, deskZ - .22); box(.03, .03, .5, mMetal, cx + sx * .36, .03, deskZ) }
  }
  desk(-.39, -1); desk(.39, 1)
  solid(-.8, .8, zW, deskZ + .3)

  // Avik's desk
  const top_ = deskY + .016
  const mat14 = plane(.7, .27, M(0xffffff, { map: tex('deskmat.jpg'), roughness: .9 }), .39, top_ + .002, deskZ + .1, 0, -Math.PI / 2)
  const laptop = (x, z, bodyCol, scrTex, ry = 0, lift = 0) => {
    const g = new THREE.Group(); g.position.set(x, top_ + lift, z); g.rotation.y = ry; room.add(g)
    box(.3, .012, .21, M(bodyCol, { metalness: .5, roughness: .4 }), 0, .006, 0, g)
    box(.26, .002, .1, mBlack, 0, .013, -.03, g, false)
    const lid = new THREE.Group(); lid.position.set(0, .012, -.105); lid.rotation.x = -.3; g.add(lid)
    box(.3, .2, .008, M(bodyCol, { metalness: .5, roughness: .4 }), 0, .1, 0, lid)
    const sm = new THREE.MeshStandardMaterial({ map: scrTex, emissive: 0xffffff, emissiveMap: scrTex, emissiveIntensity: .75 })
    plane(.28, .18, sm, 0, .1, .005, 0, 0, lid)
    return sm
  }
  const scrA = laptop(.33, deskZ - .08, 0xb4b6ba, screenT('#15161a', (g, w, h) => { g.fillStyle = '#23262d'; g.fillRect(0, 0, 110, h); const c = ['#6f9dc8', '#d9a54a', '#ff6a13', '#8ec9ff', '#c8632a', '#4d87b5']; for (let i = 0; i < 6; i++) { g.fillStyle = c[i]; g.fillRect(140 + (i % 3) * 118, 50 + Math.floor(i / 3) * 110, 104, 78) } g.fillStyle = '#ece6da'; g.font = '18px monospace'; g.fillText('SA·20', 16, 34) }), 0, .03)
  box(.02, .03, .2, mBlack, .23, top_ + .015, deskZ - .08, room, false); box(.02, .03, .2, mBlack, .43, top_ + .015, deskZ - .08, room, false) // laptop stand
  // three-in-one clock speaker
  const clockT = cvTex(256, 96, (g, w, h) => { g.fillStyle = '#17181b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f2f2'; g.font = 'bold 54px monospace'; g.fillText('3:00', 58, 66) })
  box(.17, .075, .1, M(0x1c1d21), .1, top_ + .038, deskZ - .1)
  plane(.15, .055, new THREE.MeshStandardMaterial({ map: clockT, emissive: 0xffffff, emissiveMap: clockT, emissiveIntensity: .6 }), .1, top_ + .036, deskZ - .049)
  const mClockGlow = new THREE.MeshStandardMaterial({ color: 0xff5a4a, emissive: 0xff2a2a, emissiveIntensity: 1.6 })
  box(.172, .012, .102, mClockGlow, .1, top_ + .078, deskZ - .1, room, false)
  // ring lamp
  cyl(.035, .012, mWhite, .12, top_ + .09, deskZ - .17); const stem = cyl(.006, .24, mWhite, .12, top_ + .2, deskZ - .17); stem.rotation.z = .12
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.045, .012, 10, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1dd, emissiveIntensity: .5 })); ring.position.set(.1, top_ + .33, deskZ - .15); ring.rotation.x = 1.2; room.add(ring)
  // Hot Wheels cases, with the real cars
  const hw = (name, x, w, h) => { const g = box(w, h, .035, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .35, roughness: .2 }), x, top_ + h / 2, deskZ - .2, room, false); plane(w - .006, h - .006, M(0xffffff, { map: tex(name), roughness: .5 }), x, top_ + h / 2, deskZ - .181); return g }
  hw('hw-a.jpg', .54, .15, .155); hw('hw-b.jpg', .69, .14, .18)
  // McLaren diecast in its case
  box(.09, .008, .04, mBlack, .56, top_ + .004, deskZ - .09, room, false); box(.06, .012, .022, M(0xff6a13, { roughness: .4 }), .56, top_ + .016, deskZ - .09, room, false)
  box(.09, .04, .04, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .18, roughness: .1 }), .56, top_ + .024, deskZ - .09, room, false)
  box(.05, .06, .025, M(0xb01825, { roughness: .2, transparent: true, opacity: .85 }), .64, top_ + .03, deskZ - .1, room, false)          // the red bottle
  cyl(.04, .2, M(0x101012, { roughness: .4 }), .05, top_ + .1, deskZ - .2); cyl(.045, .24, new THREE.MeshStandardMaterial({ color: 0xdfe9ee, transparent: true, opacity: .4 }), .73, top_ + .12, deskZ + .02); cyl(.03, .04, M(0x26324d), .73, top_ + .26, deskZ + .02)
  box(.08, .07, .06, M(0x8a5a36), -.0, top_ + .035, deskZ - .19)                                                                       // pen holder
  cyl(.028, .012, mBlack, .5, top_ + .01, deskZ + .14)                                                                                // mouse
  // Mahesh's desk
  const scrM = laptop(-.5, deskZ - .06, 0x222327, screenT('#101114', (g, w, h) => { g.strokeStyle = '#8ec9ff'; g.lineWidth = 2; for (let r = 0; r < 5; r++) { g.beginPath(); for (let x = 20; x < w - 20; x += 4) { const y = 50 + r * 52 + Math.sin(x * .07 + r) * 16 * Math.sin(x * .011 + r * 2); x === 20 ? g.moveTo(x, y) : g.lineTo(x, y) } g.stroke() } }), .12)
  box(.26, .17, .012, M(0x2a2b30), -.2, top_ + .1, deskZ - .14).rotation.x = -.25                                                       // second screen
  plane(.34, .2, M(0xb8306a, { roughness: 1 }), -.42, top_ + .002, deskZ + .12, 0, -Math.PI / 2)                                       // pink mat
  box(.16, .045, .1, M(0xb3202a, { roughness: .35 }), -.68, top_ + .023, deskZ - .12)                                                  // the audio interface
  cyl(.008, .01, mGrey, -.72, top_ + .05, deskZ - .09, room, 8); cyl(.008, .01, mGrey, -.66, top_ + .05, deskZ - .09, room, 8)
  cyl(.035, .22, M(0x7a3340, { roughness: .3, transparent: true, opacity: .7 }), -.1, top_ + .11, deskZ - .18)
  box(.2, .015, .27, M(0xe9e4d6), -.3, top_ + .008, deskZ + .1).rotation.y = .2                                                        // notebook

  /* ---------- chairs ---------- */
  const chair = (x, z, ry, towel) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; room.add(g)
    box(.48, .07, .46, mBlue, 0, .46, 0, g); const b = box(.46, .4, .06, mBlue, 0, .78, .22, g); b.rotation.x = .08
    for (const sx of [-1, 1]) { for (const sz of [-1, 1]) cyl(.014, .44, mBlack, sx * .21, .22, sz * .2, g, 8); cyl(.014, .36, mBlack, sx * .21, .64, .22, g, 8) }
    if (towel) { box(.44, .34, .03, M(towel, { roughness: 1 }), 0, .82, .26, g); box(.44, .03, .1, M(towel, { roughness: 1 }), 0, 1.0, .23, g) }
    solid(x - .27, x + .27, z - .27, z + .27)
  }
  chair(-.38, zW + 1.12, .15, 0xd8497a); chair(.4, zW + 1.08, -.1, 0)

  /* ---------- shelves + pinboards on the side walls ---------- */
  const shelf = (side) => {
    const x = side * (W / 2 - .15), zc = zW + .62, y = 1.55, L = .9, Hh = .42, Dp = .3, t = .018
    box(Dp, t, L, mWood, x, y - Hh / 2, zc); box(Dp, t, L, mWood, x, y + Hh / 2, zc)
    box(Dp, Hh, t, mWood, x, y, zc - L / 2); box(Dp, Hh, t, mWood, x, y, zc + L / 2); box(t, Hh, L, mWood, side * (W / 2 - .01), y, zc)
    const cols = [0x2b4a7a, 0xd9a54a, 0x8a2f2f, 0x2f2f33]
    for (let i = 0; i < 4; i++) box(.16, .2 + (i % 2) * .04, .03, M(cols[i]), x, y - Hh / 2 + .12 + (i % 2) * .02, zc - .32 + i * .04)
    cyl(.04, .09, mBlack, x, y - Hh / 2 + .055, zc + .05); cyl(.03, .14, M(0x3c7a4a, { roughness: .3 }), x, y - Hh / 2 + .08, zc + .2)
    box(.02, .34, .74, M(0x1f3f63, { roughness: 1 }), side * (W / 2 - .012), 1.05, zc)                              // pinboard
  }
  shelf(-1); shelf(1)
  box(.012, .16, .2, M(0xc9a23a, { metalness: .6, roughness: .3 }), xR - .026, 1.08, zW + .6, room, false)          // the Lando frame
  box(.004, .12, .16, M(0xff6a13), xR - .034, 1.08, zW + .6, room, false)

  /* ---------- posters ---------- */
  const poster = (map, w, h, x, y, z, ry) => { const m = plane(w, h, M(0xffffff, { map, roughness: .75 }), x, y, z, ry); m.castShadow = false; return m }
  const F1 = { mcl: [331, 180, 452, 353], rbp: [459, 104, 634, 353], rb20: [638, 177, 1004, 350], sf24: [181, 356, 1035, 598], honda: [238, 603, 595, 772], ferrari: [604, 603, 774, 845], petronas: [785, 604, 907, 776] }
  const s = .00175
  for (const [k, [x1, y1, x2, y2]] of Object.entries(F1)) poster(tex(`f1-${k}.jpg`), (x2 - x1) * s, (y2 - y1) * s, xR - .004, 1.58 - ((y1 + y2) / 2 - 475) * s, .15 + ((x1 + x2) / 2 - 608) * s, -Math.PI / 2)
  const AL = [[378, 82, 438, 166], [447, 108, 507, 193], [515, 131, 575, 216], [584, 159, 643, 244], [652, 186, 711, 271], [378, 181, 438, 268], [447, 206, 507, 294], [515, 229, 575, 316], [584, 258, 643, 346], [652, 284, 711, 372]]
  const t8 = .00247, zOf = px => (zW + 1.07) + (830 - px) * t8, yOf = py => 1.34 + (300 - py) * t8
  AL.forEach(([x1, y1, x2, y2], i) => poster(tex(`album-${i}.jpg`), (x2 - x1) * t8, (y2 - y1) * t8, xL + .004, yOf((y1 + y2) / 2), zOf((x1 + x2) / 2), Math.PI / 2))
  poster(tex('red.jpg'), (373 - 185) * t8, (172 - 80) * t8, xL + .004, yOf(126), zOf(279), Math.PI / 2)

  /* ---------- door wall ---------- */
  const mDoor = M(0xffffff, { map: woodT, color: 0xc79a66, roughness: .5 })
  box(.95, 2.08, .04, mDoor, .35, 1.04, zD - .02); box(1.05, .06, .05, mWhite, .35, 2.11, zD - .02, room, false)
  box(.03, .13, .03, mGrey, .0, 1.05, zD - .05, room, false); box(.12, .02, .02, mGrey, .05, 1.07, zD - .07, room, false)
  cyl(.045, .004, M(0xb8d42a), .35, 1.75, zD - .042).rotation.x = Math.PI / 2                                         // the sticker on the door
  box(.85, .28, .2, mWhite, -.3, 2.46, zD - .1); box(.7, .02, .02, M(0x9a9a9a), -.3, 2.36, zD - .2, room, false)      // AC
  box(.9, 1.85, .5, mGrey, xL + .47, .925, zD - .27); box(.01, 1.7, .005, M(0x8d9094), xL + .47, .95, zD - .522, room, false)  // steel almirah
  plane(.16, 1.1, new THREE.MeshStandardMaterial({ color: 0xdfe6ea, metalness: .9, roughness: .08 }), xL + .25, 1.1, zD - .523, Math.PI)
  box(.6, .22, .4, M(0x7a2a2a, { roughness: .5 }), xL + .5, 1.97, zD - .28)                                            // suitcase on top
  solid(xL, xL + .95, zD - .55, zD)
  box(.55, 2.1, .95, mWhite, xR - .28, 1.05, zD - .75); box(.005, 2.0, .01, M(0xcfcfcf), xR - .557, 1.05, zD - .75, room, false)  // tall white wardrobe
  solid(xR - .58, xR, zD - 1.25, zD - .25)
  box(.24, .28, .2, mWhite, -.15, .14, zD - .16); box(.25, .02, .21, mBlack, -.15, .29, zD - .16, room, false)         // dustbin
  // hamper, bags, rugs, stool, drying rack
  const ham = cyl(.22, .5, new THREE.MeshStandardMaterial({ color: 0x24427a, transparent: true, opacity: .55, roughness: 1, side: THREE.DoubleSide }), xL + .3, .25, zD - .85, room, 14); ham.castShadow = false
  box(.3, .2, .3, M(0x444a55, { roughness: 1 }), xL + .3, .12, zD - .85)
  solid(xL, xL + .55, zD - 1.1, zD - .6)
  const bag = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 12), M(0x1b1c20, { roughness: .9 })); bag.scale.set(.42, .5, .3); bag.position.set(xL + .3, .24, zW + 2.3); bag.castShadow = true; room.add(bag)
  plane(.45, .7, M(0xffffff, { map: rugT(['#1d2a52', '#5d86b8', '#27386a', '#89a8cf']), roughness: 1 }), .42, .006, zW + 2.35, 0, -Math.PI / 2)
  plane(.42, .65, M(0xffffff, { map: rugT(['#b8306a', '#e2c64a', '#3a6e58', '#6a4a8a', '#d98a3a']), roughness: 1 }), -.45, .006, zW + 2.5, 0, -Math.PI / 2)
  const stoolTop = cyl(.16, .025, mWhite, -.52, .42, zW + 1.75, room, 8); for (let i = 0; i < 3; i++) { const l = cyl(.012, .42, M(0xd9b77a), -.52 + Math.cos(i * 2.09) * .1, .21, zW + 1.75 + Math.sin(i * 2.09) * .1, room, 8); l.rotation.set(Math.sin(i * 2.09) * .15, 0, -Math.cos(i * 2.09) * .15) }
  solid(-.7, -.34, zW + 1.57, zW + 1.93)
  const rack = new THREE.Group(); rack.position.set(xR - .45, 0, .95); room.add(rack)
  for (const sx of [-1, 1]) { const a = box(.015, .95, .015, mBlack, sx * .25, .46, 0, rack); a.rotation.z = sx * .28; const b2 = box(.015, .95, .015, mBlack, sx * .25, .46, 0, rack); b2.rotation.z = -sx * .28 }
  for (let i = 0; i < 9; i++) box(.012, .012, .85, mBlack, -.36 + i * .09, .9, 0, rack, false)
  box(.5, .5, .02, M(0xd8497a, { roughness: 1 }), 0, .64, .3, rack)
  solid(xR - .85, xR - .05, .5, 1.4)

  /* ---------- fan ---------- */
  cyl(.012, .28, mWhite, 0, H - .14, -.2, top); cyl(.11, .08, mWhite, 0, H - .3, -.2, top)
  const fan = new THREE.Group(); fan.position.set(0, H - .31, -.2); top.add(fan)
  for (let i = 0; i < 3; i++) { const b = new THREE.Group(); b.rotation.y = i * 2.094; fan.add(b); box(.62, .008, .13, mWhite, .4, 0, 0, b) }

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc9c5bd, 1.25); scene.add(hemi)
  const tubeL = new THREE.PointLight(0xfff6ea, 5, 9, 1.6), tubeR = tubeL.clone(); tubeL.position.set(xL + .45, H - .65, -.2); tubeR.position.set(xR - .45, H - .65, -.2); scene.add(tubeL, tubeR)
  const key = new THREE.PointLight(0xfff3e2, 7, 12, 1.5); key.position.set(0, H - .12, .1); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.002; key.shadow.radius = 6; scene.add(key)
  const rope = new THREE.PointLight(0xff9a3c, 0, 8, 1.4); rope.position.set(0, 2.3, zW + .5); scene.add(rope)
  const desk1 = new THREE.PointLight(0x9fc4ff, 0, 2.2, 2); desk1.position.set(.33, 1.0, deskZ + .1); scene.add(desk1)
  const desk2 = new THREE.PointLight(0xff4a3a, 0, 1.4, 2); desk2.position.set(.1, .95, deskZ); scene.add(desk2)
  let night = false; const L = { k: 0 }
  const applyLight = () => {
    const k = L.k
    hemi.intensity = 1.25 - 1.19 * k; tubeL.intensity = tubeR.intensity = 5 * (1 - k); key.intensity = 7 * (1 - k) + .15 * k
    mTube.emissiveIntensity = 2.2 * (1 - k) + .02; mCeil.emissiveIntensity = .28 * (1 - k); rope.intensity = 4.2 * k; mRope.emissiveIntensity = .7 + 3.2 * k
    mSky.emissive.setHex(0xbfdcf5).lerp(new THREE.Color(0x0e2f5e), k); mSky.color.setHex(0x9fc4e6).lerp(new THREE.Color(0x0a1830), k); mSky.emissiveIntensity = .9 - .45 * k
    mCurtain.emissiveIntensity = .12 + .5 * k; desk1.intensity = .9 * k; desk2.intensity = .5 * k
    scrA.emissiveIntensity = scrM.emissiveIntensity = .75 + .6 * k; renderer.toneMappingExposure = 1 + .25 * k
  }
  applyLight()

  /* ---------- controls ---------- */
  let mode = 'walk', yaw = 0, pitch = -.06, open = false, raf = 0
  const pos = new THREE.Vector3(.25, EYE, zD - .9), goal = null
  let walkTo = null
  const orbit = new OrbitControls(cam, canvas); orbit.enabled = false; orbit.enableDamping = true; orbit.target.set(0, .9, 0); orbit.minDistance = 3; orbit.maxDistance = 12; orbit.maxPolarAngle = 1.45; orbit.enablePan = false
  const keys = {}
  const kd = e => { if (!open) return; keys[e.code] = true; if (e.code === 'Escape') api.close(); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault() }
  addEventListener('keydown', kd); addEventListener('keyup', e => keys[e.code] = false)
  let drag = null
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }; canvas.setPointerCapture(e.pointerId) })
  canvas.addEventListener('pointermove', e => {
    if (!drag || mode !== 'walk') return
    yaw -= (e.clientX - drag.x) * .0042; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - drag.y) * .0042, -1.2, 1.2)
    drag.x = e.clientX; drag.y = e.clientY
  })
  const ray = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  canvas.addEventListener('pointerup', e => {
    if (!drag) return
    const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy); drag = null
    if (moved > 6 || mode !== 'walk') return
    const r = canvas.getBoundingClientRect()
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam)
    const hit = new THREE.Vector3(); if (ray.ray.intersectPlane(floorPlane, hit) && Math.abs(hit.x) < W / 2 && Math.abs(hit.z) < D / 2) { walkTo = hit; sound?.tick(500, .1) }
  })
  const blocked = (x, z) => {
    const r = .2
    if (x < xL + .28 || x > xR - .28 || z < zW + .3 || z > zD - .3) return true
    return colliders.some(([x1, x2, z1, z2]) => x > x1 - r && x < x2 + r && z > z1 - r && z < z2 + r)
  }
  const move = (dx, dz) => { if (!blocked(pos.x + dx, pos.z)) pos.x += dx; if (!blocked(pos.x, pos.z + dz)) pos.z += dz }

  /* ---------- markers ---------- */
  const tagsEl = root.querySelector('#roomTags'), info = root.querySelector('#roomInfo'), infoK = root.querySelector('#roomInfoK'), infoT = root.querySelector('#roomInfoT')
  const tags = HOTSPOTS.map((h, i) => {
    const b = document.createElement('button'); b.className = 'rtag'; b.innerHTML = `<i></i><span class="mono">${h.k}</span>`; tagsEl.append(b)
    const v = new THREE.Vector3(...h.p)
    b.onclick = () => {
      infoK.textContent = h.k; infoT.textContent = h.t; info.classList.add('on'); sound?.tick(880, .12)
      if (mode === 'walk') { const d = v.clone().sub(pos); const ty = Math.atan2(-d.x, -d.z), tp = Math.atan2(d.y, Math.hypot(d.x, d.z)); let dy = ty - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); const o = { y: yaw, p: pitch }; gsap.to(o, { y: yaw + dy, p: THREE.MathUtils.clamp(tp, -1, 1), duration: 1, ease: 'power3.out', onUpdate: () => { yaw = o.y; pitch = o.p } }) }
    }
    return { b, v }
  })
  info.onclick = () => info.classList.remove('on')

  /* ---------- loop ---------- */
  const clock = new THREE.Clock(), tmp = new THREE.Vector3()
  const resize = () => { const w = root.clientWidth, h = root.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.fov = w < h ? 82 : 68; cam.updateProjectionMatrix() }
  addEventListener('resize', () => open && resize())
  function loop() {
    raf = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime
    fan.rotation.y -= dt * 7
    if (night) { const hue = .07 + .03 * Math.sin(t * .8); mRope.emissive.setHSL(hue, 1, .55); rope.color.setHSL(hue, 1, .6) }
    if (mode === 'walk') {
      const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), sd = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0)
      if (keys.ArrowLeft) yaw += dt * 1.8; if (keys.ArrowRight) yaw -= dt * 1.8
      if (f || sd) { walkTo = null; const sp = 1.9 * dt; move((-Math.sin(yaw) * f + Math.cos(yaw) * sd) * sp, (-Math.cos(yaw) * f - Math.sin(yaw) * sd) * sp) }
      if (walkTo) { tmp.set(walkTo.x - pos.x, 0, walkTo.z - pos.z); const d = tmp.length(); if (d < .08) walkTo = null; else { tmp.multiplyScalar(Math.min(1.9 * dt, d) / d); const bx = pos.x, bz = pos.z; move(tmp.x, tmp.z); if (Math.hypot(pos.x - bx, pos.z - bz) < 1e-4) walkTo = null } }
      const moving = f || sd || walkTo
      cam.position.set(pos.x, EYE + (moving ? Math.sin(t * 9) * .012 : 0), pos.z)
      cam.rotation.set(pitch, yaw, 0, 'YXZ')
    } else orbit.update()
    for (const { b, v } of tags) {
      tmp.copy(v).project(cam)
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05
      b.style.display = vis ? '' : 'none'
      if (vis) b.style.transform = `translate(${(tmp.x * .5 + .5) * root.clientWidth}px,${(-tmp.y * .5 + .5) * root.clientHeight}px)`
    }
    renderer.render(scene, cam)
  }

  const modeBtn = root.querySelector('#roomMode'), lightBtn = root.querySelector('#roomLight'), hint = root.querySelector('#roomHint')
  function setMode(m) {
    mode = m; walkTo = null
    modeBtn.textContent = m === 'walk' ? 'OVERVIEW' : 'WALK INSIDE'
    hint.textContent = m === 'walk' ? (matchMedia('(pointer:coarse)').matches ? 'Drag to look · tap the floor to walk · tap a marker' : 'Drag to look · W A S D or click the floor to walk · click a marker') : 'Drag to orbit · scroll to zoom'
    if (m === 'overview') {
      top.visible = false; cam.rotation.order = 'XYZ'
      gsap.fromTo(cam.position, { x: cam.position.x, y: cam.position.y, z: cam.position.z }, { x: 3.3, y: 4.9, z: 5.0, duration: 1.6, ease: 'power3.inOut', onUpdate: () => cam.lookAt(0, 1, 0), onComplete: () => { orbit.enabled = true } })
    } else { orbit.enabled = false; top.visible = true; pos.set(.25, EYE, zD - .9); yaw = 0; pitch = -.06 }
  }
  modeBtn.onclick = () => setMode(mode === 'walk' ? 'overview' : 'walk')
  lightBtn.onclick = () => { night = !night; lightBtn.textContent = night ? 'LIGHTS ON' : 'LIGHTS OFF'; sound?.tick(night ? 300 : 700, .2); gsap.to(L, { k: night ? 1 : 0, duration: 1.4, ease: 'power2.inOut', onUpdate: applyLight }) }
  root.querySelector('#roomClose').onclick = () => api.close()
  if (matchMedia('(pointer:coarse)').matches) hint.textContent = 'Drag to look · tap the floor to walk · tap a marker'

  const api = {
    open() {
      open = true; resize(); root.querySelector('#roomLoad').classList.add('off'); info.classList.remove('on')
      if (mode !== 'walk') setMode('walk')
      // walk in through the door
      pos.set(.35, EYE, zD - .35); yaw = 0; pitch = .0
      gsap.to(pos, { z: zD - 1.1, x: .15, duration: 2.2, ease: 'power2.out' })
      cancelAnimationFrame(raf); clock.getDelta(); loop()
    },
    close() { open = false; cancelAnimationFrame(raf); onClose?.() },
    _debug: { setMode, cam, pos, toggleNight: () => lightBtn.onclick(), look: (y, p) => { yaw = y; pitch = p } }
  }
  return api
}
