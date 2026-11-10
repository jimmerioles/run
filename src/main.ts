import "./style.css";
import { AudioEngine } from "./audio.ts";
import { RobotScene } from "./robots.ts";

type Phase = "idle" | "typing" | "running" | "complete";
type TaskId = "types" | "lint" | "tests" | "build";
type TaskState = "waiting" | "working" | "fixed";

type DetailBeat = {
  at: number;
  text: string;
};

type Task = {
  id: TaskId;
  label: string;
  meta: string;
  beats: DetailBeat[];
  duration: number;
  fixes: number;
  done: string;
};

const COMMAND = "run fix --all";
const RESULT_TIME = "2m 14s";

const TASKS: Task[] = [
  {
    id: "types",
    label: "types",
    meta: "tsc --noEmit · 214 files",
    beats: [
      { at: 0, text: "checking 214 files…" },
      { at: 0.5, text: "3 errors · 2 files" },
      { at: 0.78, text: "applying patches…" },
    ],
    duration: 1800,
    fixes: 3,
    done: "0 errors · 3 types fixed",
  },
  {
    id: "lint",
    label: "lint",
    meta: "eslint --fix · 96 files",
    beats: [
      { at: 0, text: "scanning 96 files…" },
      { at: 0.55, text: "7 warnings · autofixing" },
      { at: 0.82, text: "re-running lint…" },
    ],
    duration: 1600,
    fixes: 4,
    done: "0 warnings · 4 fixed",
  },
  {
    id: "tests",
    label: "tests",
    meta: "vitest run · 128 tests",
    beats: [
      { at: 0, text: "38 suites · 128 tests" },
      { at: 0.4, text: "2 failing · triaging" },
      { at: 0.68, text: "patching snapshots…" },
      { at: 0.86, text: "128 passing" },
    ],
    duration: 2200,
    fixes: 3,
    done: "128 passed · 3 fixed",
  },
  {
    id: "build",
    label: "build",
    meta: "tsup · production",
    beats: [
      { at: 0, text: "bundling 214 modules…" },
      { at: 0.55, text: "2 import cycles" },
      { at: 0.82, text: "optimizing chunks…" },
    ],
    duration: 1900,
    fixes: 2,
    done: "2 imports fixed · 84.2 kB",
  },
];

const TOTAL_FIXES = TASKS.reduce((total, task) => total + task.fixes, 0);

function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Run: missing ${selector}`);
  return element;
}

const runButton = mustQuery<HTMLButtonElement>("#run-button");
const runLabel = mustQuery<HTMLElement>("#run-label");
const actionHint = mustQuery<HTMLElement>("#action-hint");
const soundButton = mustQuery<HTMLButtonElement>("#sound");
const installButton = mustQuery<HTMLButtonElement>("#install");
const taskList = mustQuery<HTMLElement>("#task-list");
const terminalWindow = mustQuery<HTMLElement>("#terminal-window");
const screen = mustQuery<HTMLElement>("#screen");
const canvas = mustQuery<HTMLCanvasElement>("#robots");
const typed = mustQuery<HTMLElement>("#typed");
const caret = mustQuery<HTMLElement>("#caret");
const commandHintLabel = mustQuery<HTMLElement>("#command-hint span");
const agentText = mustQuery<HTMLElement>("#agent-text");
const termMode = mustQuery<HTMLElement>("#term-mode");
const checksCount = mustQuery<HTMLElement>("#checks-count");
const fixesCount = mustQuery<HTMLElement>("#fixes-count");
const meterFill = mustQuery<HTMLElement>("#meter-fill");
const meterTrack = mustQuery<HTMLElement>("#meter-track");
const result = mustQuery<HTMLElement>("#result");
const resultTitle = mustQuery<HTMLElement>("#result-title");
const resultSub = mustQuery<HTMLElement>("#result-sub");
const replay = mustQuery<HTMLButtonElement>("#replay");
const branch = mustQuery<HTMLElement>("#branch");
const clean = mustQuery<HTMLElement>("#clean");
const statusRight = mustQuery<HTMLElement>("#status-right");
const live = mustQuery<HTMLElement>("#live");

const taskEls = new Map<TaskId, HTMLElement>();
const audio = new AudioEngine();
const scene = new RobotScene(canvas, screen, {
  onSpark: () => audio.spark(),
});

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduced = motionQuery.matches;
let phase: Phase = "idle";
let completed = 0;
let fixes = 0;
let activeRun: AbortController | null = null;
let copyTimer = 0;

scene.setReducedMotion(reduced);
document.documentElement.dataset.motion = reduced ? "reduced" : "full";

/* ------------------------------------------------------------------ *
 * Task rows
 * ------------------------------------------------------------------ */

for (const task of TASKS) {
  const row = document.createElement("div");
  row.className = "task";
  row.dataset.task = task.id;
  row.dataset.state = "waiting";
  row.setAttribute("role", "listitem");
  row.innerHTML = `
    <span class="task-icon" aria-hidden="true">
      <span class="task-wait"></span>
      <span class="task-spinner"></span>
      <svg class="task-check" viewBox="0 0 16 16">
        <path d="m3.3 8.2 2.8 2.8 6.4-6.3" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
    <span class="task-main">
      <span class="task-name">${task.label}</span>
      <span class="task-detail" data-detail>${task.meta}</span>
    </span>
    <span class="task-fixes" aria-hidden="true">+${task.fixes}</span>
    <span class="task-state" data-state-label>waiting</span>
  `;
  taskList.append(row);
  taskEls.set(task.id, row);
}

/* ------------------------------------------------------------------ *
 * Pause-aware frame loop
 * ------------------------------------------------------------------ */

type Waiter = {
  remaining: number;
  done: boolean;
  resolve: () => void;
};

const waiters = new Set<Waiter>();
let rafId = 0;
let lastFrame = 0;
let terminalVisible = true;

function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<void>((resolve, reject) => {
    const waiter: Waiter = { remaining: ms, done: false, resolve: () => {} };
    const cleanup = () => signal.removeEventListener("abort", onAbort);

    const onAbort = () => {
      if (waiter.done) return;
      waiter.done = true;
      waiters.delete(waiter);
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    waiter.resolve = () => {
      if (waiter.done) return;
      waiter.done = true;
      waiters.delete(waiter);
      cleanup();
      resolve();
    };

    signal.addEventListener("abort", onAbort, { once: true });
    waiters.add(waiter);
  });
}

function advanceWaiters(dt: number): void {
  if (waiters.size === 0) return;
  for (const waiter of [...waiters]) {
    waiter.remaining -= dt * 1000;
    if (waiter.remaining <= 0) waiter.resolve();
  }
}

function frame(now: number): void {
  rafId = 0;
  if (document.hidden || !terminalVisible) return;
  if (lastFrame === 0) lastFrame = now;
  // Keep the run honest on low-refresh or throttled displays. The small
  // cap only prevents a huge catch-up jump after a long stalled frame.
  const dt = Math.min((now - lastFrame) / 1000, 0.25);
  lastFrame = now;

  advanceWaiters(dt);
  scene.frame(dt, now / 1000);
  rafId = requestAnimationFrame(frame);
}

function startLoop(): void {
  if (rafId !== 0 || document.hidden || !terminalVisible) return;
  lastFrame = 0;
  rafId = requestAnimationFrame(frame);
}

function stopLoop(): void {
  if (rafId !== 0) cancelAnimationFrame(rafId);
  rafId = 0;
  lastFrame = 0;
}

const intersection = new IntersectionObserver(
  (entries) => {
    terminalVisible = entries[0]?.isIntersecting ?? true;
    if (terminalVisible) startLoop();
    else stopLoop();
  },
  { rootMargin: "90px 0px", threshold: 0 },
);
intersection.observe(screen);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopLoop();
  else startLoop();
});

startLoop();

/* ------------------------------------------------------------------ *
 * UI state
 * ------------------------------------------------------------------ */

function setPhase(next: Phase): void {
  phase = next;
  document.body.dataset.phase = next;
  terminalWindow.dataset.phase = next;

  const busy = next === "typing" || next === "running";
  runButton.disabled = busy;
  runButton.dataset.state = busy
    ? "busy"
    : next === "complete"
      ? "done"
      : "idle";
  runButton.setAttribute("aria-busy", String(busy));

  runLabel.textContent = busy
    ? next === "typing"
      ? "Stand by…"
      : "Running checks…"
    : next === "complete"
      ? "Run it again"
      : "Run the demo";

  actionHint.textContent = busy
    ? "agent in control"
    : next === "complete"
      ? "all checks green"
      : "10s · simulated";

  termMode.textContent = busy ? "running" : next === "complete" ? "done" : "idle";
  commandHintLabel.textContent = next === "complete" ? "again" : "run";
}

function setTaskState(id: TaskId, state: TaskState): void {
  const row = taskEls.get(id);
  if (!row) return;
  row.dataset.state = state;
  const label = row.querySelector<HTMLElement>("[data-state-label]");
  if (label) label.textContent = state;
}

function setTaskDetail(id: TaskId, text: string): void {
  const row = taskEls.get(id);
  if (!row) return;
  const detail = row.querySelector<HTMLElement>("[data-detail]");
  if (!detail || detail.textContent === text) return;

  detail.textContent = text;
  if (reduced) return;
  detail.classList.remove("is-changing");
  void detail.offsetWidth;
  detail.classList.add("is-changing");
}

function updateMeter(): void {
  checksCount.textContent = `${completed} / ${TASKS.length}`;
  fixesCount.textContent = String(fixes).padStart(2, "0");
  meterFill.style.width = `${(completed / TASKS.length) * 100}%`;
  meterTrack.setAttribute("aria-valuenow", String(completed));
  meterTrack.setAttribute(
    "aria-valuetext",
    `${completed} of ${TASKS.length} checks complete`,
  );
}

function setResult(
  state: "idle" | "running" | "complete",
  title: string,
  sub: string,
): void {
  result.dataset.state = state;
  resultTitle.textContent = title;
  resultSub.textContent = sub;
  replay.hidden = state !== "complete";

  if (state === "complete") {
    result.setAttribute(
      "aria-label",
      `All checks passed · ${TOTAL_FIXES} fixes · ${RESULT_TIME} · 4 files changed`,
    );
  } else {
    result.removeAttribute("aria-label");
  }
}

function announce(message: string): void {
  live.textContent = message;
}

function resetUI(): void {
  typed.textContent = "";
  completed = 0;
  fixes = 0;
  updateMeter();

  for (const task of TASKS) {
    setTaskState(task.id, "waiting");
    setTaskDetail(task.id, task.meta);
  }

  agentText.textContent = "agent v0.9.4 · idle · 4 checks queued";
  branch.textContent = "main";
  clean.textContent = "clean";
  statusRight.textContent = "agent 0.9.4";
  setResult("idle", "Awaiting input", "4 checks queued · press enter to start");
}

function finishRun(): void {
  completed = TASKS.length;
  fixes = TOTAL_FIXES;
  updateMeter();

  setPhase("complete");
  agentText.textContent = "agent v0.9.4 · session complete · 0 errors";
  branch.textContent = "run/fix-all";
  clean.textContent = "ready";
  statusRight.textContent = "0 errors";
  setResult(
    "complete",
    "All checks passed",
    `${TOTAL_FIXES} fixes · ${RESULT_TIME} · 4 files changed`,
  );
  audio.complete();
  activeRun = null;

  announce(
    `All checks passed. ${TOTAL_FIXES} fixes. ${RESULT_TIME}. The branch is ready to push.`,
  );
}

/* ------------------------------------------------------------------ *
 * The run
 * ------------------------------------------------------------------ */

async function typeCommand(signal: AbortSignal): Promise<void> {
  agentText.textContent = "agent v0.9.4 · listening…";
  setResult("running", "Reading the prompt", "run fix --all · 4 checks queued");

  if (reduced) {
    typed.textContent = COMMAND;
    audio.key();
    await wait(240, signal);
    return;
  }

  const characters = [...COMMAND];
  for (let i = 0; i < characters.length; i++) {
    typed.textContent += characters[i];
    if (characters[i] !== " " && i % 2 === 0) audio.key();
    await wait(42 + Math.random() * 42, signal);
  }
  audio.key();
  await wait(260, signal);
}

async function runTask(
  task: Task,
  index: number,
  signal: AbortSignal,
): Promise<void> {
  const row = taskEls.get(task.id);
  if (!row) return;

  setTaskState(task.id, "working");
  setTaskDetail(task.id, task.beats[0].text);
  agentText.textContent = `agent v0.9.4 · working · ${task.label} · ${index + 1} of ${TASKS.length}`;
  setResult(
    "running",
    `Fixing ${task.label}`,
    `${index + 1} of ${TASKS.length} checks · ${fixes} fixes so far`,
  );

  if (!reduced) {
    scene.spawn(task.id, row, caret);
    audio.spawn();
  }

  let elapsed = 0;
  for (let i = 1; i < task.beats.length; i++) {
    const target = task.beats[i].at * task.duration;
    await wait(Math.max(0, target - elapsed), signal);
    elapsed = target;
    if (signal.aborted) return;
    setTaskDetail(task.id, task.beats[i].text);
  }

  await wait(Math.max(0, task.duration - elapsed), signal);
  if (signal.aborted) return;

  setTaskState(task.id, "fixed");
  setTaskDetail(task.id, task.done);
  completed += 1;
  fixes += task.fixes;
  updateMeter();
  scene.finish(task.id);
  audio.fixed(index);

  agentText.textContent = `agent v0.9.4 · ${completed} of ${TASKS.length} checks green · ${fixes} fixes`;
  setResult(
    "running",
    "Checks turning green",
    `${completed} of ${TASKS.length} complete · ${fixes} fixes`,
  );

  announce(
    `${task.label} fixed. ${completed} of ${TASKS.length} checks complete.`,
  );

  await wait(reduced ? 120 : 190, signal);
}

async function startRun(): Promise<void> {
  if (phase === "typing" || phase === "running") return;

  audio.unlock();
  activeRun?.abort();
  const controller = new AbortController();
  activeRun = controller;
  const signal = controller.signal;

  scene.reset();
  resetUI();
  setPhase("typing");
  setResult("running", "Reading the prompt", "run fix --all · 4 checks queued");
  startLoop();

  try {
    await typeCommand(signal);
    if (signal.aborted) return;

    agentText.textContent = "agent v0.9.4 · connected · planning 4 checks";
    branch.textContent = "run/fix-all";
    statusRight.textContent = "agent busy";
    setPhase("running");

    await wait(reduced ? 420 : 560, signal);

    for (let i = 0; i < TASKS.length; i++) {
      await runTask(TASKS[i], i, signal);
      if (signal.aborted) return;
    }

    await wait(280, signal);
    if (signal.aborted) return;
    finishRun();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    console.error("Run demo failed:", error);
  }
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

runButton.addEventListener("click", () => {
  void startRun();
});

replay.addEventListener("click", () => {
  void startRun();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.repeat) return;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

  const target = event.target as HTMLElement | null;
  if (
    target?.closest(
      "button, a, input, textarea, select, [contenteditable='true']",
    )
  ) {
    return;
  }
  if (phase === "typing" || phase === "running") return;

  event.preventDefault();
  void startRun();
});

function syncSoundButton(): void {
  const muted = audio.isMuted();
  soundButton.setAttribute("aria-pressed", String(muted));
  const label = muted ? "Unmute sound" : "Mute sound";
  soundButton.setAttribute("aria-label", label);
  soundButton.title = label;
}

let initiallyMuted = false;
try {
  initiallyMuted = localStorage.getItem("run-muted") === "1";
} catch {
  initiallyMuted = false;
}
audio.setMuted(initiallyMuted);
syncSoundButton();

soundButton.addEventListener("click", () => {
  const nextMuted = !audio.isMuted();
  audio.setMuted(nextMuted);
  if (!nextMuted) {
    audio.unlock();
    audio.key();
  }
  try {
    localStorage.setItem("run-muted", nextMuted ? "1" : "0");
  } catch {
    // Storage is a nice-to-have; the demo works without it.
  }
  syncSoundButton();
});

installButton.addEventListener("click", () => {
  void (async () => {
    const command = "npm i -g run";
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(command);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        const area = document.createElement("textarea");
        area.value = command;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.append(area);
        area.select();
        copied = document.execCommand("copy");
        area.remove();
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      announce("Copy failed. The command is npm i -g run.");
      return;
    }

    installButton.classList.add("copied");
    installButton.setAttribute("aria-label", "Install command copied");
    audio.key();
    announce("Install command copied to clipboard.");

    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      installButton.classList.remove("copied");
      installButton.setAttribute("aria-label", "Copy install command");
    }, 1800);
  })();
});

motionQuery.addEventListener("change", () => {
  reduced = motionQuery.matches;
  scene.setReducedMotion(reduced);
  document.documentElement.dataset.motion = reduced ? "reduced" : "full";
});
