// The played month: every project is a playing card, dealt from the deck onto a growing tree, one
// branch each. Before 16 October the cards come slowly; after it, they pour out.
import { REPOS, TOPICS, VIDEOS } from './data.js'
import { FLOW, WISPR_DAY } from './flow.js'
import { byDay, dateText, dayIndex, fmt, split } from './model.js'

export const GLYPH = { ai: '✦', data: '▤', backend: '⇄', sec: '◈', ops: '↻', found: '▲', tools: '✎', skills: '❖' }
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
const order = days.flatMap((d) => d.repos)

const show = $('#show')
const stage = $('#s-stage')
const svg = $('#s-tree')
const cap = $('#s-cap')
const toast = $('#s-toast')
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

// The crown: three arcs over the trunk, filled from the inside out in the order the projects landed.
function slots(w, h, card) {
  const rows = [9, 11, 12]
  const base = { x: w / 2, y: h - 18 }
  const top = { x: w / 2, y: h * 0.68 }
  const rx = w * 0.42
  const ry = h * 0.52
  const out = []
  rows.forEach((n, r) => {
    const k = 0.55 + r * 0.22
    for (let i = 0; i < n; i++) {
      const a = (-78 + (156 * i) / (n - 1)) * (Math.PI / 180)
      out.push({
        x: top.x + Math.sin(a) * rx * k,
        y: top.y - Math.cos(a) * ry * k - card.h * 0.1,
        rot: a * 20,
      })
    }
  })
  return { base, top, slots: out }
}

function layout() {
  const w = stage.clientWidth
  const h = stage.clientHeight
  const small = w < 700
  const card = small ? { w: 46, h: 64 } : { w: Math.min(86, w / 15), h: Math.min(120, (w / 15) * 1.4) }
  stage.style.setProperty('--cw', `${card.w}px`)
  stage.style.setProperty('--ch', `${card.h}px`)
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  return { w, h, card, ...slots(w, h, card) }
}

const cardHTML = (r) => {
  const t = TOPICS[r.k]
  return `<div class="pc-in"><div class="pc-back"></div><div class="pc-front" style="--c:${t.color}">
    <span class="pc-corner">${initials(r.n)}</span><span class="pc-glyph">${GLYPH[r.k]}</span>
    <span class="pc-name">${esc(r.n.replace(/-demo$/, ''))}</span><span class="pc-date">${dateText(r.c)}</span></div></div>`
}

export async function playMonth() {
  const id = ++run
  paused = false
  $('#s-pause').textContent = 'Pause'
  show.hidden = false
  show.classList.remove('talk', 'done')
  $('#s-mode').textContent = 'Typing'
  document.body.style.overflow = 'hidden'
  stage.querySelectorAll('.pc, .finale').forEach((e) => e.remove())
  cap.textContent = ''
  toast.textContent = ''
  await new Promise(requestAnimationFrame)
  const L = layout()
  svg.innerHTML = `<path class="trunk" d="M${L.base.x} ${L.h} L${L.top.x} ${L.top.y}" />`
  let count = 0
  $('#s-count').textContent = '0'

  const deal = async (r, idx, fast) => {
    const s = L.slots[idx]
    const el = document.createElement('div')
    el.className = 'pc'
    el.innerHTML = cardHTML(r)
    el.style.transform = `translate(${L.base.x}px, ${L.h + 40}px) translate(-50%, -50%) rotate(0deg) scale(.6)`
    el.style.transitionDuration = fast ? '.55s' : '.9s'
    stage.append(el)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const mx = (L.top.x + s.x) / 2
    path.setAttribute('d', `M${L.top.x} ${L.top.y} Q${mx} ${L.top.y - 10} ${s.x} ${s.y + L.card.h * 0.4}`)
    path.setAttribute('class', `branch ${fast ? 'after' : ''}`)
    svg.append(path)
    const len = path.getTotalLength()
    path.style.strokeDasharray = `${len}`
    path.style.strokeDashoffset = `${len}`
    await new Promise(requestAnimationFrame)
    path.style.strokeDashoffset = '0'
    el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%) rotate(${s.rot}deg) scale(1)`
    el.classList.add('flip')
    count++
    $('#s-count').textContent = count
    $('#s-date').textContent = dateText(r.c)
  }

  try {
    await say('October is Hacktober.', 900)
    await say('I was already shipping, typing every prompt.', 600)
    let idx = 0
    for (let i = 0; i < pivot; i++) for (const r of days[i].repos) {
      await deal(r, idx++, false)
      await wait(900)
    }
    await wait(500)
    show.classList.add('talk')
    $('#s-mode').textContent = 'Talking · Wispr Flow'
    $('#s-date').textContent = dateText(WISPR_DAY)
    await say(`${dateText(WISPR_DAY)}. *Wispr *Flow comes in.`, 1300)
    await say('Now I just *talk.', 200)
    for (let i = pivot; i < days.length; i++) {
      for (const r of days[i].repos) {
        await deal(r, idx++, true)
        await wait(260)
      }
      for (const v of VIDEOS.filter((x) => x.c === days[i].date)) {
        toast.innerHTML = `<span>▶ New video</span> ${esc(v.t)}`
        toast.classList.remove('pop')
        void toast.offsetWidth
        toast.classList.add('pop')
        await wait(1100)
      }
    }
    toast.textContent = ''
    show.classList.add('done')
    await say(`!${times} faster, by voice.`, 300)
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
