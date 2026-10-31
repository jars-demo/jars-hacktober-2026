// The played month, as date cards: every day that shipped something becomes a card with the date
// on top, which slides in and lands on a tilted stack, like the Wispr Flow usage cards. Before
// 16 October the cards come slowly; from it, they come fast and in the green and dark styles. A
// thin timeline along the bottom keeps the place, and at the end the cards lay out in a row.
import { REPOS, TOPICS, VIDEOS } from './data.js'
import { FLOW, WISPR_DAY } from './flow.js'
import { DAYS, byDay, dateText, dayIndex, fmt, split } from './model.js'

export const initials = (n) =>
  n
    .replace(/-demo$/, '')
    .split('-')
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

const $ = (s) => document.querySelector(s)
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const days = byDay(REPOS)
const pivot = dayIndex(WISPR_DAY)
const sp = split(REPOS, VIDEOS, WISPR_DAY)
const times = `${Math.round(sp.times)}×`
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// The days worth a card: any day with a project or a video.
const cardDays = days
  .map((d, i) => ({ ...d, i, videos: VIDEOS.filter((v) => v.c === d.date) }))
  .filter((d) => d.repos.length || d.videos.length)

const show = $('#show')
const stage = $('#s-stage')
const cap = $('#s-cap')
let run = 0
let paused = false

const wait = (ms) =>
  new Promise((resolve, reject) => {
    const id = run
    let left = ms
    let last = performance.now()
    const tick = (now) => {
      if (id !== run) return reject(new Error('stopped'))
      if (!paused) left -= now - last
      last = now
      left <= 0 ? resolve() : requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

// *word* is shown in green, !word! in the accent colour. Words arrive one after another.
const say = async (text, hold = 1200) => {
  const words = text.split(' ')
  cap.innerHTML = words
    .map((w, i) => {
      const cls = w.startsWith('*') ? 'w g' : w.startsWith('!') ? 'w a' : 'w'
      return `<span class="${cls}" style="animation-delay:${i * 80}ms">${esc(w.replace(/[*!]/g, ''))}</span>`
    })
    .join(' ')
  await wait(words.length * 80 + hold)
}

// Card styles, in turn: plain before 16 October; green, dark and mint from it.
const AFTER = ['green', 'dark', 'mint']
const cardHTML = (d, n) => {
  const style = d.i < pivot ? 'plain' : AFTER[n % AFTER.length]
  const wd = WEEKDAY[new Date(d.date + 'T00:00:00Z').getUTCDay()]
  const rows = d.repos
    .map((r) => `<li><span class="b" style="--c:${TOPICS[r.k].color}">${initials(r.n)}</span>${esc(r.n)}</li>`)
    .join('')
  const vids = d.videos.map((v) => `<li class="v"><span class="b">▶</span>${esc(v.t)}</li>`).join('')
  const total = d.repos.length
  return `<div class="dc ${style}"><header><b>${dateText(d.date)}</b><span>${wd} · ${
    d.i < pivot ? 'typed' : 'spoken'
  }</span></header><ul>${rows}${vids}</ul><footer>${
    total ? `${total} project${total > 1 ? 's' : ''}` : ''
  }${total && d.videos.length ? ' · ' : ''}${d.videos.length ? `${d.videos.length} video${d.videos.length > 1 ? 's' : ''}` : ''}</footer></div>`
}

export async function playMonth() {
  const id = ++run
  paused = false
  $('#s-pause').textContent = 'Pause'
  show.hidden = false
  show.classList.remove('talk', 'done')
  $('#s-mode').textContent = 'Typing'
  document.body.style.overflow = 'hidden'
  cap.textContent = ''
  stage.innerHTML = `<div class="deck" id="s-deck"></div>
    <div class="line" aria-hidden="true"><div class="track"><i id="s-fill"></i><b style="left:${(pivot / DAYS) * 100}%"></b></div>
    <div class="ends"><span>30 Sep</span><span class="pv" style="left:${(pivot / DAYS) * 100}%">${dateText(WISPR_DAY)} · Wispr Flow</span><span>31 Oct</span></div></div>`
  const deck = $('#s-deck')
  const fill = $('#s-fill')
  let count = 0
  $('#s-count').textContent = '0'

  // Re-seat the stack: the newest card on top, older ones fanned back and fading.
  const seat = () => {
    const cards = [...deck.children].reverse()
    cards.forEach((c, k) => {
      c.style.setProperty('--k', k)
      c.classList.toggle('gone', k > 4)
    })
  }
  const land = async (d, n, fast) => {
    const el = document.createElement('div')
    el.className = 'slot enter'
    el.innerHTML = cardHTML(d, n)
    el.style.transitionDuration = fast ? '.55s' : '.9s'
    deck.append(el)
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    el.classList.remove('enter')
    seat()
    count += d.repos.length
    $('#s-count').textContent = count
    $('#s-date').textContent = dateText(d.date)
    fill.style.width = `${((d.i + 1) / DAYS) * 100}%`
  }

  try {
    await say('October is Hacktober.', 900)
    await say('I was already shipping, typing every prompt.', 400)
    let n = 0
    for (const d of cardDays.filter((x) => x.i < pivot)) {
      await land(d, n++, false)
      await wait(1500)
    }
    show.classList.add('talk')
    $('#s-mode').textContent = 'Talking · Wispr Flow'
    $('#s-date').textContent = dateText(WISPR_DAY)
    await say(`${dateText(WISPR_DAY)}. *Wispr *Flow comes in.`, 1100)
    await say('Now I just *talk.', 200)
    n = 0
    for (const d of cardDays.filter((x) => x.i >= pivot)) {
      await land(d, n++, true)
      await wait(950)
    }
    fill.style.width = '100%'

    // Lay every card out in a row, oldest first.
    show.classList.add('done')
    const slots = [...deck.children]
    const w = stage.clientWidth
    const cw = slots[0].offsetWidth
    const k = Math.min(0.42, (w - 80) / (cw * ((slots.length - 1) * 0.62 + 1)))
    const step = cw * k * 0.62
    const x0 = -((slots.length - 1) * step) / 2
    slots.forEach((s, i) => {
      s.classList.remove('gone')
      s.style.transitionDuration = '1s'
      s.style.transitionDelay = `${i * 40}ms`
      s.style.transform = `translate(${x0 + i * step}px, -40px) scale(${k}) rotate(${(i % 2 ? 1 : -1) * 2}deg)`
      s.style.zIndex = String(i)
    })
    await say(`!${times} faster, by voice.`, 700)
    const f = document.createElement('div')
    f.className = 'finale'
    f.innerHTML = [
      [`${sp.before.projects} → ${sp.after.projects}`, 'projects'],
      [`${sp.before.videos} → ${sp.after.videos}`, 'videos'],
      [fmt(FLOW.words), 'words dictated'],
    ]
      .map(([v, l], i) => `<div style="--d:${i * 0.15}s"><b>${v}</b><span>${l}</span></div>`)
      .join('')
    stage.append(f)
    await wait(3600)
    await say('That was my October, *shipped *by *voice.', 1500)
    $('#s-pause').textContent = 'Replay'
  } catch {
    // Closed or replayed mid-way.
  }
}

function closeShow() {
  run++
  show.hidden = true
  document.body.style.overflow = ''
}

$('#s-close').addEventListener('click', closeShow)
$('#s-pause').addEventListener('click', (e) => {
  if (e.target.textContent === 'Replay') return playMonth()
  paused = !paused
  show.classList.toggle('paused', paused)
  e.target.textContent = paused ? 'Play' : 'Pause'
})
addEventListener('keydown', (e) => {
  if (show.hidden) return
  if (e.key === 'Escape') closeShow()
  if (e.key === ' ') {
    e.preventDefault()
    $('#s-pause').click()
  }
})
