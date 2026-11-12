// The 9 PM scene: a mountain ridge made of points under a starfield.
// When both offers land, the ridge lights up in the two voice colours.
import * as THREE from 'three'
import gsap from 'gsap'

const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
const vnoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  return (hash(xi, yi) * (1 - u) + hash(xi + 1, yi) * u) * (1 - v) + (hash(xi, yi + 1) * (1 - u) + hash(xi + 1, yi + 1) * u) * v
}
const fbm = (x, y) => { let a = .5, f = 1, s = 0; for (let i = 0; i < 5; i++) { s += a * vnoise(x * f, y * f); a *= .5; f *= 2.03 } return s }

export function initMountain(canvas, section) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(50, 1, .1, 200)
  const small = innerWidth < 900
  const NX = small ? 150 : 260, NZ = small ? 90 : 150
  const pos = new Float32Array(NX * NZ * 3), rnd = new Float32Array(NX * NZ)
  let k = 0
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = (i / (NX - 1) - .5) * 60, z = -(j / (NZ - 1)) * 44 - 4
    const ridge = Math.exp(-Math.pow((z + 26) / 11, 2))                       // one main range across the frame
    const peak = Math.exp(-Math.pow((x - 3) / 13, 2)) * 5.5                    // and one summit
    let y = Math.pow(fbm(x * .11 + 3, z * .11), 1.6) * 15 * (.25 + ridge) + peak * ridge - 4
    y -= Math.abs(1 - 2 * vnoise(x * .5, z * .5)) * .5
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; rnd[k] = hash(i, j); k++
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uLit: { value: 0 }, uProg: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */`
      attribute float aR;uniform float uTime,uLit,uPx,uProg;varying float vH,vR,vX,vFog;
      void main(){vec3 p=position;
        p.y+=sin(uTime*.6+p.x*.35+p.z*.2)*.06;
        p.y+=uLit*sin(uTime*2.+aR*40.)*.35*aR;                // the ridge shivers when it lights
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        vH=p.y;vR=aR;vX=p.x;vFog=smoothstep(60.,8.,-mv.z);
        gl_PointSize=(1.1+aR*1.6+uLit*1.4)*uPx*(18./-mv.z);}`,
    fragmentShader: /* glsl */`
      precision highp float;uniform float uLit,uTime;varying float vH,vR,vX,vFog;
      void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
        vec3 base=mix(vec3(.16,.2,.28),vec3(.82,.86,.95),smoothstep(-2.,11.,vH));   // moonlit: snow line on top
        vec3 A=vec3(1.,.42,.07),M=vec3(.56,.79,1.);
        vec3 lit=mix(A,M,smoothstep(-6.,10.,vX+sin(uTime*.4)*4.));
        vec3 col=mix(base,lit*1.5,uLit*(.35+.65*vR));
        float a=(.5+.5*sin(uTime*1.5+vR*50.))*.35+.5;
        gl_FragColor=vec4(col,a*vFog*smoothstep(.5,.1,d));}`
  })
  scene.add(new THREE.Points(g, mat))

  // stars
  const SN = small ? 500 : 1100, sp = new Float32Array(SN * 3), sr = new Float32Array(SN)
  for (let i = 0; i < SN; i++) { sp[i * 3] = (Math.random() - .5) * 220; sp[i * 3 + 1] = Math.random() * 70 + 4; sp[i * 3 + 2] = -70 - Math.random() * 60; sr[i] = Math.random() }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('aR', new THREE.BufferAttribute(sr, 1))
  const smat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float aR;uniform float uTime,uPx;varying float vA;void main(){vA=.35+.65*abs(sin(uTime*(.4+aR)+aR*30.));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=(.8+aR*1.8)*uPx;}`,
    fragmentShader: `precision highp float;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vec3(.93,.9,.85),vA*smoothstep(.5,0.,d));}`
  })
  scene.add(new THREE.Points(sg, smat))

  let visible = false, prog = 0, lit = false
  const resize = () => { const r = canvas.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix() }
  resize(); addEventListener('resize', resize)
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) resize() }).observe(section)
  const clock = new THREE.Clock(), look = new THREE.Vector3()
  const m = { x: 0, y: 0 }; addEventListener('pointermove', e => { m.x = e.clientX / innerWidth - .5; m.y = e.clientY / innerHeight - .5 }, { passive: true })
  gsap.ticker.add(() => {
    if (!visible) return
    const t = clock.getElapsedTime(); mat.uniforms.uTime.value = t; smat.uniforms.uTime.value = t
    // a slow crane shot: start low in the valley, rise to the summit
    const p = prog
    cam.position.x += ((-9 + p * 12 + m.x * 2) - cam.position.x) * .06
    cam.position.y += ((1.2 + p * 7 - m.y) - cam.position.y) * .06
    cam.position.z += ((10 - p * 9) - cam.position.z) * .06
    look.set(3, 3 + p * 4, -26); cam.lookAt(look)
    renderer.render(scene, cam)
  })
  return {
    setProgress(p, isLit) {
      prog = p
      if (isLit !== lit) { lit = isLit; gsap.to(mat.uniforms.uLit, { value: lit ? 1 : 0, duration: lit ? 1.6 : .8, ease: 'power2.out' }) }
    }
  }
}
