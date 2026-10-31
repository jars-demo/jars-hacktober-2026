// The played month, as a rail: a marker travels along the days of October, every project lights up
// as a stop above the day it shipped and every video below it. Before 16 October the marker
// walks; from it, the rail turns green and the marker runs. At the end the camera pulls back to
// show the whole month.
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

// Build the rail: one column per day, a tick and a date under each.
function build() {
  const w = stage.clientWidth
  const dayW = w < 700 ? 92 : 132
  const railW = DAYS * dayW
  stage.style.setProperty('--dw', `${dayW}px`)
  stage.innerHTML = `<div class="rail" id="s-rail" style="width:${railW}px">
    <div class="track"></div><div class="fill" id="s-fill"></div>
    <div class="pivot" style="left:${pivot * dayW}px"><span>${dateText(WISPR_DAY)} · Wispr Flow</span></div>
    ${days
      .map(
        (d, i) => `<div class="day ${i >= pivot ? 'after' : ''}" style="left:${i * dayW}px">
        <div class="stops"></div><i class="tick"></i><small>${dateText(d.date)}</small><div class="vids"></div></div>`,
      )
      .join('')}
    <div class="marker" id="s-marker"><b></b></div></div>`
  return { w, dayW, railW, rail: $('#s-rail'), fill: $('#s-fill'), marker: $('#s-marker'), cols: [...stage.querySelectorAll('.day')] }
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
  await new Promise(requestAnimationFrame)
  const R = build()
  let count = 0
  $('#s-count').textContent = '0'

  // Move the marker (and the camera with it) to a day.
  const go = (i, ms) => {
    const x = i * R.dayW + R.dayW / 2
    for (const e of [R.marker, R.fill, R.rail]) e.style.transitionDuration = `${ms}ms`
    R.marker.style.transform = `translateX(${x}px)`
    R.fill.style.width = `${x}px`
    R.rail.style.transform = `translateX(${R.w / 2 - x}px)`
    $('#s-date').textContent = dateText(days[i].date)
  }
  const stop = (i, r) => {
    const t = TOPICS[r.k]
    const e = document.createElement('div')
    e.className = 'stop'
    e.style.setProperty('--c', t.color)
    e.innerHTML = `<span>${initials(r.n)}</span>${esc(r.n.replace(/-demo$/, ''))}`
    R.cols[i].querySelector('.stops').append(e)
    count++
    $('#s-count').textContent = count
  }

  try {
    go(0, 0)
    await say('October is Hacktober.', 900)
    await say('I was already shipping, typing every prompt.', 500)
    for (let i = 0; i < pivot; i++) {
      go(i, 700)
      await wait(700)
      for (const r of days[i].repos) {
        stop(i, r)
        await wait(650)
      }
    }
    go(pivot, 900)
    await wait(900)
    show.classList.add('talk')
    $('#s-mode').textContent = 'Talking · Wispr Flow'
    await say(`${dateText(WISPR_DAY)}. *Wispr *Flow comes in.`, 1200)
    await say('Now I just *talk.', 200)
    for (let i = pivot; i < DAYS; i++) {
      go(i, 260)
      await wait(260)
      for (const r of days[i].repos) {
        stop(i, r)
        await wait(170)
      }
      for (const v of VIDEOS.filter((x) => x.c === days[i].date)) {
        const e = document.createElement('div')
        e.className = 'vstop'
        e.innerHTML = `▶ ${esc(v.t.length > 34 ? v.t.slice(0, 32) + '…' : v.t)}`
        R.cols[i].querySelector('.vids').append(e)
        await wait(650)
      }
    }

    // Pull back to the whole month.
    show.classList.add('done')
    const k = Math.min(1, (R.w - 40) / R.railW)
    R.rail.style.transitionDuration = '1400ms'
    R.rail.style.transform = `translateX(${(R.w - R.railW * k) / 2}px) scale(${k})`
    await say(`!${times} faster, by voice.`, 600)
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
