// Pure chart logic: where each star sits, what it is called, how it sounds and what earns a badge.
// No DOM here, so the tests can import it with plain Node.

export const START = Date.UTC(2026, 8, 30) // 30 Sep 2026, the first night
export const DAYS = 30
export const SKILLS = 63

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ']

// One constellation per topic, laid out on a 100 x 58 plate. Colours are the validated eight-slot
// categorical palette for dark surfaces, in fixed order. The Latin names give each star its
// designation in the old atlas style.
export const CONSTELLATIONS = {
  ai: { label: 'AI & agents', color: '#3987e5', name: 'Machina', gen: 'Machinae', x: 17, y: 15 },
  data: { label: 'Data & databases', color: '#d95926', name: 'Tabula', gen: 'Tabulae', x: 42, y: 12 },
  backend: { label: 'Backend & APIs', color: '#199e70', name: 'Servitor', gen: 'Servitoris', x: 66, y: 16 },
  sec: { label: 'Security', color: '#c98500', name: 'Clipeus', gen: 'Clipei', x: 88, y: 12 },
  ops: { label: 'DevOps & delivery', color: '#d55181', name: 'Navis', gen: 'Navis', x: 14, y: 42 },
  found: { label: 'Foundations', color: '#008300', name: 'Fundamentum', gen: 'Fundamenti', x: 39, y: 42 },
  tools: { label: 'Developer tools', color: '#9085e9', name: 'Instrumentum', gen: 'Instrumenti', x: 63, y: 41 },
  skills: { label: 'Agent skills', color: '#e66767', name: 'Codex', gen: 'Codicis', x: 86, y: 40 },
}

// Offsets from a constellation's centre, in order of birth.
export const SHAPE = [
  [-6, -2],
  [0, -5],
  [6, -1],
  [3, 5],
  [-3, 6],
  [9, 4],
]

// A minor pentatonic from A3: any notes played together still sound good.
const SCALE = [0, 3, 5, 7, 10]
export const noteOf = (step) => 57 + 12 * Math.floor(step / SCALE.length) + SCALE[step % SCALE.length]

export const dayOf = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - START) / 86400000)

export function dateText(day) {
  const d = new Date(START + day * 86400000)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export function chart(repos) {
  const keys = Object.keys(CONSTELLATIONS)
  const stars = repos
    .map((r) => ({ ...r, day: dayOf(r.c) }))
    .sort((a, b) => a.c.localeCompare(b.c) || a.n.localeCompare(b.n))
  const groups = {}
  for (const s of stars) (groups[s.k] ||= []).push(s)
  for (const [k, list] of Object.entries(groups)) {
    const con = CONSTELLATIONS[k]
    list.forEach((s, i) => {
      const [dx, dy] = list.length === 1 ? [0, 0] : SHAPE[i]
      Object.assign(s, {
        con,
        x: con.x + dx,
        y: con.y + dy,
        bayer: `${GREEK[i]} ${con.gen}`,
        note: noteOf(keys.indexOf(k) + i),
        prev: list[i - 1] || null,
      })
    })
  }
  const perDay = Array.from({ length: DAYS }, (_, d) => stars.filter((s) => s.day === d).length)
  return {
    stars,
    groups,
    perDay,
    peak: Math.max(...perDay),
    newestDay: Math.max(...stars.map((s) => s.day)),
  }
}

export function achievementList(groups, total) {
  const constellations = Object.keys(CONSTELLATIONS)
    .filter((k) => groups[k])
    .map((k) => {
      const { name, label } = CONSTELLATIONS[k]
      const count = groups[k].length
      return {
        id: `con-${k}`,
        name,
        topic: k,
        hint: count === 1 ? `Open the ${label.toLowerCase()} star.` : `Open all ${count} ${label} stars.`,
      }
    })
  return [
    { id: 'first', name: 'First light', hint: 'Open any star on the chart.' },
    { id: 'month', name: 'Thirty nights', hint: 'Play the month through to the last day.' },
    { id: 'peak', name: 'Busiest day', hint: 'Find the day the most projects were created.' },
    ...constellations,
    { id: 'all', name: 'Cartographer', hint: `Open all ${total} stars.` },
  ]
}

// progress: { charted: Set of repo names, month: boolean, peak: boolean }
export function earnedIds(progress, groups) {
  const { charted } = progress
  const lists = Object.entries(groups)
  const ids = []
  if (lists.some(([, list]) => list.some((s) => charted.has(s.n)))) ids.push('first')
  if (progress.month) ids.push('month')
  if (progress.peak) ids.push('peak')
  for (const [k, list] of lists) if (list.every((s) => charted.has(s.n))) ids.push(`con-${k}`)
  if (lists.every(([, list]) => list.every((s) => charted.has(s.n)))) ids.push('all')
  return ids
}
