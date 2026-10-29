// Every sound is synthesised with the Web Audio API: no audio files to download or license.
// Browsers only allow sound after a click or key press, so nothing plays until wake() is called
// from one.

let ctx = null
let master = null
let wet = null
let pad = null
let on = true

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12)
const ready = () => ctx !== null && on

// A short burst of fading noise makes a soft, hall-like reverb.
function impulse(seconds) {
  const length = Math.round(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
  }
  return buffer
}

export function wake() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return false
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = on ? 0.6 : 0
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    master.connect(limiter).connect(ctx.destination)
    const reverb = ctx.createConvolver()
    reverb.buffer = impulse(2.8)
    wet = ctx.createGain()
    wet.gain.value = 0.4
    wet.connect(reverb).connect(master)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return true
}

export function setOn(value) {
  on = value
  if (!ctx) return
  master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.05)
  if (!on) stopPad()
}

// A bell: a sine with two quieter overtones and a long fade.
function bell(midi, delay, level, length) {
  const t = ctx.currentTime + delay
  const out = ctx.createGain()
  out.gain.setValueAtTime(0.0001, t)
  out.gain.exponentialRampToValueAtTime(level, t + 0.012)
  out.gain.exponentialRampToValueAtTime(0.0001, t + length)
  out.connect(master)
  out.connect(wet)
  for (const [ratio, amount] of [
    [1, 1],
    [2.01, 0.35],
    [3.02, 0.12],
  ]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = hz(midi) * ratio
    gain.gain.value = amount
    osc.connect(gain).connect(out)
    osc.start(t)
    osc.stop(t + length + 0.05)
  }
}

// New stars: one bell each, rolled like a harp when several arrive on the same night.
export function births(notes) {
  if (!ready()) return
  notes.forEach((note, i) => bell(note, i * 0.075, 0.16 / Math.sqrt(1 + i * 0.2), 2.6))
}

// Opening a star: its own note, an octave up.
export function chime(note) {
  if (ready()) bell(note + 12, 0, 0.12, 1.6)
}

// A quiet night: a soft tick so the month keeps time.
export function tick() {
  if (!ready()) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = 880
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.025, t + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
  osc.connect(gain).connect(master)
  osc.start(t)
  osc.stop(t + 0.1)
}

export function fanfare() {
  if (ready()) [69, 72, 76, 81].forEach((note, i) => bell(note, i * 0.09, 0.12, 2))
}

export function finale() {
  if (ready()) [45, 52, 57, 60, 64, 69, 76].forEach((note, i) => bell(note, i * 0.13, 0.1, 4.5))
}

// A constellation is complete: a quick sparkle, high and quiet.
export function complete() {
  if (ready()) [81, 84, 88, 93].forEach((note, i) => bell(note, i * 0.07, 0.07, 1.8))
}

// A rising swell of filtered noise, for the curtain going up.
export function whoosh() {
  if (!ready()) return
  const t = ctx.currentTime
  const length = 1.6
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * length), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.8
  filter.frequency.setValueAtTime(250, t)
  filter.frequency.exponentialRampToValueAtTime(2200, t + length * 0.7)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.06, t + length * 0.5)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  source.connect(filter).connect(gain)
  gain.connect(master)
  gain.connect(wet)
  source.start(t)
  source.stop(t + length)
}

// The drone moves through Am, F, C and G, one chord a week.
const CHORDS = [
  [45, 52, 57, 60],
  [41, 48, 53, 57],
  [48, 55, 60, 64],
  [43, 50, 55, 59],
]
export function padChord(index) {
  if (!pad) return
  const chord = CHORDS[index % CHORDS.length]
  const t = ctx.currentTime
  pad.oscs.forEach((osc, i) => osc.frequency.setTargetAtTime(hz(chord[i >> 1]), t, 0.5))
}

// A low, slow drone under the month while it plays.
export function startPad() {
  if (!ready() || pad) return
  const t = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.045, t + 1.5)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 700
  filter.connect(gain)
  gain.connect(master)
  gain.connect(wet)
  const oscs = [45, 52, 57, 64].flatMap((note) =>
    [-5, 5].map((detune) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = hz(note)
      osc.detune.value = detune
      osc.connect(filter)
      osc.start(t)
      return osc
    }),
  )
  pad = { gain, oscs }
}

export function stopPad() {
  if (!pad) return
  const t = ctx.currentTime
  const { gain, oscs } = pad
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
  oscs.forEach((osc) => osc.stop(t + 1.3))
  pad = null
}
