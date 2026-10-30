import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { REPOS, SNAPSHOT } from '../public/assets/data.js'
import { TIPS, jarsLine } from '../public/assets/companion.js'
import {
  CONSTELLATIONS,
  DAYS,
  SHAPE,
  achievementList,
  chart,
  clock,
  dateText,
  earnedIds,
  links,
  matches,
  paginate,
  runtime,
} from '../public/assets/model.js'

const sky = chart(REPOS)

test('the data has 32 distinct repositories, each in a known constellation', () => {
  assert.equal(REPOS.length, 32)
  assert.equal(new Set(REPOS.map((r) => r.n)).size, 32)
  for (const r of REPOS) {
    assert.ok(CONSTELLATIONS[r.k], `${r.n} has an unknown constellation ${r.k}`)
    assert.ok(r.d.length > 20, `${r.n} needs a description`)
    assert.ok(!r.h || r.h.startsWith('https://'), `${r.n} homepage must be https`)
    assert.ok(!r.v || r.v.startsWith('https://'), `${r.n} demo video must be https`)
  }
  assert.equal(SNAPSHOT, '2026-10-29')
})

test('every star is born inside the thirty nights', () => {
  for (const s of sky.stars) assert.ok(s.day >= 0 && s.day < DAYS, `${s.n} on day ${s.day}`)
  assert.equal(dateText(0), '30 Sep')
  assert.equal(dateText(DAYS - 1), '29 Oct')
  assert.equal(
    sky.perDay.reduce((a, b) => a + b, 0),
    32,
  )
})

test('every constellation fits its shape, and no two stars overlap', () => {
  for (const list of Object.values(sky.groups)) assert.ok(list.length <= SHAPE.length)
  for (const a of sky.stars) {
    assert.ok(a.x > 2 && a.x < 98 && a.y > 4 && a.y < 50, `${a.n} is off the plate`)
    for (const b of sky.stars) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 3, `${a.n} and ${b.n}`)
  }
})

test('designations are unique and follow birth order', () => {
  assert.equal(new Set(sky.stars.map((s) => s.bayer)).size, 32)
  for (const list of Object.values(sky.groups)) {
    assert.ok(list[0].bayer.startsWith('α'))
    for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].c <= list[i].c)
  }
})

test('every note is in A minor pentatonic, within a comfortable range', () => {
  const scale = new Set([0, 3, 5, 7, 10])
  for (const s of sky.stars) {
    assert.ok(s.note >= 57 && s.note <= 84, `${s.n} note ${s.note}`)
    assert.ok(scale.has((s.note - 57) % 12))
  }
})

test('badges: none at the start, all twelve when everything is done', () => {
  const list = achievementList(sky.groups, 32)
  assert.equal(list.length, 12)
  assert.equal(new Set(list.map((a) => a.id)).size, 12)
  assert.deepEqual(earnedIds({ charted: new Set(), month: false, peak: false }, sky.groups), [])
  const everything = { charted: new Set(REPOS.map((r) => r.n)), month: true, peak: true }
  assert.deepEqual(new Set(earnedIds(everything, sky.groups)), new Set(list.map((a) => a.id)))
})

test('opening one constellation earns its badge, and only that one', () => {
  const tabula = new Set(sky.groups.data.map((s) => s.n))
  const ids = earnedIds({ charted: tabula, month: false, peak: false }, sky.groups)
  assert.deepEqual(ids, ['first', 'con-data'])
})

test('every topic has its own colour and label', () => {
  const all = Object.values(CONSTELLATIONS)
  assert.equal(new Set(all.map((c) => c.color)).size, all.length)
  assert.equal(new Set(all.map((c) => c.label)).size, all.length)
})

test('the page states the same numbers as the data', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
  assert.match(html, /Thirty-two projects in thirty days\./)
  assert.match(html, /32 public repositories/)
  assert.match(html, /each of the 63 skills/)
})

test('every icon the page and manifest name exists', () => {
  const pub = new URL('../public/', import.meta.url)
  const html = readFileSync(new URL('index.html', pub), 'utf8')
  const manifest = JSON.parse(readFileSync(new URL('site.webmanifest', pub), 'utf8'))
  const paths = [...html.matchAll(/(?:href|src)="\/([^"#]+\.(?:svg|png|ico|webmanifest))"/g)].map((m) => m[1])
  paths.push(...manifest.icons.map((i) => i.src.slice(1)))
  assert.ok(paths.length >= 6)
  for (const p of paths) assert.ok(existsSync(new URL(p, pub)), `${p} is missing`)
})

test('the played month runs between one and two minutes', () => {
  const ms = runtime(sky.perDay)
  assert.ok(ms >= 60000 && ms <= 120000, `runtime ${ms} ms`)
  assert.equal(clock(ms), '1:23')
  assert.equal(clock(59600), '1:00')
})

test('links split live sites from demo videos', () => {
  const by = Object.fromEntries(sky.stars.map((s) => [s.n, s]))
  assert.deepEqual(links(by['licensing-demo']), {
    site: 'https://licensing.jishanahmed.in',
    video: 'https://youtu.be/_5gdb-rNVYY',
  })
  assert.deepEqual(links(by['cognee-data-lab']), { site: '', video: 'https://youtu.be/9-4LVBFVDww' })
})

test('the table filters combine topic, language, links and search', () => {
  const count = (view) => sky.stars.filter((s) => matches(s, view)).length
  assert.equal(count({}), 32)
  const langs = [...new Set(sky.stars.map((s) => s.l))]
  assert.equal(langs.reduce((n, lang) => n + count({ lang }), 0), 32)
  assert.equal(count({ kind: 'repo' }), sky.stars.filter((s) => !s.h && !s.v).length)
  assert.ok(sky.stars.filter((s) => matches(s, { kind: 'video' })).some((s) => s.n === 'licensing-demo'))
  assert.equal(count({ topic: 'found', q: 'licensing' }), 1)
  assert.equal(count({ topic: 'found', lang: 'Rust' }), 0)
})

test('pages hold ten rows and stay in range', () => {
  assert.deepEqual(paginate(32, 1), { page: 1, pages: 4, from: 0, to: 10 })
  assert.deepEqual(paginate(32, 4), { page: 4, pages: 4, from: 30, to: 32 })
  assert.deepEqual(paginate(32, 9), { page: 4, pages: 4, from: 30, to: 32 })
  assert.deepEqual(paginate(0, 3), { page: 1, pages: 1, from: 0, to: 0 })
})

test('JARS greets, counts down and cycles tips', () => {
  assert.match(jarsLine('hello', { charted: 0, total: 32 }), /I'm JARS/)
  assert.equal(jarsLine('hello', { charted: 5, total: 32 }), 'Welcome back. 5 of 32 charted, 27 to go.')
  assert.equal(jarsLine('chart', { charted: 2, total: 32, name: 'git-demo', bayer: 'β Fundamentorum' }), 'git-demo is β Fundamentorum. 30 to go.')
  assert.match(jarsLine('chart', { charted: 32, total: 32 }), /whole month/)
  assert.equal(jarsLine('tip', { i: TIPS.length }), TIPS[0])
  assert.equal(jarsLine('nope'), '')
})
