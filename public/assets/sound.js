// Sound: short recorded audio files (made with ElevenLabs), decoded once and played as buffers.
// Nothing is synthesised in the browser, so phones play it as smoothly as desktops. Off until the
// visitor turns it on, because browsers only allow audio after a tap.

const FILES = ['bed', 'whoosh', 'pop', 'tick', 'reveal', 'finale']
const VOLUME = { bed: 0.55, whoosh: 0.5, pop: 0.45, tick: 0.35, reveal: 0.7, finale: 0.8 }

let ctx = null
let master = null
let bed = null
let bedGain = null
const buffers = {}
let loading = null
export let enabled = localStorage.getItem('sound') === 'on'

const load = () =>
  (loading ||= Promise.all(
    FILES.map(async (f) => {
      const res = await fetch(`assets/audio/${f}.mp3`)
      buffers[f] = await ctx.decodeAudioData(await res.arrayBuffer())
    }),
  ).catch(() => {}))

// Call from a tap or click: creates and resumes the audio context the first time.
export async function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') await ctx.resume()
  await load()
}

export async function setEnabled(on) {
  enabled = on
  localStorage.setItem('sound', on ? 'on' : 'off')
  if (on) await unlock()
  if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05)
}

export function play(name, { volume = 1, rate = 1 } = {}) {
  if (!enabled || !ctx || !buffers[name]) return
  const src = ctx.createBufferSource()
  const g = ctx.createGain()
  src.buffer = buffers[name]
  src.playbackRate.value = rate
  g.gain.value = VOLUME[name] * volume
  src.connect(g).connect(master)
  src.start()
}

// The music bed loops without a gap (a buffer loop, not an <audio loop>) and fades in and out.
export function startBed() {
  if (!enabled || !ctx || !buffers.bed || bed) return
  bed = ctx.createBufferSource()
  bed.buffer = buffers.bed
  bed.loop = true
  bedGain = ctx.createGain()
  bedGain.gain.value = 0
  bedGain.gain.setTargetAtTime(VOLUME.bed, ctx.currentTime, 0.6)
  bed.connect(bedGain).connect(master)
  bed.start()
}

export function stopBed() {
  if (!bed) return
  const b = bed
  bedGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
  setTimeout(() => b.stop(), 1600)
  bed = null
}

// Pause everything while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (!ctx) return
  if (document.hidden) ctx.suspend()
  else if (enabled) ctx.resume()
})
