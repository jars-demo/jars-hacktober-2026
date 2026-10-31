// Pure page logic: the days of the month, the before and after split and the project filter.
// No DOM here, so the tests can import it with plain Node.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY = 86400000

// The month runs from 30 September, when the first project landed, to 31 October: 32 days,
// split into two equal halves of 16 days either side of the day Wispr Flow came in.
export const START = '2026-09-30'
export const END = '2026-10-31'

const ms = (iso) => Date.parse(iso + 'T00:00:00Z')
export const DAYS = (ms(END) - ms(START)) / DAY + 1

export const dateOf = (i) => new Date(ms(START) + i * DAY).toISOString().slice(0, 10)
export const dayIndex = (iso) => (ms(iso) - ms(START)) / DAY
export const dateText = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`

// The projects created on each day of the month, oldest first.
export const byDay = (repos) => {
  const days = Array.from({ length: DAYS }, (_, i) => ({ date: dateOf(i), repos: [] }))
  for (const r of [...repos].sort((a, b) => a.c.localeCompare(b.c))) {
    const i = dayIndex(r.c)
    if (i >= 0 && i < DAYS) days[i].repos.push(r)
  }
  return days
}

// Before and after the given day: projects, videos and the pace per day.
export const split = (repos, videos, pivot) => {
  const half = (from, to) => {
    const days = dayIndex(to) - dayIndex(from) + 1
    const projects = repos.filter((r) => r.c >= from && r.c <= to).length
    const vids = videos.filter((v) => v.c >= from && v.c <= to).length
    return { from, to, days, projects, videos: vids, pace: projects / days }
  }
  const before = half(START, dateOf(dayIndex(pivot) - 1))
  const after = half(pivot, END)
  return { before, after, times: after.pace / before.pace }
}

// A project matches when it is in the topic (or no topic is chosen) and the query appears in its
// name, description or language.
export const matches = (r, topic, query) => {
  if (topic && r.k !== topic) return false
  const q = query.trim().toLowerCase()
  return !q || [r.n, r.d, r.l].some((s) => (s || '').toLowerCase().includes(q))
}

export const ytId = (url) => (url || '').match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1] || null
export const fmt = (n) => n.toLocaleString('en-US')
