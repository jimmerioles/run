# Architecture

Run is a static Vite and TypeScript project with no UI framework. The build has two HTML entry points: the demo and the case study. The demo is one HTML file, one stylesheet, and three modules.

```
index.html              demo shell and terminal structure
src/main.ts             task data, run state machine, DOM updates, frame loop
src/robots.ts           canvas scene, robot paths, particles, dust
src/audio.ts            Web Audio graph and synthesized sounds
src/style.css           demo layout, terminal styling, motion, responsive rules
src/theme.css           shared color, type, and easing tokens
case-study/index.html   static case study document
src/case-study.css      case study layout and typography
tests/demo.spec.ts      Playwright smoke tests for the run contract
playwright.config.ts    preview server and browser settings for the suite
```

## Run state machine

`src/main.ts` owns the demo. A run moves through four phases:

```
idle -> typing -> running -> complete
```

Each of the four tasks (`types`, `lint`, `tests`, `build`) moves through `waiting`, `working`, and `fixed`. Task data lives in a single `TASKS` array with labels, detail beats, durations, fix counts, and completion text. The result time (`2m 14s`) is part of the narrative, not wall-clock time; the choreography takes about ten seconds.

`startRun()` aborts any active run, resets the UI, types `run fix --all`, then runs each task sequentially. Every pause goes through `wait()`, which resolves from a frame-clock queue instead of `setTimeout`. One `requestAnimationFrame` loop advances both the queue and the canvas. The loop stops when the tab is hidden or the terminal leaves the viewport, so the demo pauses instead of skipping ahead.

## Canvas scene

`src/robots.ts` draws a DPR-scaled Canvas 2D layer over the terminal. A `ResizeObserver` keeps the backing store in sync with the screen.

A robot stores a cubic Bezier path from the command caret to its task row. Its life is split into `spawn`, `travel`, `work`, `celebrate`, and `exit`. While working it bobs, blinks on a staggered cycle, and emits sparks. Finishing a task adds a checkmark particle and an expanding ring. The scene also draws ambient dust and short-lived trail and spark particles, capped at 360.

When reduced motion is active, the scene clears its robots and particles and stops drawing. The DOM status changes still run.

## Audio

`src/audio.ts` creates an `AudioContext` only after a user gesture. The graph is a master gain into a dynamics compressor, then the destination.

Key clicks and spark ticks use a short noise buffer through a bandpass filter. Spawn blips, task pings, and the final chord use oscillators with short gain envelopes. There are no audio files. The mute toggle sets the master gain and stores the preference in `localStorage`.

## Case study

`case-study/index.html` is a static long-form document with no JavaScript. It uses the same theme tokens as the demo, reuses the screenshots in `docs/`, and links back to the demo. The page has its own Vite entry and stylesheet, so the landing page does not load its content or assets. It is meant to stay readable when the demo cannot run.

## Input and accessibility

`Enter` starts or replays a run unless the event target is a button, link, input, textarea, select, or editable element. Modified Enter presses are ignored. The visible Run and Replay controls are real buttons with focus states.

The task list has list semantics, the progress meter exposes `aria-valuenow` and `aria-valuetext`, and status changes are announced through a polite live region. The layout has breakpoints at 1180, 980, 600, and 370 pixels plus a short desktop viewport rule. `prefers-reduced-motion` is handled in both CSS and the canvas scene.

## Build and deploy

```bash
npm install
npm run dev
npm run build
npm run preview
```

`npm run build` runs `tsc` and then the Vite production build. The build writes `dist/index.html` and `dist/case-study/index.html`; `vite.config.ts` lists both HTML entries. `npm test` builds the site and runs the Playwright smoke suite against the preview server. The GitHub Pages workflow in `.github/workflows/deploy-pages.yml` runs the suite on every push to `main` and deploys `dist/` only if it passes.

## Current limits

The task data is scripted. There is no real command runner and no backend. The Playwright suite is a browser smoke test: it checks the run contract and accessibility state, not canvas pixels, audio output, or visual regression. The install row copies a prop command; no CLI is published. The case study is a static document and does not read live demo state.
