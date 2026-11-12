// All sound is synthesised in the browser: a low room tone, soft ticks and a whoosh between chapters.
let ctx = null, master = null, on = false
function boot() {
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination)
  // ambience: two detuned low voices through a slowly breathing filter, plus a bed of filtered noise
  const amb = ctx.createGain(); amb.gain.value = .5; amb.connect(master)
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = .7; lp.connect(amb)
  for (const [f, d] of [[55, -6], [82.4, 5], [110, 3], [164.8, -4]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; const g = ctx.createGain(); g.gain.value = .05; o.connect(g); g.connect(lp); o.start() }
  const lfo = ctx.createOscillator(); lfo.frequency.value = .07; const lg = ctx.createGain(); lg.gain.value = 140; lfo.connect(lg); lg.connect(lp.frequency); lfo.start()
  const nb = noiseBuf(4), ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true
  const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 500; nf.Q.value = .4; const ng = ctx.createGain(); ng.gain.value = .015
  ns.connect(nf); nf.connect(ng); ng.connect(amb); ns.start()
}
function noiseBuf(sec) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b }
export const sound = {
  toggle() {
    if (!ctx) boot()
    on = !on; ctx.resume()
    master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(on ? .5 : 0, ctx.currentTime + (on ? 1.2 : .3))
    return on
  },
  tick(freq = 700, vol = .08) {
    if (!on) return
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .6, t + .12)
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16)
    o.connect(g); g.connect(master); o.start(t); o.stop(t + .18)
  },
  whoosh() {
    if (!on) return
    const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf(1)
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(2400, t + .45); f.frequency.exponentialRampToValueAtTime(300, t + .9)
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.22, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + .9)
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 1)
  }
}
