// Background music: one soft track, quiet, looping. On by default, unless the visitor turned it off
// before. Browsers only allow sound after the visitor interacts with the page, so if starting right
// away is blocked, it starts on the first tap, click or key press anywhere.

const audio = new Audio('assets/audio/bg.mp3')
audio.loop = true
audio.preload = 'auto'
audio.volume = 0
const VOLUME = 0.28
const GESTURES = ['pointerdown', 'keydown', 'touchstart']
let fade = 0
let wanted = localStorage.getItem('music') !== 'off'
const listeners = []

// The toggle shows what the visitor wants, which is playing as soon as the browser allows it.
export const isOn = () => wanted
export const onChange = (fn) => listeners.push(fn)
const changed = () => listeners.forEach((fn) => fn(wanted))

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

const start = async () => {
  if (!wanted || !audio.paused) return true
  try {
    await audio.play()
    ramp(VOLUME)
    return true
  } catch {
    return false
  }
}

// Wait for the first interaction; a tap on the music toggle itself is left to the toggle.
const onGesture = (e) => {
  if (e.target.closest && e.target.closest('#music')) return
  disarm()
  start()
}
const arm = () => GESTURES.forEach((g) => addEventListener(g, onGesture, { capture: true }))
const disarm = () => GESTURES.forEach((g) => removeEventListener(g, onGesture, { capture: true }))

export async function play() {
  wanted = true
  localStorage.setItem('music', 'on')
  changed()
  disarm()
  if (!(await start())) arm()
}

export function stop() {
  wanted = false
  localStorage.setItem('music', 'off')
  disarm()
  changed()
  ramp(0, () => audio.pause())
}

export const toggle = () => (wanted ? stop() : play())

// Playing the month is an interaction too: make sure the music is going, unless it was turned off.
export const playUnlessMuted = () => {
  if (wanted) start()
}

// On by default: try now, and if the browser says no, start on the first interaction.
if (wanted) start().then((ok) => ok || arm())

document.addEventListener('visibilitychange', () => {
  if (document.hidden) audio.pause()
  else if (wanted && audio.currentTime > 0) start()
})
