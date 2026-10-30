import { REPOS } from './data.js'
import {
  CONSTELLATIONS,
  DAYS,
  PACE,
  SKILLS,
  achievementList,
  chart,
  clock,
  dateText,
  earnedIds,
  runtime,
} from './model.js'
import * as sound from './audio.js'

const { stars, groups, perDay, peak, newestDay } = chart(REPOS)
const ACHIEVEMENTS = achievementList(groups, stars.length)
const TOPICS = Object.keys(CONSTELLATIONS).filter((k) => groups[k])
const TOTAL = runtime(perDay)
const NS = 'http://www.w3.org/2000/svg'
const MEDAL =
  '<svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true"><path fill="currentColor" d="M11 1.5l2.6 6.9 6.9 2.6-6.9 2.6L11 20.5l-2.6-6.9L1.5 11l6.9-2.6z"/></svg>'
const $ = (id) => document.getElementById(id)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// Styles are set through the CSSOM, never as style attributes, so the content security policy
// can stay strict.
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag)
  for (const key in attrs) node.setAttribute(key, attrs[key])
  if (parent) parent.appendChild(node)
  return node
}
function restart(node, cls) {
  node.classList.remove(cls)
  void node.getBoundingClientRect()
  node.classList.add(cls)
}

// Progress lives in this browser only, and the page works without it.
const KEY = 'jars-october-2026'
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}
const saved = load()
const progress = { charted: new Set(saved.charted || []), month: Boolean(saved.month), peak: Boolean(saved.peak) }
let soundOn = saved.sound !== false
const unlocked = new Set(earnedIds(progress, groups))
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...progress, charted: [...progress.charted], sound: soundOn }))
  } catch {
    // Private windows and blocked storage: progress lasts until the tab closes.
  }
}
sound.setOn(soundOn)

// Headline numbers, from the data rather than typed in.
const peakDay = perDay.indexOf(peak)
$('kpiProjects').textContent = stars.length
$('kpiTopics').textContent = TOPICS.length
$('kpiPeak').textContent = peak
$('kpiPeakDay').textContent = `on ${dateText(peakDay)}`
$('watchDur').textContent = clock(TOTAL)
$('playDur').textContent = clock(TOTAL)

// Graticule, labelled like hours of right ascension.
const grat = $('graticule')
for (let x = 0; x <= 100; x += 12.5) el('line', { x1: x, y1: 0, x2: x, y2: 58, class: 'grat' }, grat)
for (let y = 0; y <= 58; y += 14.5) el('line', { x1: 0, y1: y, x2: 100, y2: y, class: 'grat' }, grat)
for (let i = 0; i < 8; i++) {
  const t = el('text', { x: i * 12.5 + 0.6, y: 2.1, class: 'grat-label' }, grat)
  t.textContent = `${String(i * 3).padStart(2, '0')}h`
}

// Constellation labels: a colour key, the topic and how many projects it holds.
const conLabels = {}
for (const k of TOPICS) {
  const c = CONSTELLATIONS[k]
  const g = el('g', {}, $('labels'))
  const label = el('text', { x: c.x, y: c.y + 11.6, 'text-anchor': 'middle', class: 'con-label' }, g)
  el('tspan', { fill: c.color }, label).textContent = '● '
  el('tspan', {}, label).textContent = c.label
  const n = groups[k].length
  const count = el('text', { x: c.x, y: c.y + 13.5, 'text-anchor': 'middle', class: 'con-count' }, g)
  count.textContent = k === 'skills' ? `1 repository · ${SKILLS} skills` : `${n} ${n === 1 ? 'project' : 'projects'}`
  conLabels[k] = g
}

// The skills cluster: one point per skill, like the Pleiades. Seeded, so it is the same every visit.
let seed = 7
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const skillDots = []
for (let i = 0; i < SKILLS; i++) {
  const angle = rand() * Math.PI * 2
  const dist = 1.2 + Math.sqrt(rand()) * 6.2
  const dot = el(
    'circle',
    {
      cx: CONSTELLATIONS.skills.x + Math.cos(angle) * dist * 1.25,
      cy: CONSTELLATIONS.skills.y + Math.sin(angle) * dist * 0.8,
      r: 0.12 + rand() * 0.16,
      class: rand() < 0.3 ? 'skill twinkle' : 'skill',
    },
    $('cluster'),
  )
  dot.style.animationDelay = `${(rand() * 3).toFixed(2)}s`
  skillDots.push(dot)
}

// Lines join each constellation's stars in the order they were born, in the topic's colour.
for (const s of stars) {
  if (!s.prev) continue
  s.line = el(
    'line',
    { x1: s.prev.x, y1: s.prev.y, x2: s.x, y2: s.y, class: 'con-line', stroke: s.con.color },
    $('lines'),
  )
  s.line.style.setProperty('--len', Math.hypot(s.x - s.prev.x, s.y - s.prev.y).toFixed(2))
}

// Stars: each one a focusable button.
for (const s of stars) {
  const label = `${s.n}, ${s.con.label}, created ${dateText(s.day)}`
  const g = el('g', { class: 'star', tabindex: '0', role: 'button', 'aria-label': label }, $('stars'))
  const size = s.k === 'skills' ? 1.4 : 1
  el('circle', { cx: s.x, cy: s.y, r: 2.6 * size, class: 'halo' }, g)
  el('circle', { cx: s.x, cy: s.y, r: 1.25 * size, class: 'ring' }, g)
  el('circle', { cx: s.x, cy: s.y, r: 0.42 * size, class: 'core' }, g)
  el('circle', { cx: s.x, cy: s.y, r: 2.4, class: 'hit' }, g)
  if (s.day === newestDay) g.classList.add('newest')
  g.addEventListener('click', () => open(s, true))
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      open(s, true)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      step(s, 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      step(s, -1)
    }
  })
  s.g = g
}

// Table rows, oldest first.
for (const s of stars) {
  const tr = document.createElement('tr')
  tr.className = 'row'
  tr.tabIndex = 0
  const repo = `https://github.com/jars-demo/${s.n}`
  const site = s.h
    ? `<a href="${s.h}" target="_blank" rel="noopener">${s.h.includes('youtu') ? 'Demo' : 'Site'} ↗</a>`
    : ''
  const demo = s.v ? `<a href="${s.v}" target="_blank" rel="noopener">Demo ↗</a>` : ''
  tr.innerHTML = `<td class="date">${dateText(s.day)}</td><td class="project"><b>${s.n}</b><span></span></td><td><span class="topic"><i></i><span></span></span></td><td class="lang"></td><td class="links"><a href="${repo}" target="_blank" rel="noopener">Repo ↗</a>${site}${demo}</td><td class="mark"></td>`
  tr.querySelector('.project span').textContent = s.d
  tr.querySelector('.topic i').style.background = s.con.color
  tr.querySelector('.topic span').textContent = s.con.label
  tr.querySelector('.lang').textContent = s.l || '–'
  tr.querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => e.stopPropagation()))
  tr.addEventListener('click', () => locate(s))
  tr.addEventListener('keydown', (e) => {
    if (e.target === tr && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      locate(s)
    }
  })
  s.tr = tr
  $('rows').appendChild(tr)
}

// Topic chips: highlight one constellation on the chart and filter the table.
let filter = null
const chips = [null, ...TOPICS].map((key) => {
  const chip = document.createElement('button')
  chip.type = 'button'
  chip.className = 'chip'
  chip.innerHTML = '<i></i><span></span><span class="n"></span>'
  if (key) chip.querySelector('i').style.background = CONSTELLATIONS[key].color
  else chip.querySelector('i').remove()
  chip.querySelector('span').textContent = key ? CONSTELLATIONS[key].label : 'All topics'
  chip.querySelector('.n').textContent = key ? groups[key].length : stars.length
  chip.addEventListener('click', () => setFilter(filter === key ? null : key))
  $('chips').appendChild(chip)
  return { key, chip }
})
function setFilter(key) {
  filter = key
  for (const c of chips) c.chip.setAttribute('aria-pressed', String(c.key === key))
  applyView()
}
function applyView() {
  const q = $('search').value.trim().toLowerCase()
  let shown = 0
  for (const s of stars) {
    const inTopic = !filter || s.k === filter
    s.g.classList.toggle('dim', !inTopic)
    if (s.line) s.line.classList.toggle('dim', !inTopic)
    const match = inTopic && (!q || `${s.n} ${s.d} ${s.con.label} ${s.l}`.toLowerCase().includes(q))
    s.tr.hidden = !match
    if (match) shown++
  }
  for (const k of TOPICS) conLabels[k].classList.toggle('dim', Boolean(filter) && filter !== k)
  $('cluster').classList.toggle('dim', Boolean(filter) && filter !== 'skills')
  $('empty').hidden = shown > 0
}
$('search').addEventListener('input', applyView)

// Badges.
const badgeEls = ACHIEVEMENTS.map((a) => {
  const li = document.createElement('li')
  li.className = 'badge'
  li.innerHTML = `<span class="medal">${MEDAL}</span><b></b><span></span>`
  li.querySelector('b').textContent = a.name
  li.querySelector('span:last-child').textContent = a.hint
  $('badgeList').appendChild(li)
  return li
})

function render() {
  const charted = stars.filter((s) => progress.charted.has(s.n)).length
  $('chartedCount').textContent = charted
  $('chartedTotal').textContent = stars.length
  $('chartedBar').style.width = `${(charted / stars.length) * 100}%`
  $('badgeCount').textContent = unlocked.size
  $('badgeTotal').textContent = ACHIEVEMENTS.length
  $('badgeBar').style.width = `${(unlocked.size / ACHIEVEMENTS.length) * 100}%`
  ACHIEVEMENTS.forEach((a, i) => {
    const got = unlocked.has(a.id)
    badgeEls[i].classList.toggle('got', got)
    badgeEls[i].setAttribute('aria-label', `${a.name}: ${got ? 'earned' : 'not earned yet'}. ${a.hint}`)
  })
  for (const s of stars) {
    const mark = s.tr.lastElementChild
    const done = progress.charted.has(s.n)
    mark.textContent = done ? '✓' : ''
    mark.setAttribute('aria-label', done ? 'Charted' : 'Not charted')
  }
}

// Unlock anything new, then celebrate it, one toast at a time.
let toastTimer = null
function celebrate(a) {
  const toast = $('toast')
  toast.innerHTML = `<span class="medal">${MEDAL}</span><span><small>Badge earned</small><b></b></span>`
  toast.querySelector('b').textContent = a.name
  toast.classList.add('show')
  sound.fanfare()
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800)
}
function advance() {
  const fresh = earnedIds(progress, groups).filter((id) => !unlocked.has(id))
  fresh.forEach((id) => unlocked.add(id))
  save()
  render()
  fresh.forEach((id, i) => setTimeout(() => celebrate(ACHIEVEMENTS.find((a) => a.id === id)), 600 + i * 1700))
}

// The detail pane.
const detail = $('detail')
let selected = null
function renderDetail(s) {
  const repo = `<a class="btn primary" href="https://github.com/jars-demo/${s.n}" target="_blank" rel="noopener">Repository ↗</a>`
  const site = s.h
    ? `<a class="btn" href="${s.h}" target="_blank" rel="noopener">${s.h.includes('youtu') ? 'Watch the demo' : 'Live site'} ↗</a>`
    : ''
  const demo = s.v ? `<a class="btn" href="${s.v}" target="_blank" rel="noopener">Watch the demo ↗</a>` : ''
  const newest = s.day === newestDay ? '<span class="badge-new">Newest</span>' : ''
  detail.innerHTML = `<span class="tag"><i></i><span></span></span><h3></h3><p></p><dl><dt>Created</dt><dd>${dateText(s.day)} 2026${newest}</dd><dt>Language</dt><dd class="lang"></dd><dt>Star</dt><dd class="bayer">${s.bayer}</dd></dl><div class="actions">${repo}${site}${demo}</div>`
  detail.querySelector('.tag i').style.background = s.con.color
  detail.querySelector('.tag span').textContent = s.con.label
  detail.querySelector('h3').textContent = s.n
  detail.querySelector('p').textContent = s.d
  detail.querySelector('.lang').textContent = s.l || '–'
  if (progress.charted.has(s.n)) {
    const done = document.createElement('span')
    done.className = 'charted'
    done.textContent = '✓ Charted'
    detail.querySelector('dl').after(done)
  }
}
function open(s, byUser) {
  selected = s
  for (const x of stars) {
    x.g.classList.toggle('on', x === s)
    x.tr.classList.toggle('on', x === s)
  }
  if (byUser) {
    sound.wake()
    sound.chime(s.note)
    if (!progress.charted.has(s.n)) {
      progress.charted.add(s.n)
      advance()
    }
  }
  renderDetail(s)
}
// From the table: make sure the star is lit, open it and bring the chart into view.
function locate(s) {
  if (s.day > current) showNight(DAYS - 1, false)
  open(s, true)
  $('explore').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

let current = DAYS - 1
function step(s, dir) {
  const lit = stars.filter((x) => !x.g.classList.contains('hidden') && (!filter || x.k === filter))
  if (!lit.length) return
  const at = lit.indexOf(s)
  const next = lit[(at === -1 ? 0 : at + dir + lit.length) % lit.length]
  next.g.focus()
  open(next, true)
}

// The timeline: projects created each day.
const tip = $('tip')
const barEls = perDay.map((n, i) => {
  const bar = document.createElement('div')
  bar.className = 'bar'
  bar.style.height = `${Math.max(6, (n / peak) * 100)}%`
  bar.addEventListener('mouseenter', () => {
    tip.textContent = `${dateText(i)} · ${n} ${n === 1 ? 'project' : 'projects'}`
    tip.style.left = `${((i + 0.5) / DAYS) * 100}%`
    tip.hidden = false
  })
  bar.addEventListener('mouseleave', () => {
    tip.hidden = true
  })
  bar.addEventListener('click', () => goTo(i))
  $('bars').appendChild(bar)
  return bar
})

const visible = (s) => !s.g.classList.contains('hidden')
function updateCount() {
  const lit = stars.filter(visible).length
  $('count').textContent = lit
  $('thCount').textContent = lit
  return lit
}

// The day readouts: the timeline, its label and, in the theater, the big date.
function dayUI(day) {
  current = day
  barEls.forEach((bar, i) => {
    bar.classList.toggle('lit', i <= day)
    bar.classList.toggle('today', i === day)
  })
  const born = perDay[day] || 0
  $('nightLabel').innerHTML =
    day < 0
      ? 'Before the first day'
      : `Day ${day + 1} of ${DAYS} · <b>${dateText(day)}</b> · ${born ? `${born} new` : 'no new projects'}`
  $('scrub').value = Math.max(0, day)
  $('scrub').setAttribute('aria-valuetext', `${dateText(Math.max(0, day))}, ${updateCount()} projects lit`)
  if (day < 0) return
  $('thDay').textContent = `Day ${day + 1} of ${DAYS}`
  $('thBig').textContent = dateText(day)
  $('thSub').textContent = born ? `${born} new ${born === 1 ? 'project' : 'projects'}` : 'A quiet day'
  restart($('thBig'), 'flip')
}

// Show the sky as it was on one day. Returns the stars that just appeared.
function showNight(day, animate) {
  const appeared = []
  for (const s of stars) {
    const on = s.day <= day
    if (on && !visible(s)) appeared.push(s)
    s.g.classList.toggle('hidden', !on)
    s.tr.classList.toggle('unborn', !on)
    if (s.line) s.line.classList.toggle('hidden', !on)
  }
  if (animate) appeared.forEach(flare)
  for (const k of TOPICS) conLabels[k].classList.toggle('hidden', !groups[k].some((s) => s.day <= day))
  const skillsOn = groups.skills.every((s) => s.day <= day)
  skillDots.forEach((dot) => dot.classList.toggle('hidden', !skillsOn))
  dayUI(day)
  return appeared
}

function flare(s) {
  restart(s.g, 'born')
  if (s.line) restart(s.line, 'drawing')
}

function goTo(day) {
  sound.wake()
  sound.births(showNight(day, true).map((s) => s.note))
  if (perDay[day] === peak && !progress.peak) {
    progress.peak = true
    advance()
  }
}

// ---- Effects --------------------------------------------------------------------------------

// A ring of the topic's colour spreading out from a new star.
function ripple(s, delay = 0) {
  if (reducedMotion()) return
  const ring = el('circle', { cx: s.x, cy: s.y, r: 1, class: 'ripple', stroke: s.con.color }, $('fx'))
  const run = ring.animate(
    [
      { transform: 'scale(0.4)', opacity: 0.9 },
      { transform: 'scale(7)', opacity: 0 },
    ],
    { duration: 1700, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' },
  )
  run.onfinish = () => ring.remove()
}

// The skills cluster bursts out of its star.
function burstCluster() {
  skillDots.forEach((dot) => dot.classList.remove('hidden'))
  if (reducedMotion()) return
  const { x, y } = CONSTELLATIONS.skills
  skillDots.forEach((dot, i) => {
    const dx = x - Number(dot.getAttribute('cx'))
    const dy = y - Number(dot.getAttribute('cy'))
    dot.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      {
        duration: 1200,
        delay: i * 12,
        easing: 'cubic-bezier(.2,.8,.2,1)',
        fill: 'backwards',
      },
    )
  })
}

// A constellation lights up: lines brighten and every star pulses.
function glow(k) {
  if (reducedMotion()) return
  for (const s of groups[k]) {
    s.line?.animate(
      [
        { strokeOpacity: 0.7, strokeWidth: '0.18px' },
        { strokeOpacity: 1, strokeWidth: '0.55px' },
        { strokeOpacity: 0.7, strokeWidth: '0.18px' },
      ],
      { duration: 1100, easing: 'ease-in-out' },
    )
    s.g
      .querySelector('.halo')
      .animate([{ transform: 'scale(1)' }, { transform: 'scale(2.2)', opacity: 1 }, { transform: 'scale(1)' }], {
        duration: 1100,
        easing: 'ease-in-out',
      })
  }
}

// A shooting star.
function meteor(from = [84, 6], to = [52, 19], delay = 0) {
  if (reducedMotion()) return
  const g = el('g', { 'aria-hidden': 'true' }, $('sky'))
  el(
    'line',
    { x1: 0, y1: 0, x2: 9, y2: -3.6, stroke: 'url(#trail)', 'stroke-width': 0.3, 'stroke-linecap': 'round' },
    g,
  )
  const run = g.animate(
    [
      { transform: `translate(${from[0]}px, ${from[1]}px)`, opacity: 0 },
      { opacity: 1, offset: 0.15 },
      { transform: `translate(${to[0]}px, ${to[1]}px)`, opacity: 0 },
    ],
    { duration: 1400, delay, easing: 'ease-in', fill: 'backwards' },
  )
  run.onfinish = () => g.remove()
}
function meteorShower() {
  for (let i = 0; i < 7; i++) {
    const x = 55 + Math.random() * 50
    const y = Math.random() * 18
    meteor([x, y], [x - 30 - Math.random() * 10, y + 12 + Math.random() * 6], i * 260 + Math.random() * 200)
  }
}

// ---- Camera ---------------------------------------------------------------------------------

const svg = $('sky')
const FULL = { x: 0, y: 0, w: 100, h: 58 }
const cam = { ...FULL }
let camFrame = 0
function setView(v) {
  Object.assign(cam, v)
  svg.setAttribute('viewBox', `${cam.x.toFixed(3)} ${cam.y.toFixed(3)} ${cam.w.toFixed(3)} ${cam.h.toFixed(3)}`)
}
function moveCamera(to, ms) {
  cancelAnimationFrame(camFrame)
  if (reducedMotion()) return setView(FULL)
  const from = { ...cam }
  const t0 = performance.now()
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
  const tick = (now) => {
    const e = ease(Math.min(1, (now - t0) / ms))
    setView({
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e,
      w: from.w + (to.w - from.w) * e,
      h: from.h + (to.h - from.h) * e,
    })
    if (e < 1) camFrame = requestAnimationFrame(tick)
  }
  camFrame = requestAnimationFrame(tick)
}
function focusOn(s, zoom = 1.75) {
  const w = 100 / zoom
  const h = 58 / zoom
  return { x: clamp(s.x - w / 2, 0, 100 - w), y: clamp(s.y - h * 0.45, 0, 58 - h), w, h }
}

// ---- The theater: the month, played --------------------------------------------------------

const CANCEL = Symbol('cancel')
let run = null
const panel = $('explore')
const outside = () => document.querySelectorAll('.skip, .nav, .hero, #badges, #projects, .foot')

// Waits on the animation clock, so pausing (or a hidden tab) holds the show.
function sleep(ms) {
  const r = run
  return new Promise((resolve, reject) => {
    let left = ms
    let last = performance.now()
    const tick = (now) => {
      if (r.cancelled) return reject(CANCEL)
      const dt = now - last
      last = now
      if (!r.paused) {
        left -= dt
        r.elapsed = Math.min(TOTAL, r.elapsed + dt)
        $('thBar').style.width = `${(r.elapsed / TOTAL) * 100}%`
        $('thClock').textContent = `${clock(r.elapsed)} / ${clock(TOTAL)}`
      }
      if (left <= 0) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function caption(s, index) {
  const box = $('thCaption')
  box.classList.remove('show')
  box.style.setProperty('--c', s.con.color)
  box.innerHTML = '<span class="tag"><i></i><span></span></span><h3></h3><p></p><span class="meta"></span>'
  box.querySelector('.tag i').style.background = s.con.color
  box.querySelector('.tag span').textContent = s.con.label
  box.querySelector('h3').textContent = s.n
  box.querySelector('p').textContent = s.d
  box.querySelector('.meta').textContent = `${s.bayer} · project ${index} of ${stars.length}`
  void box.getBoundingClientRect()
  box.classList.add('show')
}

function reveal(s) {
  s.g.classList.remove('hidden')
  s.tr.classList.remove('unborn')
  if (s.line) s.line.classList.remove('hidden')
  flare(s)
  const label = conLabels[s.k]
  if (label.classList.contains('hidden')) {
    label.classList.remove('hidden')
    restart(label, 'appear')
  }
  if (s.k === 'skills') burstCluster()
  ripple(s)
  ripple(s, 280)
  sound.births([s.note])
  const group = groups[s.k]
  if (group.length > 1 && group[group.length - 1] === s) {
    setTimeout(() => {
      glow(s.k)
      sound.complete()
    }, 500)
  }
  open(s, false)
  caption(s, updateCount())
}

function setPlayButton() {
  const playing = run && !run.paused && !run.done
  $('playLabel').textContent = !run ? 'Play the month' : run.done ? 'Replay' : run.paused ? 'Resume' : 'Pause'
  $('playIcon').setAttribute('d', playing ? 'M3 1.5h3v11H3zM8 1.5h3v11H8z' : 'M3 1.5v11l9-5.5z')
  $('playDur').hidden = Boolean(run)
}

function onKey(e) {
  if (e.key === 'Escape') exitTheater()
  else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement) && e.target.getAttribute('role') !== 'button') {
    e.preventDefault()
    togglePause()
  }
}

function enterTheater() {
  if (panel.classList.contains('theater')) return
  panel.classList.add('theater')
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  outside().forEach((n) => (n.inert = true))
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKey)
  $('play').focus()
}

function exitTheater() {
  if (!panel.classList.contains('theater')) return
  if (run) run.cancelled = true
  run = null
  sound.stopPad()
  cancelAnimationFrame(camFrame)
  setView(FULL)
  panel.classList.remove('theater')
  panel.removeAttribute('role')
  panel.removeAttribute('aria-modal')
  outside().forEach((n) => (n.inert = false))
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
  $('thIntro').hidden = true
  $('thFinal').hidden = true
  $('thCaption').classList.remove('show')
  showNight(current < 0 ? DAYS - 1 : current, false)
  setPlayButton()
  $('play').focus()
}

function togglePause() {
  if (!run) return
  if (run.done) return cinema()
  run.paused = !run.paused
  if (run.paused) sound.stopPad()
  else sound.startPad()
  setPlayButton()
}

async function cinema() {
  if (run) run.cancelled = true
  const r = (run = { cancelled: false, paused: false, done: false, elapsed: 0 })
  enterTheater()
  setPlayButton()
  sound.wake()
  sound.whoosh()
  sound.stopPad()
  sound.startPad()
  sound.padChord(0)
  showNight(-1, false)
  cancelAnimationFrame(camFrame)
  setView(FULL)
  $('thCaption').classList.remove('show')
  $('thDay').textContent = `Day 1 of ${DAYS}`
  $('thBig').textContent = dateText(0)
  $('thSub').textContent = ''
  $('thFinal').hidden = true
  $('thIntro').hidden = false
  $('thIntro').classList.remove('out')
  try {
    await sleep(PACE.intro - 700)
    $('thIntro').classList.add('out')
    await sleep(700)
    $('thIntro').hidden = true
    for (let day = 0; day < DAYS; day++) {
      dayUI(day)
      sound.padChord(Math.floor(day / 7.5))
      const born = stars.filter((s) => s.day === day)
      if (!born.length) {
        sound.tick()
        if (cam.w < 100) moveCamera(FULL, 1600)
        await sleep(PACE.quiet)
        continue
      }
      await sleep(PACE.day * 0.35)
      for (const s of born) {
        moveCamera(focusOn(s), 850)
        await sleep(400)
        reveal(s)
        await sleep(PACE.star - 400)
      }
      await sleep(PACE.day * 0.65)
    }
    await finale(r)
  } catch (e) {
    if (e !== CANCEL) throw e
  }
}

async function finale(r) {
  $('thCaption').classList.remove('show')
  moveCamera(FULL, 1600)
  await sleep(1600)
  for (const k of TOPICS) {
    glow(k)
    sound.chime(groups[k][0].note)
    await sleep(320)
  }
  meteorShower()
  await sleep(900)
  $('thFinal').hidden = false
  countUp()
  sound.finale()
  progress.month = true
  advance()
  r.done = true
  setPlayButton()
  $('replay').focus()
  await sleep(Math.max(0, PACE.finale - 1600 - TOPICS.length * 320 - 900))
  sound.stopPad()
}

function countUp() {
  const nums = [...document.querySelectorAll('.th-stats dd')]
  if (reducedMotion()) return nums.forEach((n) => (n.textContent = n.dataset.to))
  const t0 = performance.now()
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / 1500)
    const e = 1 - (1 - k) ** 3
    nums.forEach((n) => (n.textContent = Math.round(Number(n.dataset.to) * e)))
    if (k < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

$('watch').addEventListener('click', cinema)
$('play').addEventListener('click', () => (run ? togglePause() : cinema()))
$('exit').addEventListener('click', exitTheater)
$('replay').addEventListener('click', cinema)
$('explore-chart').addEventListener('click', exitTheater)
$('scrub').addEventListener('input', () => goTo(Number($('scrub').value)))

// Sound on and off.
function renderSound() {
  $('sound').setAttribute('aria-pressed', String(soundOn))
  $('soundLabel').textContent = soundOn ? 'Sound on' : 'Sound off'
  $('soundWaves').style.display = soundOn ? '' : 'none'
  $('soundOff').style.display = soundOn ? 'none' : ''
}
$('sound').addEventListener('click', () => {
  soundOn = !soundOn
  sound.setOn(soundOn)
  if (soundOn) {
    sound.wake()
    sound.chime(57)
    if (run && !run.paused && !run.done) sound.startPad()
  }
  save()
  renderSound()
})

// Reset asks twice, without a browser dialog.
let resetArmed = null
$('reset').addEventListener('click', () => {
  if (!resetArmed) {
    $('reset').textContent = 'Click again to reset'
    resetArmed = setTimeout(() => {
      resetArmed = null
      $('reset').textContent = 'Reset progress'
    }, 3000)
    return
  }
  clearTimeout(resetArmed)
  resetArmed = null
  $('reset').textContent = 'Reset progress'
  progress.charted.clear()
  progress.month = false
  progress.peak = false
  unlocked.clear()
  save()
  render()
  if (selected) renderDetail(selected)
})

// ---- The background field: seeded stars that twinkle and drift with the camera -----------------

const canvas = $('field')
const ctx2d = canvas.getContext('2d')
let fieldSeed = 42
const frand = () => (fieldSeed = (fieldSeed * 16807) % 2147483647) / 2147483647
const field = Array.from({ length: 420 }, () => ({
  x: frand(),
  y: frand(),
  r: frand() < 0.92 ? frand() * 0.7 + 0.2 : frand() * 1.1 + 0.6,
  a: 0.12 + frand() * 0.45,
  depth: 0.3 + frand() * 0.7,
  speed: 0.0006 + frand() * 0.0018,
  phase: frand() * Math.PI * 2,
  blue: frand() < 0.15,
}))
let size = { w: 0, h: 0 }
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  size = { w: width, h: height }
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (reducedMotion()) drawField(0)
}).observe(canvas)

const wrap01 = (v) => ((v % 1) + 1) % 1
function drawField(t) {
  const { w, h } = size
  ctx2d.clearRect(0, 0, w, h)
  const px = (cam.x + cam.w / 2 - 50) / 100
  const py = (cam.y + cam.h / 2 - 29) / 58
  const zoom = 100 / cam.w
  const still = reducedMotion()
  for (const s of field) {
    const x = wrap01(s.x - px * 0.25 * s.depth) * w
    const y = wrap01(s.y - py * 0.25 * s.depth) * h
    ctx2d.globalAlpha = still ? s.a : s.a * (0.65 + 0.35 * Math.sin(t * s.speed + s.phase))
    ctx2d.fillStyle = s.blue ? '#bcd0ff' : '#f3ead6'
    ctx2d.beginPath()
    ctx2d.arc(x, y, s.r * (1 + (zoom - 1) * 0.3 * s.depth), 0, Math.PI * 2)
    ctx2d.fill()
  }
}
function frame(t) {
  drawField(t)
  requestAnimationFrame(frame)
}
if (!reducedMotion()) requestAnimationFrame(frame)

// At rest: the whole sky, with the newest project open.
showNight(DAYS - 1, false)
open(
  stars.find((s) => s.day === newestDay),
  false,
)
setFilter(null)
render()
renderSound()
setPlayButton()
setTimeout(() => meteor([96, 3], [70, 13]), 1800)
