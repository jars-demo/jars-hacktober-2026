// The page: hero numbers, before and after, the spike chart, videos, how I build, the project grid
// and the played month.
import { REPOS, SNAPSHOT, TOPICS, VIDEOS } from './data.js'
import { FLOW, WISPR_DAY } from './flow.js'
import { DAYS, byDay, dateText, dayIndex, fmt, matches, split, ytId } from './model.js'
import * as sound from './sound.js'

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
const pivot = dayIndex(WISPR_DAY)
const times = `${Math.round(sp.times)}×`
const max = Math.max(...days.map((d) => d.repos.length))

// Hero
document.querySelectorAll('[data-times]').forEach((e) => (e.textContent = times))
$('#hero-stats').innerHTML = [
  [REPOS.length, 'Projects shipped'],
  [VIDEOS.length, 'Videos published'],
  [fmt(FLOW.words), 'Words dictated'],
  [FLOW.wpm, 'Words per minute'],
]
  .map(([n, l]) => `<div><dd>${n}</dd><dt>${l}</dt></div>`)
  .join('')

// Before and after
const side = (h, cls, when, rows) =>
  `<div class="side ${cls} reveal"><p class="tag">${cls === 'after' ? 'Talking' : 'Typing'}</p><h3>${h}</h3>
   <p class="when">${when}</p><ul>${rows.map(([l, v]) => `<li><span>${l}</span><b>${v}</b></li>`).join('')}</ul></div>`
const { before: b, after: a } = sp
$('#versus').innerHTML =
  side('Already shipping', 'before', `${dateText(b.from)} – ${dateText(b.to)} · ${b.days} days`, [
    ['Projects', b.projects],
    ['Videos', b.videos],
    ['Projects a day', b.pace.toFixed(1)],
  ]) +
  `<div class="times reveal">${times}<small>faster</small></div>` +
  side('With Wispr Flow', 'after', `${dateText(a.from)} – ${dateText(a.to)} · ${a.days} days`, [
    ['Projects', a.projects],
    ['Videos', a.videos],
    ['Projects a day', a.pace.toFixed(1)],
  ])

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
  if ([0, pivot, DAYS - 1].includes(i)) btn.classList.add('label')
  btn.setAttribute('aria-label', `${dateText(d.date)}: ${d.repos.length} projects`)
  btn.innerHTML = `<i style="height:${(d.repos.length / max) * 100}%;transition-delay:${i * 28}ms"></i><small>${
    i % 4 === 0 || i === pivot || i === DAYS - 1 ? dateText(d.date) : ''
  }</small>`
  btn.addEventListener('click', () => {
    chart.querySelectorAll('[aria-pressed]').forEach((x) => x.removeAttribute('aria-pressed'))
    btn.setAttribute('aria-pressed', 'true')
    sound.play('tick')
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
    sound.stopBed()
    const f = el('iframe')
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    f.title = box.dataset.title
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    f.allowFullscreen = true
    box.replaceChildren(f)
  })
  box.append(btn)
}
const repoOf = (n) => REPOS.find((r) => r.n === n)
$('#vid-grid').innerHTML = VIDEOS.map((v) => {
  const r = v.r && repoOf(v.r)
  return `<article class="vid reveal"><div class="yt" data-yt="${v.id}" data-title="${esc(v.t)}"></div>
    <p class="k">${v.k} · ${dateText(v.c)}</p><p class="t">${esc(v.t)}</p>
    ${r && r.h && !ytId(r.h) ? `<p class="d"><a href="${r.h}">Try the project</a></p>` : ''}</article>`
}).join('')
document.querySelectorAll('.yt').forEach(lite)

// How I build
const STEPS = [
  ['I talk the spec sheet out', true],
  ['I talk the coding agent through it, with that spec', true],
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
  ([t, v]) => `<li class="${v ? 'voice' : ''}"><span>${t}</span>${v ? '<span class="mic">🎙 Wispr Flow</span>' : ''}</li>`,
).join('')

// Projects
let topic = ''
const chips = $('#chips')
const chip = (k, label, color) => {
  const c = el('button', '', `${color ? `<i style="background:${color}"></i>` : ''}${label}`)
  c.type = 'button'
  c.setAttribute('aria-pressed', String(k === topic))
  c.addEventListener('click', () => {
    topic = k
    chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === c)))
    sound.play('tick')
    renderProjects()
  })
  return c
}
chips.append(chip('', 'All'))
for (const [k, t] of Object.entries(TOPICS)) if (REPOS.some((r) => r.k === k)) chips.append(chip(k, t.label, t.color))
const q = $('#q')
q.addEventListener('input', () => renderProjects())
const sorted = [...REPOS].sort((x, y) => y.c.localeCompare(x.c) || x.n.localeCompare(y.n))
function renderProjects() {
  const list = sorted.filter((r) => matches(r, topic, q.value))
  $('#proj-grid').innerHTML = list
    .map((r) => {
      const t = TOPICS[r.k]
      const video = r.v || (ytId(r.h) ? r.h : null)
      const site = r.h && !ytId(r.h) ? r.h : null
      return `<article class="proj"><div class="meta"><i style="background:${t.color}"></i>${t.label} · ${dateText(r.c)}${
        r.c >= WISPR_DAY ? '<span class="voice">🎙 By voice</span>' : ''
      }</div><h3>${esc(r.n)}</h3><p>${esc(r.d)}</p><p class="links">${site ? `<a href="${site}">Live</a>` : ''}<a href="https://github.com/jars-demo/${r.n}">Code</a>${
        video ? `<a href="${video}">Video</a>` : ''
      }</p></article>`
    })
    .join('')
  $('#empty').hidden = list.length > 0
  $('#proj-count').textContent = `${list.length} of ${REPOS.length} projects, newest first. ${a.projects} of them were built by voice.`
}
renderProjects()

// Wispr Flow usage
document.querySelectorAll('[data-words]').forEach((e) => (e.textContent = fmt(FLOW.words)))
$('#flow-line').textContent = `${FLOW.wpm} words a minute, across ${FLOW.apps} apps, with a ${FLOW.streak}-day streak. Specs, prompts, corrections, scripts, posts: if I wrote it this month, I said it first.`
const card = $('#flow-card')
card.src = FLOW.card
card.alt = `My Wispr Flow usage card: ${fmt(FLOW.words)} words dictated, ${FLOW.wpm} words per minute, ${FLOW.apps} apps, ${FLOW.streak}-day streak`
$('#asof').textContent = dateText(FLOW.asOf > SNAPSHOT ? FLOW.asOf : SNAPSHOT) + ' 2026'

// Scroll reveal
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      e.target.classList.add('in')
      if (e.target === chart) sound.play('whoosh', { volume: 0.6 })
      io.unobserve(e.target)
    }
  },
  { threshold: 0.18 },
)
document.querySelectorAll('.reveal, #chart').forEach((e) => (reduced ? e.classList.add('in') : io.observe(e)))

// Sound toggle
const soundBtn = $('#sound')
const showSound = () => {
  soundBtn.setAttribute('aria-pressed', String(sound.enabled))
  soundBtn.querySelector('.label').textContent = sound.enabled ? 'Sound on' : 'Sound off'
  $('#s-sound').textContent = sound.enabled ? 'Sound on' : 'Sound off'
}
const toggleSound = async () => {
  await sound.setEnabled(!sound.enabled)
  showSound()
  sound.play('pop')
  if (!show.hidden) sound.enabled ? sound.startBed() : sound.stopBed()
}
soundBtn.addEventListener('click', toggleSound)
showSound()

// The played month
const show = $('#show')
const cap = $('#s-cap')
const cards = $('#s-cards')
const bars = $('#s-bars')
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

const caption = async (html, hold = 0) => {
  cap.classList.add('out')
  await wait(280)
  cap.innerHTML = html
  cap.classList.remove('out')
  if (hold) await wait(hold)
}
const addCard = (html, cls = '') => {
  const all = cards.querySelectorAll('.show-card:not(.gone)')
  if (all.length >= 14) all[0].remove()
  cards.querySelectorAll('.show-card').forEach((c) => c.classList.add('old'))
  cards.append(el('div', `show-card ${cls}`, html))
}
const setDay = (i) => {
  $('#s-date').textContent = dateText(days[i].date)
  bars.querySelectorAll('i').forEach((b, j) => b.classList.toggle('today', j === i))
}

async function playMonth() {
  const id = ++run
  paused = false
  $('#s-pause').textContent = 'Pause'
  show.hidden = false
  show.classList.remove('wispr')
  document.body.style.overflow = 'hidden'
  cards.replaceChildren()
  bars.innerHTML = days.map((_, i) => `<i class="${i >= pivot ? 'after' : ''}"></i>`).join('')
  const barEls = [...bars.children]
  let count = 0
  const start = performance.now()
  const total = 44000
  const prog = $('#s-prog')
  const progress = () => {
    if (id !== run) return
    prog.style.width = `${Math.min(100, ((performance.now() - start) / total) * 100)}%`
    requestAnimationFrame(progress)
  }
  requestAnimationFrame(progress)
  $('#s-count').textContent = '0'
  sound.startBed()
  sound.play('whoosh')

  try {
    await caption('October is <em>Hacktober.</em>', 2000)
    await caption('So I was already shipping.', 1400)
    await caption('Typing every prompt.')
    for (let i = 0; i < pivot; i++) {
      setDay(i)
      for (const r of days[i].repos) {
        count++
        $('#s-count').textContent = count
        barEls[i].style.height = `${(days[i].repos.length / max) * 100}%`
        addCard(`<i style="background:${TOPICS[r.k].color}"></i>${esc(r.n)}`)
        sound.play('pop', { rate: 0.9 })
        await wait(420)
      }
      await wait(320)
    }

    cards.querySelectorAll('.show-card').forEach((c) => c.remove())
    show.classList.add('wispr')
    setDay(pivot)
    sound.play('reveal')
    await caption(`${dateText(WISPR_DAY)}. <em>Wispr Flow</em> comes in.`, 2400)
    await caption('Now I just <em>talk.</em>')

    for (let i = pivot; i < DAYS; i++) {
      setDay(i)
      for (const r of days[i].repos) {
        count++
        $('#s-count').textContent = count
        barEls[i].style.height = `${(days[i].repos.length / max) * 100}%`
        addCard(`<i style="background:${TOPICS[r.k].color}"></i>${esc(r.n)}`)
        sound.play('pop', { rate: 1.1 })
        await wait(230)
      }
      for (const v of VIDEOS.filter((x) => x.c === days[i].date)) {
        addCard(`▶ ${esc(v.t.length > 46 ? v.t.slice(0, 44) + '…' : v.t)}`, 'video')
        sound.play('tick')
        await wait(520)
      }
      await wait(240)
    }

    cards.replaceChildren(el('div', 'big', times))
    sound.play('finale')
    await caption('faster, by voice.', 2600)
    cards.append(
      el(
        'div',
        'finale',
        `<div><b>${b.projects} → ${a.projects}</b><span>projects</span></div>
         <div><b>${b.videos} → ${a.videos}</b><span>videos</span></div>
         <div><b>${fmt(FLOW.words)}</b><span>words dictated</span></div>`,
      ),
    )
    await wait(3400)
    await caption('October 2026: <em>done.</em>', 3000)
    sound.stopBed()
    $('#s-pause').textContent = 'Replay'
  } catch {
    // Closed or replayed mid-way.
  }
}

function closeShow() {
  run++
  sound.stopBed()
  show.hidden = true
  document.body.style.overflow = ''
  $('#play').focus()
}

// Playing the month turns the sound on: it is made to be heard, and the mute is one tap away.
$('#play').addEventListener('click', async () => {
  if (!sound.enabled) await sound.setEnabled(true)
  else await sound.unlock()
  showSound()
  playMonth()
})
$('#s-close').addEventListener('click', closeShow)
$('#s-sound').addEventListener('click', toggleSound)
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
// Restore the sound setting on first interaction (browsers need a tap before audio can start).
if (sound.enabled) addEventListener('pointerdown', () => sound.unlock(), { once: true })
