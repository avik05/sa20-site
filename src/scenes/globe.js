// The route, on a globe of dots. Scroll draws each leg and flies the camera to it.
import * as THREE from 'three'
import gsap from 'gsap'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import land from 'world-atlas/land-50m.json'

const ll = (lat, lon, r = 1) => { const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180; return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th)) }
const CITY = { kol: [22.57, 88.36, 'Kolkata', 'Home'], bm: [27.0, 88.4, 'Bara Mangwa', '7,000 ft'], mum: [19.08, 72.88, 'Mumbai', 'NMIMS'], che: [12.75, 80.2, 'Chennai · Great Lakes', 'SA 20'], hos: [12.74, 77.83, 'Hosur', 'TVS Motor'] }
const LEGS = [['kol', 'bm', 0xece6da, .02, [25, 88.4, 1.55]], ['kol', 'mum', 0x8ec9ff, .09, [21.5, 80.5, 1.95]], ['kol', 'che', 0xece6da, .08, [18, 84.5, 1.9]], ['che', 'hos', 0xff6a13, .012, [13.2, 79, 1.36]]]

export function initGlobe(el, section) {
  const canvas = el.querySelector('canvas'), labelsEl = el.querySelector('.glabels')
  el.classList.add('on')
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, .01, 20)

  // land mask → dots
  const MW = 1440, MH = 720, mc = document.createElement('canvas'); mc.width = MW; mc.height = MH
  const g = mc.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH)
  const proj = geoEquirectangular().scale(MW / (2 * Math.PI)).translate([MW / 2, MH / 2])
  g.fillStyle = '#fff'; g.beginPath(); geoPath(proj, g)(feature(land, land.objects.land)); g.fill()
  const px = g.getImageData(0, 0, MW, MH).data
  const isLand = (lat, lon) => px[(Math.min(MH - 1, Math.floor((90 - lat) / 180 * MH)) * MW + Math.min(MW - 1, Math.floor((lon + 180) / 360 * MW))) * 4] > 127
  const pts = [], near = []
  for (let lat = -58; lat <= 82; lat += .55) { const step = .55 / Math.max(.2, Math.cos(lat * Math.PI / 180)); for (let lon = -180; lon < 180; lon += step) if (isLand(lat, lon)) { const v = ll(lat, lon); pts.push(v.x, v.y, v.z); near.push(lat > 4 && lat < 38 && lon > 66 && lon < 98 ? 1 : 0) } }
  // finer dots over the subcontinent, where the camera gets close
  for (let lat = 6; lat <= 36; lat += .22) for (let lon = 67; lon <= 97; lon += .22 / Math.cos(lat * Math.PI / 180)) if (isLand(lat, lon)) { const v = ll(lat, lon); pts.push(v.x, v.y, v.z); near.push(2) }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); dg.setAttribute('aN', new THREE.Float32BufferAttribute(near, 1))
  const dmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uPx: { value: renderer.getPixelRatio() }, uZoom: { value: 0 } },
    vertexShader: `attribute float aN;uniform float uPx,uZoom;varying float vA;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
      float fine=step(1.5,aN);vA=mix(.5+.3*aN,uZoom*.75,fine)*smoothstep(-.05,.35,dot(normalize(position),normalize(cameraPosition)));
      gl_PointSize=uPx*mix(1.6,1.1,fine)*clamp(1.6/-mv.z,.6,3.2);}`,
    fragmentShader: `precision highp float;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vec3(.93,.9,.85),vA*smoothstep(.5,.2,d));}`
  })
  const world = new THREE.Group(); scene.add(world)
  world.add(new THREE.Points(dg, dmat))
  world.add(new THREE.Mesh(new THREE.SphereGeometry(.995, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0d0c0b })))
  world.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `precision highp float;varying vec3 vN;void main(){float f=pow(.72-dot(vN,vec3(0.,0.,1.)),3.);gl_FragColor=vec4(mix(vec3(1.,.42,.07),vec3(.56,.79,1.),.6)*f,f*.9);}`
  })))

  // legs
  const legs = LEGS.map(([a, b, col, alt, view]) => {
    const A = ll(CITY[a][0], CITY[a][1]), B = ll(CITY[b][0], CITY[b][1]), n = 80, arr = []
    for (let i = 0; i <= n; i++) { const t = i / n; arr.push(A.clone().lerp(B, t).normalize().multiplyScalar(1.002 + Math.sin(Math.PI * t) * alt)) }
    const curve = new THREE.CatmullRomCurve3(arr)
    const geo = new THREE.TubeGeometry(curve, 120, alt < .02 ? .0007 : .0013, 6, false)
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col })); geo.setDrawRange(0, 0); world.add(mesh)
    const head = new THREE.Mesh(new THREE.SphereGeometry(alt < .02 ? .0025 : .004, 12, 12), new THREE.MeshBasicMaterial({ color: col })); head.visible = false; world.add(head)
    return { curve, geo, head, total: geo.index.count, view, b }
  })
  // cities
  const cities = Object.entries(CITY).map(([k, [lat, lon, name, sub]]) => {
    const v = ll(lat, lon, 1.003)
    const dot = new THREE.Mesh(new THREE.SphereGeometry(k === 'kol' ? .0042 : .003, 12, 12), new THREE.MeshBasicMaterial({ color: k === 'hos' ? 0xff6a13 : k === 'mum' ? 0x8ec9ff : 0xece6da })); dot.position.copy(v); world.add(dot)
    const lab = document.createElement('div'); lab.className = 'glab'; lab.innerHTML = `<i></i><span class="mono">${name}</span><span class="mono s">${sub}</span>`; labelsEl.append(lab)
    return { k, v, dot, lab, on: k === 'kol' }
  })

  let visible = false, prog = 0
  const view = { lat: 10, lon: 60, dist: 3.4 }, cur = { lat: 10, lon: 60, dist: 3.4 }
  const resize = () => { const r = el.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix() }
  resize(); addEventListener('resize', resize)
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) resize() }, { rootMargin: '20% 0px' }).observe(section)
  const tmp = new THREE.Vector3()
  gsap.ticker.add(() => {
    if (!visible) return
    const active = Math.min(legs.length - 1, Math.floor(prog)), started = prog > .02
    const target = started ? legs[active].view : [14, 62, 3.4]
    view.lat = target[0]; view.lon = target[1]; view.dist = target[2]
    cur.lat += (view.lat - cur.lat) * .045; cur.lon += (view.lon - cur.lon) * .045; cur.dist += (view.dist - cur.dist) * .045
    cam.position.copy(ll(cur.lat - 4, cur.lon, cur.dist)); cam.lookAt(ll(cur.lat, cur.lon, 1).multiplyScalar(cur.dist > 2.4 ? 0 : .92))
    dmat.uniforms.uZoom.value = THREE.MathUtils.smoothstep(2.6 - cur.dist, 0, 1)
    legs.forEach((l, i) => {
      const k = THREE.MathUtils.clamp(prog - i, 0, 1)
      l.geo.setDrawRange(0, Math.floor(k * 120) * 36)
      l.head.visible = k > 0 && k < 1; if (l.head.visible) l.head.position.copy(l.curve.getPoint(k))
      const c = cities.find(c => c.k === l.b); c.on = k > .97
    })
    const w = canvas.clientWidth, h = canvas.clientHeight
    cities.forEach(c => {
      tmp.copy(c.v).project(cam)
      const facing = c.v.clone().normalize().dot(cam.position.clone().normalize()) > .2
      c.dot.visible = c.on
      c.lab.classList.toggle('on', c.on && facing && cur.dist < 2.6)
      c.lab.style.transform = `translate(${(tmp.x * .5 + .5) * w}px,${(-tmp.y * .5 + .5) * h}px)`
    })
    renderer.render(scene, cam)
  })
  return { setProgress(p) { prog = p } }
}
