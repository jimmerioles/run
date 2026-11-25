# Run

A one-screen landing page for a terminal agent that fixes a repo in one command.

**Live demo:** https://jimmerioles.github.io/run/

https://github.com/user-attachments/assets/104e0d0e-204b-4f39-a171-8b0b7e124db8

Run is a front-end prototype for a terminal-native coding agent, aimed at people building or evaluating agent UIs. The page has no hero image or feature grid: the terminal is the demo, and one key press drives it. The run is scripted, but the state machine, canvas robots, synthesized sound, and pause behavior are fully implemented.

The explainer starts muted; unmute for the narration.

## Key features

- One interaction: `Enter` or **Run the demo**. No carousel, scroll trick, or second ask.
- A CRT-inspired terminal stage: near-black glass, phosphor lime, scanlines, a vignette, and JetBrains Mono.
- Four checks (`types`, `lint`, `tests`, `build`) move from waiting to working to fixed, with live counts and a final result panel.
- Canvas robots spawn from the caret, follow curved paths, spark while working, and pop a checkmark.
- Sound is synthesized in the browser with Web Audio, starts only after a gesture, and has a persistent mute toggle. No audio files.
- Reduced motion hides the canvas and keeps every status change.
- The run pauses when the tab is hidden or the terminal scrolls out of view.
- Responsive from 390×844 to desktop, with real buttons, visible focus, and `Enter` to start or replay.

## Run it

```bash
npm install
npm run dev
npm run build
npm run preview
```

Open the URL Vite prints (defaults to `http://localhost:5173`). `npm run build` runs `tsc` and writes `dist/`; `npm run preview` serves that build.

## Use it

- Press `Enter` or click **Run the demo**. The sequence runs in about 10 seconds; the terminal reports `2m 14s`.
- Click the install row to copy `npm i -g run`. The command is a prop; this project does not publish a CLI.
- Use the speaker button to unmute. Sound starts only after a gesture.

## How it works

`src/main.ts` runs an abortable async sequence on a pause-aware frame clock. The same clock advances the canvas scene in `src/robots.ts`, the sequence triggers the Web Audio cues in `src/audio.ts`, and the four tasks come from a scripted data array. See [ARCHITECTURE.md](ARCHITECTURE.md) for the state machine, canvas layer, pause behavior, and audio graph.

## Tests

No automated suite yet. `npm run build` is the current check: `tsc` plus the production build.

## Status

Prototype. The run is scripted, and the page's Docs and GitHub links are placeholders.

## Credits and license

Built by [@jimmerioles](https://github.com/jimmerioles). Explainer score by Vincent Schmalbach (MIT). Production notes for the film live in [docs/explainer](docs/explainer).

License: no license file yet. Ask before reusing the code.
