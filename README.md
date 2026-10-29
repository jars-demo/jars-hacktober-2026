# Thirty-two projects in thirty days

**The JARS DEMO October, 2026, as an interactive sky chart.** Live at [hacktober2026.jishanahmed.in](https://hacktober2026.jishanahmed.in).

![Thirty-two projects in thirty days: the JARS DEMO sky chart](public/og.png)

Between 30 September and 29 October 2026, the [JARS DEMO](https://github.com/jars-demo) organization went from nothing to 32 public projects and 63 agent skills. This page plots each project as a star on the day its repository was created, and groups them by topic into constellations.

## What you can do

- **Watch the month.** A full-screen show of about a minute and a half: the camera flies to each new star as it is born, a caption introduces every project, the date and count tick up, constellations light up as they complete, and it ends with a meteor shower and the totals. Pause with Space, leave with Esc. Nine projects arrived on 17 October alone.
- **Scrub the timeline.** The bars under the chart show how many projects were created each day. Hover for the count, click to jump.
- **Filter by topic.** The topic chips highlight one constellation and filter the project table. Search the table by name, description or language.
- **Chart the sky.** Open a star to see what the project is, with links to its repository and site. Every star you open is charted.
- **Earn the badges.** Twelve of them: one for each topic, one for finding the busiest day, one for playing the whole month and one for charting all 32 stars.

Arrow keys move between stars, the sound can be turned off, and motion respects the reduced-motion setting. Progress is kept in your browser only.

## The topics

| Topic             | Constellation | Projects |
| ----------------- | ------------- | -------: |
| AI & agents       | Machina       |        5 |
| Data & databases  | Tabula        |        5 |
| Backend & APIs    | Servitor      |        6 |
| Security          | Clipeus       |        3 |
| DevOps & delivery | Navis         |        4 |
| Foundations       | Fundamentum   |        5 |
| Developer tools   | Instrumentum  |        3 |
| Agent skills      | Codex         |        1 |

Topic colours are the eight-slot categorical palette for dark surfaces, checked for colour-blind separation and contrast, and always shown next to the topic's name. Each star also gets a designation in the old atlas style, in order of appearance: a constellation's first star is α, its second β. The cluster around the agent skills star has one point for each skill in [jars-skills](https://github.com/jars-demo/jars-skills).

## The sound

Every sound is synthesised in the browser with the Web Audio API: there are no audio files. Each star has its own note, taken from the A minor pentatonic scale, so any projects created on the same day still sound good together. A low drone moves through Am, F, C and G, one chord a week; a sparkle marks each finished constellation and a short arpeggio each badge.

## Run it locally

It is a static site with no build step and no dependencies. Serve the `public` folder with any static server:

```bash
npm start                         # or: python -m http.server -d public 8000
npm test                          # Node's built-in test runner, Node 20 or later
```

The page uses ES modules, so open it through a server, not as a file.

## Layout

```text
public/index.html        the page
public/favicon.*         favicon (SVG and ICO), plus apple-touch-icon.png, icon-192/512.png and site.webmanifest
public/og.png            the 1200 x 630 share image
public/assets/data.js    the 32 repositories, from the GitHub API on 29 October 2026
public/assets/model.js   positions, names, notes and badges: pure functions, tested
public/assets/audio.js   the synthesised sound
public/assets/app.js     drawing, playback, progress and badges
tests/model.test.mjs     data and model checks
vercel.json              static hosting, clean URLs and security headers
```

## Deploy

Import the repository in [Vercel](https://vercel.com/new) and deploy. The root `vercel.json` runs the tests as the build and serves `public/`, with clean URLs, a content security policy and the other security headers. There are no settings to change. To use the custom domain, add `hacktober2026.jishanahmed.in` to the project and point a `CNAME` record at Vercel.

## License

[MIT](LICENSE) © 2026 Jishanahmed AR Shaikh. Fonts are loaded from Google Fonts under the SIL Open Font License.

An independent project, not affiliated with Hacktoberfest or DigitalOcean.
