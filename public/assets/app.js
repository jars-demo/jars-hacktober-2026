// The page: hero numbers, before and after, the spike chart, videos, how I build, the project grid
// and the played month.
import { REPOS, TOPICS, VIDEOS } from './data.js'
import { FLOW, WISPR_DAY } from './flow.js'
import { DAYS, byDay, dateText, dayIndex, fmt, matches, split, ytId } from './model.js'

const $ = (s) => document.querySelector(s)
const el = (tag, cls, html) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  return e
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const days = byDay(REPOS)
const sp = split(REPOS, VIDEOS, WISPR_DAY)
const { before: b, after: a } = sp
const pivot = dayIndex(WISPR_DAY)
const times = `${Math.round(sp.times)}×`
const max = Math.max(...days.map((d) => d.repos.length))

// A number that counts up from zero when it scrolls into view. Decimals keep their places.
const num = (n, places = 0) => `<span data-count="${n}" data-places="${places}">${places ? n.toFixed(places) : fmt(n)}</span>`

// Hero
document.querySelectorAll('[data-times]').forEach((e) => (e.textContent = times))
$('#hero-stats').innerHTML = [
  [num(REPOS.length), 'Projects shipped'],
  [num(VIDEOS.length), 'Videos published'],
  [num(FLOW.words), 'Words dictated'],
  [num(FLOW.wpm), 'Words per minute'],
]
  .map(([n, l]) => `<div><dd>${n}</dd><dt>${l}</dt></div>`)
  .join('')
const card = $('#flow-card')
card.src = FLOW.card
card.alt = `My Wispr Flow usage card: ${fmt(FLOW.words)} words dictated, ${FLOW.wpm} words per minute, ${FLOW.apps} apps, ${FLOW.streak}-day streak`
$('#flow-cap').textContent = `My Wispr Flow usage card · ${dateText(FLOW.asOf)}`

// Before and after: one card, two layers, and a slider that wipes from typing to talking. It sweeps
// on its own while in view, so it reads as something you can move; a drag or a key takes over.
const PROMPT = 'Build a hands-on caching workshop: eight real bugs, a Python lab and a short explainer video.'
const layer = (cls, title, s, extra) =>
  `<div class="layer ${cls}"><div class="inner">
    <p class="label">${cls === 'with' ? 'With Wispr Flow' : 'Without Wispr Flow'} · ${dateText(s.from)} – ${dateText(s.to)}</p>
    <h3>${title}</h3>
    <div class="prompt"><span class="how">${cls === 'with' ? '🎙 Speaking' : '⌨ Typing'}</span><p class="ptext"></p>${
      cls === 'with' ? '<span class="mini-wave">' + '<i></i>'.repeat(12) + '</span>' : ''
    }</div>
    <ul><li><b>${num(s.projects)}</b><span>Projects</span></li><li><b>${num(s.videos)}</b><span>Videos</span></li>
    <li><b>${num(s.pace, 1)}</b><span>A day</span></li>${extra}</ul></div></div>`
$('#compare').innerHTML =
  layer('without', 'Think. Type, type, type.', b, '') +
  layer('with', 'Talk, and it ships.', a, `<li class="x"><b>${times}</b><span>Faster</span></li>`) +
  `<div class="handle" aria-hidden="true"><span>‹ ›</span></div>
   <input class="range" type="range" min="0" max="100" value="50" aria-label="Slide from without Wispr Flow to with Wispr Flow" />`
const compare = $('#compare')
const range = compare.querySelector('.range')
let pos = 50
let auto = !reduced
let idle = 0
let seen = false
const setPos = (p) => {
  pos = Math.max(0, Math.min(100, p))
  compare.style.setProperty('--pos', `${pos}%`)
  range.value = String(Math.round(pos))
}
setPos(50)
const takeOver = () => {
  auto = false
  clearTimeout(idle)
  idle = setTimeout(() => (auto = !reduced), 5000)
}
range.addEventListener('input', () => {
  takeOver()
  setPos(Number(range.value))
})
range.addEventListener('pointerdown', takeOver)
const t0 = performance.now()
const sweep = (now) => {
  if (auto && seen) setPos(50 + 26 * Math.sin((now - t0) / 1500))
  requestAnimationFrame(sweep)
}
requestAnimationFrame(sweep)
new IntersectionObserver(([e]) => (seen = e.isIntersecting), { threshold: 0.3 }).observe(compare)

// Both prompts loop: typed letter by letter on one side, arriving in whole words on the other.
const [slow, fast] = compare.querySelectorAll('.ptext')
const loopPrompts = async () => {
  for (;;) {
    slow.textContent = ''
    fast.textContent = ''
    const words = PROMPT.split(' ')
    let w = 0
    for (let i = 0; i <= PROMPT.length; i++) {
      slow.textContent = PROMPT.slice(0, i)
      if (i % 3 === 0 && w < words.length) fast.textContent = words.slice(0, ++w).join(' ')
      await new Promise((r) => setTimeout(r, seen ? 70 : 400))
    }
    await new Promise((r) => setTimeout(r, 1800))
  }
}
if (reduced) {
  slow.textContent = PROMPT
  fast.textContent = PROMPT
} else loopPrompts()

// Spike chart
const chart = $('#chart')
chart.setAttribute(
  'aria-label',
  `Projects per day: ${b.projects} in the ${b.days} days before ${dateText(WISPR_DAY)}, ${a.projects} in the ${a.days} days from it.`,
)
const tip = $('#tip')
days.forEach((d, i) => {
  const btn = el('button', i >= pivot ? 'after' : '')
  btn.type = 'button'
  if ([0, pivot, DAYS - 1].includes(i)) btn.classList.add('lbl')
  btn.setAttribute('aria-label', `${dateText(d.date)}: ${d.repos.length} projects`)
  btn.innerHTML = `<i style="height:${(d.repos.length / max) * 100}%;transition-delay:${i * 30}ms"></i><small>${
    i % 4 === 0 || i === pivot || i === DAYS - 1 ? dateText(d.date) : ''
  }</small>`
  btn.addEventListener('click', () => {
    chart.querySelectorAll('[aria-pressed]').forEach((x) => x.removeAttribute('aria-pressed'))
    btn.setAttribute('aria-pressed', 'true')
    tip.innerHTML = d.repos.length
      ? `<b>${dateText(d.date)}</b> · ${d.repos.map((r) => esc(r.n)).join(', ')}`
      : `<b>${dateText(d.date)}</b> · nothing new that day`
  })
  chart.append(btn)
})
const marker = el('div', 'marker', `<span>${dateText(WISPR_DAY)} · Wispr Flow</span>`)
marker.style.left = `calc(${(pivot / DAYS) * 100}% - 2px)`
chart.append(marker)

// Videos: a thumbnail first, the player only when tapped.
const lite = (box) => {
  const id = box.dataset.yt
  box.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`
  const btn = el('button')
  btn.type = 'button'
  btn.setAttribute('aria-label', `Play ${box.dataset.title}`)
  btn.addEventListener('click', () => {
    const f = el('iframe')
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    f.title = box.dataset.title
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    f.allowFullscreen = true
    box.replaceChildren(f)
  })
  box.append(btn)
}
const featured = [...document.querySelectorAll('.feat .yt')].map((x) => x.dataset.yt)
const repoOf = (n) => REPOS.find((r) => r.n === n)
$('#vid-grid').innerHTML = VIDEOS.filter((v) => !featured.includes(v.id))
  .map((v) => {
    const r = v.r && repoOf(v.r)
    return `<article class="vid"><div class="yt" data-yt="${v.id}" data-title="${esc(v.t)}"></div>
    <p class="label">${v.k} · ${dateText(v.c)}</p><p class="t">${esc(v.t)}</p>
    ${r && r.h && !ytId(r.h) ? `<p class="d"><a href="${r.h}">Try the project</a></p>` : ''}</article>`
  })
  .join('')
document.querySelectorAll('.yt').forEach(lite)

// How I build
const STEPS = [
  ['I talk the spec sheet out', true],
  ['I talk my coding agent through it, with that spec', true],
  ['I correct the agent, out loud', true],
  ['I load the right agent skills', false],
  ['I direct the agent again, out loud', true],
  ['I write the video script myself, by talking', true],
  ['I give the agent the ElevenLabs script format', false],
  ['I rework the script, out loud', true],
  ['The formatted script goes into ElevenLabs', false],
  ['Out comes the voiceover MP3', false],
  ['I direct the agent through the video, the polish and the publish', true],
]
$('#steps').innerHTML = STEPS.map(
  ([t, v]) => `<li class="${v ? 'voice' : ''}"><span>${t}${v ? '<small>WisprFlow</small>' : ''}</span></li>`,
).join('')

// Projects: the first nine, then all of them on request.
let topic = ''
let showAll = false
const SHOWN = 9
const chips = $('#chips')
const chip = (k, label, color) => {
  const c = el('button', '', `${color ? `<i style="background:${color}"></i>` : ''}${label}`)
  c.type = 'button'
  c.setAttribute('aria-pressed', String(k === topic))
  c.addEventListener('click', () => {
    topic = k
    chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === c)))
    renderProjects()
  })
  return c
}
chips.append(chip('', 'All'))
for (const [k, t] of Object.entries(TOPICS)) if (REPOS.some((r) => r.k === k)) chips.append(chip(k, t.label, t.color))
const q = $('#q')
q.addEventListener('input', () => renderProjects())
const more = $('#more')
more.addEventListener('click', () => {
  showAll = !showAll
  renderProjects()
  if (!showAll) $('#projects').scrollIntoView()
})
const sorted = [...REPOS].sort((x, y) => y.c.localeCompare(x.c) || x.n.localeCompare(y.n))
function renderProjects() {
  const list = sorted.filter((r) => matches(r, topic, q.value))
  const shown = showAll || q.value.trim() ? list : list.slice(0, SHOWN)
  $('#proj-grid').innerHTML = shown
    .map((r) => {
      const t = TOPICS[r.k]
      const video = r.v || (ytId(r.h) ? r.h : null)
      const site = r.h && !ytId(r.h) ? r.h : null
      return `<article class="proj"><div class="meta"><i style="background:${t.color}"></i>${t.label} · ${dateText(r.c)}</div>
      <h3>${esc(r.n)}</h3><p>${esc(r.d)}</p>${r.c >= WISPR_DAY ? '<span class="wf">Built leveraging WisprFlow</span>' : ''}
      <p class="links">${site ? `<a href="${site}">Live</a>` : ''}<a href="https://github.com/jars-demo/${r.n}">Code</a>${
        video ? `<a href="${video}">Video</a>` : ''
      }</p></article>`
    })
    .join('')
  $('#empty').hidden = list.length > 0
  more.hidden = list.length <= SHOWN || !!q.value.trim()
  more.textContent = showAll ? 'Show fewer' : `Show all ${list.length} projects`
  $('#proj-count').textContent = `${REPOS.length} projects, newest first. ${a.projects} of them built since ${dateText(WISPR_DAY)}.`
}
renderProjects()

// Motion: elements rise into place as they arrive, numbers count up, the chart grows.
const countUp = (e) => {
  const to = Number(e.dataset.count)
  const places = Number(e.dataset.places)
  const t0 = performance.now()
  const dur = 1100
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur)
    const v = to * (1 - Math.pow(1 - k, 3))
    e.textContent = places ? v.toFixed(places) : fmt(Math.round(v))
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
const groups = [
  ['.hero-text > *, .hero-card, .stats', 0.08],
  ['.head', 0],
  ['.compare, .chart-wrap', 0.1],
  ['.feat, .vid', 0.08],
  ['.then, .steps li', 0.04],
  ['.end > *', 0.1],
]
for (const [sel, stagger] of groups)
  document.querySelectorAll(sel).forEach((e, i) => {
    e.classList.add('rise')
    e.style.setProperty('--d', `${(i % 12) * stagger}s`)
  })
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('in')
      e.target.querySelectorAll('[data-count]').forEach(countUp)
      io.unobserve(e.target)
    }
  },
  { threshold: 0.15 },
)
const watched = document.querySelectorAll('.rise, #chart, .hero h1, .end h2')
if (reduced) watched.forEach((e) => e.classList.add('in'))
else watched.forEach((e) => io.observe(e))

// Back to top
const toTop = $('#to-top')
toTop.hidden = false
const onScroll = () => toTop.classList.toggle('hide', scrollY < 900)
addEventListener('scroll', onScroll, { passive: true })
onScroll()
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }))

// The played month: before 16 October every caption is typed out letter by letter; after it, the
// words arrive whole, the way speech does.
const show = $('#show')
const cap = $('#s-cap')
const cards = $('#s-cards')
const bars = $('#s-bars')
$('#s-wave').innerHTML = Array.from({ length: 24 }, (_, i) => `<i style="animation-delay:${-((i * 137) % 1000)}ms"></i>`).join('')
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

// Typed: one character at a time, with a cursor. Spoken: word by word, quickly.
const type = async (text, hold = 900) => {
  cap.classList.add('typing')
  cap.textContent = ''
  for (const ch of text) {
    cap.textContent += ch
    await wait(ch === ' ' ? 40 : 55)
  }
  await wait(hold)
}
// *word* is shown in green, !word! in the accent colour.
const say = async (text, hold = 1200) => {
  cap.classList.remove('typing')
  const words = text.split(' ')
  cap.innerHTML = words
    .map((w, i) => {
      const cls = w.startsWith('*') ? 'w g' : w.startsWith('!') ? 'w a' : 'w'
      return `<span class="${cls}" style="animation-delay:${i * 70}ms">${esc(w.replace(/[*!]/g, ''))}</span>`
    })
    .join(' ')
  await wait(words.length * 70 + hold)
}
const addCard = (html, cls = '') => {
  const all = cards.querySelectorAll('.show-card')
  if (all.length >= 15) all[0].remove()
  all.forEach((c) => c.classList.add('old'))
  cards.append(el('div', `show-card ${cls}`, html))
}
const setDay = (i) => {
  $('#s-date').textContent = dateText(days[i].date)
  bars.querySelectorAll('i').forEach((x, j) => x.classList.toggle('today', j === i))
}

async function playMonth() {
  const id = ++run
  paused = false
  $('#s-pause').textContent = 'Pause'
  show.hidden = false
  show.classList.remove('talk')
  $('#s-mode').textContent = 'Typing'
  document.body.style.overflow = 'hidden'
  cards.replaceChildren()
  cap.textContent = ''
  bars.innerHTML = days.map((_, i) => `<i class="${i >= pivot ? 'after' : ''}"></i>`).join('')
  const barEls = [...bars.children]
  let count = 0
  $('#s-count').textContent = '0'
  const land = async (i, r, gap) => {
    count++
    $('#s-count').textContent = count
    barEls[i].style.height = `${(days[i].repos.length / max) * 100}%`
    addCard(`<i style="background:${TOPICS[r.k].color}"></i>${esc(r.n)}`)
    await wait(gap)
  }

  try {
    await type('October is Hacktober.', 700)
    await type('So I was already shipping...', 500)
    await type('typing every prompt.', 300)
    for (let i = 0; i < pivot; i++) {
      setDay(i)
      for (const r of days[i].repos) await land(i, r, 520)
      await wait(260)
    }

    cards.replaceChildren()
    show.classList.add('talk')
    $('#s-mode').textContent = 'Talking · Wispr Flow'
    setDay(pivot)
    await say(`${dateText(WISPR_DAY)}. *Wispr *Flow comes in.`, 1600)
    await say('Now I just *talk.', 400)

    for (let i = pivot; i < DAYS; i++) {
      setDay(i)
      for (const r of days[i].repos) await land(i, r, 200)
      for (const v of VIDEOS.filter((x) => x.c === days[i].date)) {
        addCard(`▶ ${esc(v.t.length > 46 ? v.t.slice(0, 44) + '…' : v.t)}`, 'video')
        await wait(480)
      }
      await wait(200)
    }

    cards.replaceChildren()
    await say(`!${times} faster, by voice.`, 600)
    const f = el(
      'div',
      'finale',
      [
        [times, 'faster'],
        [`${b.projects} → ${a.projects}`, 'projects'],
        [`${b.videos} → ${a.videos}`, 'videos'],
        [fmt(FLOW.words), 'words dictated'],
      ]
        .map(([v, l], i) => `<div style="--d:${i * 0.18}s"><b>${v}</b><span>${l}</span></div>`)
        .join(''),
    )
    cards.append(f)
    await wait(3200)
    await say('October 2026: *done.', 2000)
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

$('#play').addEventListener('click', playMonth)
$('#play-nav').addEventListener('click', playMonth)
$('#s-close').addEventListener('click', closeShow)
$('#s-pause').addEventListener('click', (e) => {
  if (e.target.textContent === 'Replay') return playMonth()
  paused = !paused
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
