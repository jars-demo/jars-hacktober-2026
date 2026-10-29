import { REPOS } from './data.js'
import { CONSTELLATIONS, DAYS, SKILLS, achievementList, chart, dateText, earnedIds } from './model.js'
import * as sound from './audio.js'

const { stars, groups, perDay, peak, newestDay } = chart(REPOS)
const ACHIEVEMENTS = achievementList(groups, stars.length)
const TOPICS = Object.keys(CONSTELLATIONS).filter((k) => groups[k])
const NS = 'http://www.w3.org/2000/svg'
const MEDAL =
  '<svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true"><path fill="currentColor" d="M11 1.5l2.6 6.9 6.9 2.6-6.9 2.6L11 20.5l-2.6-6.9L1.5 11l6.9-2.6z"/></svg>'
const $ = (id) => document.getElementById(id)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Styles are set through the CSSOM, never as style attributes, so the content security policy
// can stay strict.
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(NS, tag)
  for (const key in attrs) node.setAttribute(key, attrs[key])
  if (parent) parent.appendChild(node)
  return node
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
  tr.innerHTML = `<td class="date">${dateText(s.day)}</td><td class="project"><b>${s.n}</b><span></span></td><td><span class="topic"><i></i><span></span></span></td><td class="lang"></td><td class="links"><a href="${repo}" target="_blank" rel="noopener">Repo ↗</a>${site}</td><td class="mark"></td>`
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
  const newest = s.day === newestDay ? '<span class="badge-new">Newest</span>' : ''
  detail.innerHTML = `<span class="tag"><i></i><span></span></span><h3></h3><p></p><dl><dt>Created</dt><dd>${dateText(s.day)} 2026${newest}</dd><dt>Language</dt><dd class="lang"></dd><dt>Star</dt><dd class="bayer">${s.bayer}</dd></dl><div class="actions">${repo}${site}</div>`
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
  if (s.day > current) {
    stop()
    showNight(DAYS - 1, false)
  }
  open(s, true)
  $('explore').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
}

let current = DAYS - 1
function step(s, dir) {
  const lit = stars.filter((x) => x.day <= current && (!filter || x.k === filter))
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

// Show the sky as it was on one day. Returns the stars that just appeared.
function showNight(day, animate) {
  current = day
  const appeared = []
  for (const s of stars) {
    const on = s.day <= day
    if (on && s.g.classList.contains('hidden')) appeared.push(s)
    s.g.classList.toggle('hidden', !on)
    s.tr.classList.toggle('unborn', !on)
    if (s.line) s.line.classList.toggle('hidden', !on)
  }
  if (animate) {
    for (const s of appeared) {
      s.g.classList.remove('born')
      void s.g.getBBox()
      s.g.classList.add('born')
      if (s.line) {
        s.line.classList.remove('drawing')
        void s.line.getBBox()
        s.line.classList.add('drawing')
      }
    }
  }
  const lit = stars.filter((s) => s.day <= day).length
  const skillsOn = groups.skills.every((s) => s.day <= day)
  skillDots.forEach((dot) => dot.classList.toggle('hidden', !skillsOn))
  barEls.forEach((bar, i) => {
    bar.classList.toggle('lit', i <= day)
    bar.classList.toggle('today', i === day)
  })
  $('count').textContent = lit
  const born = perDay[day] || 0
  $('nightLabel').innerHTML =
    day < 0
      ? 'Before the first day'
      : `Day ${day + 1} of ${DAYS} · <b>${dateText(day)}</b> · ${born ? `${born} new` : 'no new projects'}`
  $('scrub').value = Math.max(0, day)
  $('scrub').setAttribute('aria-valuetext', `${dateText(Math.max(0, day))}, ${lit} projects lit`)
  return appeared
}

function goTo(day) {
  stop()
  sound.wake()
  sound.births(showNight(day, true).map((s) => s.note))
  if (perDay[day] === peak && !progress.peak) {
    progress.peak = true
    advance()
  }
}

// A shooting star across the top of the chart.
function meteor(from = [84, 6], to = [52, 19]) {
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
    { duration: 1400, easing: 'ease-in' },
  )
  run.onfinish = () => g.remove()
}

// Play the month.
let timer = null
function setPlaying(playing) {
  $('playLabel').textContent = playing ? 'Pause' : 'Play the month'
  $('playIcon').setAttribute('d', playing ? 'M3 1.5h3v11H3zM8 1.5h3v11H8z' : 'M3 1.5v11l9-5.5z')
  $('nightLabel').setAttribute('aria-live', playing ? 'off' : 'polite')
}
function stop() {
  clearInterval(timer)
  timer = null
  sound.stopPad()
  setPlaying(false)
}
function finish() {
  progress.month = true
  sound.finale()
  meteor()
  $('nightLabel').innerHTML = `<b>Month complete.</b> ${stars.length} projects, ${SKILLS} skills, ${DAYS} days.`
  advance()
}
function play() {
  sound.wake()
  sound.startPad()
  let day = current >= DAYS - 1 ? -1 : current
  if (day === -1) showNight(-1, false)
  setPlaying(true)
  timer = setInterval(
    () => {
      day += 1
      const appeared = showNight(day, true)
      if (appeared.length) {
        open(appeared[appeared.length - 1], false)
        sound.births(appeared.map((s) => s.note))
      } else {
        sound.tick()
      }
      if (day >= DAYS - 1) {
        stop()
        finish()
      }
    },
    reducedMotion() ? 650 : 480,
  )
}
$('play').addEventListener('click', () => (timer ? stop() : play()))
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
    if (timer) sound.startPad()
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

// A faint background field of stars, seeded so it is the same every time.
const canvas = $('field')
function paintField() {
  const box = canvas.getBoundingClientRect()
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(box.width * dpr)
  canvas.height = Math.round(box.height * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  let s = 42
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 380; i++) {
    const x = rnd() * box.width
    const y = rnd() * box.height
    const r = rnd() < 0.92 ? rnd() * 0.7 + 0.2 : rnd() * 1.1 + 0.6
    ctx.globalAlpha = 0.12 + rnd() * 0.4
    ctx.fillStyle = rnd() < 0.15 ? '#bcd0ff' : '#f3ead6'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}
paintField()
let resizeTimer
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(paintField, 150)
})

// At rest: the whole sky, with the newest project open.
showNight(DAYS - 1, false)
open(
  stars.find((s) => s.day === newestDay),
  false,
)
setFilter(null)
render()
renderSound()
setTimeout(() => meteor([96, 3], [70, 13]), 1800)
