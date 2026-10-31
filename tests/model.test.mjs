import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { REPOS, SNAPSHOT, TOPICS, VIDEOS } from '../public/assets/data.js'
import { FLOW, WISPR_DAY } from '../public/assets/flow.js'
import { DAYS, byDay, dateText, dayIndex, matches, split, ytId } from '../public/assets/model.js'

test('the data has 32 distinct repositories, each in a known topic', () => {
  assert.equal(REPOS.length, 32)
  assert.equal(new Set(REPOS.map((r) => r.n)).size, 32)
  for (const r of REPOS) {
    assert.ok(TOPICS[r.k], `${r.n} has an unknown topic ${r.k}`)
    assert.ok(r.d.length > 20, `${r.n} needs a description`)
    assert.ok(!r.h || r.h.startsWith('https://'), `${r.n} homepage must be https`)
    assert.ok(!r.v || ytId(r.v), `${r.n} demo video must be a YouTube link`)
  }
  assert.equal(SNAPSHOT, '2026-10-31')
})

test('the month is 32 days, split into two halves of 16 at the Wispr Flow day', () => {
  assert.equal(DAYS, 32)
  assert.equal(dateText('2026-09-30'), '30 Sep')
  assert.equal(dayIndex(WISPR_DAY), 16)
  const days = byDay(REPOS)
  assert.equal(days.reduce((n, d) => n + d.repos.length, 0), REPOS.length)
  const { before, after, times } = split(REPOS, VIDEOS, WISPR_DAY)
  assert.equal(before.days, 16)
  assert.equal(after.days, 16)
  assert.equal(before.projects + after.projects, REPOS.length)
  assert.deepEqual([before.projects, after.projects], [8, 24])
  assert.deepEqual([before.videos, after.videos], [0, VIDEOS.length])
  assert.equal(Math.round(times), 3)
})

test('videos have real ids and link to known repositories', () => {
  for (const v of VIDEOS) {
    assert.match(v.id, /^[\w-]{11}$/)
    assert.ok(!v.r || REPOS.some((r) => r.n === v.r), `${v.t} points at an unknown repo`)
  }
  assert.equal(ytId('https://youtu.be/fztHxrgbt3Q'), 'fztHxrgbt3Q')
  assert.equal(ytId('https://git.jishanahmed.in'), null)
})

test('the project filter matches topic and text', () => {
  const r = REPOS.find((x) => x.n === 'git-demo')
  assert.ok(matches(r, '', ''))
  assert.ok(matches(r, 'found', 'rebase'))
  assert.ok(!matches(r, 'ai', ''))
  assert.ok(!matches(r, '', 'kubernetes-operator'))
})

test('the usage cards are in place', () => {
  assert.ok(FLOW.words > 0 && FLOW.wpm > 0)
  assert.equal(FLOW.cards.length, 3)
  for (const c of FLOW.cards) assert.ok(existsSync(new URL(`../public/${c.src}`, import.meta.url)), c.src)
})
