# Thirty-two stars in thirty nights

**The JARS DEMO October, 2026, as a sky chart you can play.** Live at [hacktober2026.jishanahmed.in](https://hacktober2026.jishanahmed.in).

![The sky chart: eight constellations of JARS DEMO projects](public/og.png)

Between 30 September and 29 October 2026, the [JARS DEMO](https://github.com/jars-demo) organization went from nothing to 32 public projects and 63 agent skills. This page plots each project as a star, on the night its repository was created, and groups them into constellations by what they teach.

## What you can do

- **Play the month.** Watch the sky fill night by night, with a bell for every new star. Seventeen projects arrived on 17 and 18 October alone.
- **Scrub through the nights.** The histogram under the chart shows how many stars were born each night.
- **Chart the sky.** Open a star to read what the project is, with links to its repository and site. Each star you open is charted.
- **Earn the badges.** Twelve of them: one for each constellation, one for the busiest night, one for playing the month through and one for charting all 32 stars.

Arrow keys move between stars, and the sound can be turned off. Progress is kept in your browser only.

## The constellations

| Constellation | Topic               | Stars |
| ------------- | ------------------- | ----: |
| Machina       | AI and agents       |     5 |
| Tabula        | Data and databases  |     5 |
| Servitor      | Backend and APIs    |     6 |
| Clipeus       | Security            |     3 |
| Navis         | DevOps and delivery |     4 |
| Fundamentum   | Foundations         |     5 |
| Instrumentum  | Developer tools     |     3 |
| Codex         | 63 agent skills     |     1 |

Greek letters follow the old atlas rule, in order of appearance: a constellation's first star is α, its second β. The cluster around Codex has one point for each skill in [jars-skills](https://github.com/jars-demo/jars-skills).

## The sound

Every sound is synthesised in the browser with the Web Audio API: there are no audio files. Each star has its own note, taken from the A minor pentatonic scale, so any stars born on the same night still sound good together. A low drone plays under the month, and a short arpeggio marks each badge.

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
