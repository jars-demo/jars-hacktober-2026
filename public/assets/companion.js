// JARS, the jar of stars who keeps you company. The lines are plain text, never HTML.

export const TIPS = [
  'Press Play the month to watch October happen, one night at a time.',
  'Pick a topic chip to light up just that constellation.',
  'Drag the timeline to see the sky on any night.',
  'Select a star to chart it. Arrow keys hop between stars.',
  'The project table filters by topic, language and links, ten projects a page.',
  'Set Links to Demo video to find the projects with a video.',
  'Your progress stays in this browser. Nothing leaves it.',
  'I hold 32 projects and 63 agent skills. Heavy jar.',
]

export function jarsLine(event, ctx = {}) {
  const left = ctx.total - ctx.charted
  switch (event) {
    case 'hello':
      if (!ctx.charted) return "Hi, I'm JARS. I keep October's stars in a jar. Select one to chart it."
      if (!left) return `Welcome back. All ${ctx.total} stars charted. Show-off.`
      return `Welcome back. ${ctx.charted} of ${ctx.total} charted, ${left} to go.`
    case 'chart':
      if (!left) return `That's all ${ctx.total}. The whole month is in the jar!`
      return `${ctx.name} is ${ctx.bayer}. ${left} to go.`
    case 'badge':
      return `Badge earned: ${ctx.name}. Shiny!`
    case 'empty':
      return 'Nothing matches. Try clearing the filters.'
    case 'tip':
      return TIPS[((ctx.i % TIPS.length) + TIPS.length) % TIPS.length]
    default:
      return ''
  }
}

// Wires up the #jars markup: click the jar for a tip, close the bubble to hush it.
export function mountJars() {
  const root = document.getElementById('jars')
  const bubble = root.querySelector('.jars-say')
  const text = bubble.querySelector('p')
  const level = root.querySelector('.jars-level')
  let timer = null
  let tip = 0

  function say(line, ms = 6000) {
    if (!line) return
    text.textContent = line
    bubble.hidden = false
    clearTimeout(timer)
    timer = setTimeout(() => (bubble.hidden = true), ms)
  }
  function cheer() {
    root.classList.remove('cheer')
    void root.getBoundingClientRect()
    root.classList.add('cheer')
  }
  // How full the jar looks: the share of stars charted, from the bottom up.
  function fill(share) {
    const h = 30 * Math.min(1, Math.max(0, share))
    level.setAttribute('y', String(50 - h))
    level.setAttribute('height', String(h))
  }

  root.querySelector('.jars-btn').addEventListener('click', () => say(jarsLine('tip', { i: tip++ }), 9000))
  root.querySelector('.jars-hush').addEventListener('click', () => {
    clearTimeout(timer)
    bubble.hidden = true
  })
  root.hidden = false
  return { say, cheer, fill }
}
