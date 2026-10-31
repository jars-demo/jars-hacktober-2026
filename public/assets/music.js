// Background music: one soft track, quiet, looping. Off until the visitor turns it on or plays the
// month (browsers only allow sound after a tap), and the choice is remembered.

const audio = new Audio('assets/audio/bg.mp3')
audio.loop = true
audio.preload = 'none'
audio.volume = 0
const VOLUME = 0.28
let fade = 0
const listeners = []

export const isOn = () => !audio.paused
export const onChange = (fn) => listeners.push(fn)
const changed = () => listeners.forEach((fn) => fn(isOn()))

const ramp = (to, done) => {
  cancelAnimationFrame(fade)
  const from = audio.volume
  const t0 = performance.now()
  const step = (now) => {
    // The first frame's timestamp can be a little earlier than t0, so clamp both ends.
    const k = Math.max(0, Math.min(1, (now - t0) / 1200))
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * k))
    if (k < 1) fade = requestAnimationFrame(step)
    else if (done) done()
  }
  fade = requestAnimationFrame(step)
}

export async function play() {
  try {
    await audio.play()
    ramp(VOLUME)
    localStorage.setItem('music', 'on')
  } catch {
    // Blocked or failed to load: stay silent.
  }
  changed()
}

export function stop() {
  localStorage.setItem('music', 'off')
  ramp(0, () => {
    audio.pause()
    changed()
  })
  changed()
}

export const toggle = () => (isOn() ? stop() : play())

// Playing the month starts the music, unless the visitor has turned it off before.
export const playUnlessMuted = () => {
  if (localStorage.getItem('music') !== 'off' && !isOn()) play()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isOn()) audio.pause()
  else if (!document.hidden && localStorage.getItem('music') === 'on' && audio.paused && audio.currentTime > 0) audio.play().catch(() => {})
})
