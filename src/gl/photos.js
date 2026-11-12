// Every photo on the page is drawn on one fixed WebGL canvas, positioned over its DOM slot.
// The shader handles the liquid reveal, the bend with scroll speed and the hover ripple.
import * as THREE from 'three'
import gsap from 'gsap'

const NOISE = /* glsl */`
vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}`

const VERT = /* glsl */`
uniform float uVel;uniform vec2 uSize;
varying vec2 vUv;
void main(){
  vUv=uv;vec3 p=position;
  p.y+=sin(uv.x*3.14159)*uVel*46.0/uSize.y;       // bend with scroll speed
  p.x+=sin(uv.y*3.14159)*uVel*-10.0/uSize.x;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`

const FRAG = /* glsl */`
precision highp float;
uniform sampler2D uTex;uniform vec2 uSize,uImg,uMouse;uniform float uProg,uHover,uVel,uTime;
varying vec2 vUv;
${NOISE}
vec2 cover(vec2 uv){
  float rs=uSize.x/uSize.y,ri=uImg.x/uImg.y;
  vec2 s=rs<ri?vec2(rs/ri,1.0):vec2(1.0,ri/rs);
  vec2 o=(1.0-s)*vec2(0.5,0.7);                  // keep faces: bias the crop upward
  return uv*s+o;
}
void main(){
  vec2 uv=vUv;
  float n=snoise(uv*3.0+uTime*0.05)*0.5+0.5;
  float inv=1.0-uProg;
  uv=(uv-0.5)*(1.0-0.16*inv)+0.5;                // settle from a slight zoom
  uv+=(vec2(n,snoise(uv*4.0+7.0)*0.5+0.5)-0.5)*0.32*inv*inv;
  vec2 d=uv-uMouse;float dist=length(d*vec2(uSize.x/uSize.y,1.0));
  uv+=normalize(d+1e-5)*sin(dist*34.0-uTime*5.0)*0.006*uHover*smoothstep(0.45,0.0,dist);
  uv=(uv-0.5)*(1.0-0.03*uHover)+0.5;
  vec2 c=cover(uv);float sh=uVel*0.012+inv*0.02;
  vec3 col=vec3(texture2D(uTex,c+vec2(0.0,sh)).r,texture2D(uTex,c).g,texture2D(uTex,c-vec2(0.0,sh)).b);
  float edge=uProg*1.5-0.25;float v=(1.0-vUv.y)*0.55+n*0.45;
  float mask=1.0-smoothstep(edge-0.08,edge+0.08,v);
  col+=vec3(1.0,0.42,0.07)*smoothstep(0.12,0.0,abs(v-edge))*inv*0.9; // ember on the reveal edge
  gl_FragColor=vec4(col,mask);
}`

const HERO_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uA,uB;uniform vec2 uSize,uImgA,uImgB,uMouse;uniform float uMix,uTime,uAlpha;
varying vec2 vUv;
${NOISE}
vec2 cover(vec2 uv,vec2 img){float rs=uSize.x/uSize.y,ri=img.x/img.y;vec2 s=rs<ri?vec2(rs/ri,1.0):vec2(1.0,ri/rs);return uv*s+(1.0-s)*0.5;}
void main(){
  vec2 uv=vUv+(uMouse-0.5)*0.02;
  float n=snoise(uv*2.2+uTime*0.04);
  float m=smoothstep(0.0,1.0,clamp(uMix*1.6-0.3+n*0.3,0.0,1.0));
  vec2 da=uv+vec2(n*0.12,0.06)*m,db=uv-vec2(n*0.12,0.06)*(1.0-m);
  vec3 a=texture2D(uA,cover((da-0.5)*0.94+0.5,uImgA)).rgb,b=texture2D(uB,cover((db-0.5)*0.94+0.5,uImgB)).rgb;
  vec3 col=mix(a,b,m);
  float g=dot(col,vec3(0.299,0.587,0.114));
  col=mix(vec3(g),col,0.35)*vec3(1.05,0.96,0.86);  // desaturate towards warm monochrome
  float vig=smoothstep(1.1,0.2,length((vUv-vec2(0.62,0.42))*vec2(1.0,1.25)));
  col*=0.5*vig;col*=smoothstep(0.0,0.45,vUv.y);    // fade into the page at the bottom
  gl_FragColor=vec4(col,uAlpha);
}`

export function initPhotosGL({ canvas, lenis, hero }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene()
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100)
  const geo = new THREE.PlaneGeometry(1, 1, 24, 24)
  const items = []
  let W = 0, H = 0, vel = 0
  const mouse = { x: 0, y: 0 }
  const resize = () => {
    W = innerWidth; H = innerHeight; renderer.setSize(W, H, false)
    cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2; cam.updateProjectionMatrix()
  }
  resize(); addEventListener('resize', resize)
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY }, { passive: true })

  const tex = img => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t }

  /* hero montage: photos melt into one another behind the title */
  const heroImgs = []
  const heroMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: HERO_FRAG, transparent: true,
    uniforms: { uA: { value: null }, uB: { value: null }, uSize: { value: new THREE.Vector2(1, 1) }, uImgA: { value: new THREE.Vector2(1, 1) }, uImgB: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(.5, .5) }, uMix: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 0 } }
  })
  const heroMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), heroMat); heroMesh.position.z = -1; heroMesh.visible = false; scene.add(heroMesh)
  const HERO_ORDER = ['13-room', '01-heritage', '02-rafting', '14-birthday', '09-kolkata', '15-onam', '12-openmic', '03-airbnb']
  let heroI = 0, heroBusy = false
  const heroNext = () => {
    if (heroImgs.length < 2 || heroBusy || !heroMesh.visible) return
    heroBusy = true
    const nx = heroImgs[(heroI + 1) % heroImgs.length]
    heroMat.uniforms.uB.value = nx.t; heroMat.uniforms.uImgB.value.set(nx.w, nx.h)
    gsap.to(heroMat.uniforms.uMix, { value: 1, duration: 2.6, ease: 'power2.inOut', onComplete: () => {
      heroI = (heroI + 1) % heroImgs.length
      heroMat.uniforms.uA.value = nx.t; heroMat.uniforms.uImgA.value.set(nx.w, nx.h); heroMat.uniforms.uMix.value = 0; heroBusy = false
    } })
  }
  setInterval(heroNext, 4600)
  const addHero = (src, img) => {
    const k = HERO_ORDER.findIndex(n => src.includes(n)); if (k < 0) return
    heroImgs.push({ k, t: tex(img), w: img.naturalWidth, h: img.naturalHeight }); heroImgs.sort((a, b) => a.k - b.k)
    if (!heroMat.uniforms.uA.value || heroImgs[0].k === k) { const f = heroImgs[0]; heroMat.uniforms.uA.value = f.t; heroMat.uniforms.uImgA.value.set(f.w, f.h); heroI = 0 }
    if (!heroMesh.visible) { heroMesh.visible = true; gsap.to(heroMat.uniforms.uAlpha, { value: 1, duration: 2.4, delay: 1.2, ease: 'power2.out' }) }
  }

  function add(el, img) {
    addHero(el.dataset.src || '', img)
    if (el.closest('.fr')) return
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true,
      uniforms: { uTex: { value: tex(img) }, uSize: { value: new THREE.Vector2(1, 1) }, uImg: { value: new THREE.Vector2(img.naturalWidth, img.naturalHeight) }, uMouse: { value: new THREE.Vector2(.5, .5) }, uProg: { value: 0 }, uHover: { value: 0 }, uVel: { value: 0 }, uTime: { value: 0 } }
    })
    const mesh = new THREE.Mesh(geo, mat); scene.add(mesh)
    const it = { el, mesh, mat, shown: false, hover: false }
    el.classList.add('gl'); el.dataset.cur = 'View'
    el.addEventListener('pointerenter', () => { it.hover = true; gsap.to(mat.uniforms.uHover, { value: 1, duration: .6, ease: 'power2.out' }) })
    el.addEventListener('pointerleave', () => { it.hover = false; gsap.to(mat.uniforms.uHover, { value: 0, duration: 1.1, ease: 'power2.out' }) })
    items.push(it)
  }

  const clock = new THREE.Clock()
  gsap.ticker.add(() => {
    const t = clock.getElapsedTime()
    const target = lenis ? THREE.MathUtils.clamp(lenis.velocity * 0.012, -1, 1) : 0
    vel += (target - vel) * 0.12
    // hero
    if (heroMesh.visible) {
      const r = hero.getBoundingClientRect()
      if (r.bottom > 0) {
        heroMesh.scale.set(r.width, r.height, 1); heroMesh.position.set(r.left + r.width / 2 - W / 2, -(r.top + r.height / 2) + H / 2, -1)
        heroMat.uniforms.uSize.value.set(r.width, r.height); heroMat.uniforms.uTime.value = t
        heroMat.uniforms.uMouse.value.lerp(new THREE.Vector2(mouse.x / W, 1 - mouse.y / H), .05)
        heroMesh.material.visible = true
      } else heroMesh.material.visible = false
    }
    for (const it of items) {
      const r = it.el.getBoundingClientRect()
      if (r.bottom < -80 || r.top > H + 80 || r.width === 0) { it.mesh.visible = false; continue }
      it.mesh.visible = true
      it.mesh.scale.set(r.width, r.height, 1)
      it.mesh.position.set(r.left + r.width / 2 - W / 2, -(r.top + r.height / 2) + H / 2, 0)
      const u = it.mat.uniforms
      u.uSize.value.set(r.width, r.height); u.uVel.value = vel; u.uTime.value = t
      if (it.hover) u.uMouse.value.lerp(new THREE.Vector2((mouse.x - r.left) / r.width, 1 - (mouse.y - r.top) / r.height), .15)
      if (!it.shown && r.top < H * 0.86) { it.shown = true; gsap.to(u.uProg, { value: 1, duration: 2.1, ease: 'power3.out' }) }
    }
    renderer.render(scene, cam)
  })
  return { add }
}
