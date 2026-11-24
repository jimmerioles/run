// Run, explained. The film follows a single key press through a terminal,
// four checks, a canvas layer, a clock, a synthesizer and the quiet defaults.
// The argument: the demo is the product, not an illustration of it.

import {
  W,
  H,
  ctx,
  C,
  F,
  clamp,
  lerp,
  smooth,
  easeOut,
  easeIn,
  easeInOut,
  span,
  pulse,
  withAlpha,
  font,
  text,
  label,
  paragraph,
  revealText,
  panel,
  rrect,
  line,
  curve,
  arrow,
  dot,
  ring,
  glow,
  image,
  imageCrop,
  sceneLabel,
} from "/kit/render/helpers.js";

const TAU = Math.PI * 2;

function times(sc) {
  return sc.seg.sentences.map((s) => ({
    start: s.start - sc.start,
    end: s.end - sc.start,
    dur: s.duration,
  }));
}

function appear(t, a, d = 0.8) {
  return easeOut(span(t, a, a + d));
}

function vanish(t, a, d = 0.7) {
  return 1 - smooth(span(t, a, a + d));
}

function kicker(str, x, y, color = C.coral, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  dot(x + 3, y - 5, 3.2, color, 1, 9);
  ctx.restore();
  text(str.toUpperCase(), x + 17, y, {
    size: 14,
    family: F.mono,
    color: C.dim,
    ls: 2.7,
    alpha,
  });
}

function heading(str, x, y, alpha = 1, size = 74, color = C.ink) {
  text(str, x, y, { size, weight: 500, ls: -2.4, alpha, color });
}

function mono(str, x, y, opts = {}) {
  text(str, x, y, { size: 17, family: F.mono, color: C.dim, ...opts });
}

function pill(str, x, y, color = C.coral, opts = {}) {
  const { align = "left", size = 15, alpha = 1, fill = true } = opts;
  font(size, 400, F.mono);
  ctx.letterSpacing = "1.8px";
  const w = ctx.measureText(str.toUpperCase()).width + 26;
  const px = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (fill) {
    rrect(px, y - size - 6, w, size + 14, 999);
    ctx.fillStyle = withAlpha(color, 0.09);
    ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.32);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  text(str.toUpperCase(), px + 13, y, { size, family: F.mono, color, ls: 1.8 });
  ctx.restore();
  return w;
}

function frame(x, y, w, h, opts = {}) {
  const { r = 18, alpha = 1, color = C.coral, glowAlpha = 0.16, fill = "rgba(7,11,20,0.72)" } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  glow(x + w / 2, y + h / 2, Math.max(w, h) * 0.56, color, glowAlpha);
  panel(x - 7, y - 7, w + 14, h + 14, {
    r: r + 7,
    fill,
    stroke: withAlpha(color, 0.18),
    lw: 1.2,
    glow: withAlpha(color, 0.2),
  });
  ctx.restore();
}

function checkMark(cx, cy, size, p, color = C.coral, alpha = 1, lw = 3) {
  if (p <= 0.02) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const a = clamp(p / 0.5, 0, 1);
  const b = clamp((p - 0.5) / 0.5, 0, 1);
  const p0 = [-size * 0.46, size * 0.02];
  const p1 = [-size * 0.12, size * 0.34];
  const p2 = [size * 0.48, -size * 0.34];
  ctx.beginPath();
  ctx.moveTo(cx + p0[0], cy + p0[1]);
  ctx.lineTo(cx + lerp(p0[0], p1[0], a), cy + lerp(p0[1], p1[1], a));
  if (b > 0) {
    ctx.lineTo(cx + lerp(p1[0], p2[0], b), cy + lerp(p1[1], p2[1], b));
  }
  ctx.stroke();
  ctx.restore();
}

function keycap(cx, cy, size, opts = {}) {
  const { p = 0, alpha = 1, color = C.coral, glyph = "↵" } = opts;
  const s = 1 - 0.045 * p;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy + 3 * p);
  glow(cx, cy, size * 0.85, color, 0.12 + 0.08 * p);
  panel(cx - size / 2, cy - size / 2, size, size, {
    r: size * 0.17,
    fill: "rgba(9,15,25,0.94)",
    stroke: withAlpha(color, 0.38 + 0.25 * p),
    lw: 1.6,
    glow: withAlpha(color, 0.35 + 0.25 * p),
  });
  rrect(cx - size * 0.39, cy - size * 0.39, size * 0.78, size * 0.78, size * 0.12);
  ctx.strokeStyle = "rgba(244,241,234,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  text(glyph, cx, cy + size * 0.14, {
    size: size * 0.48,
    family: F.mono,
    color: C.ink,
    align: "center",
    alpha: 0.9,
  });
  ctx.restore();
}

function typedCommand(lt, start, textStr, x, y, opts = {}) {
  const { size = 30, alpha = 1, color = C.ink } = opts;
  const p = smooth(span(lt, start, start + 1.4));
  const n = Math.round(p * textStr.length);
  const shown = textStr.slice(0, n);
  font(size, 500, F.mono);
  const width = ctx.measureText(textStr).width;
  text("❯", x, y, { size, family: F.mono, color: C.coral, alpha });
  text(shown, x + size * 1.1, y, { size, family: F.mono, color, alpha });
  const caretOn = Math.floor((lt - start) * 2.2) % 2 === 0 || p < 1;
  if (caretOn) {
    const cw = ctx.measureText(shown).width;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = C.coral;
    ctx.fillRect(x + size * 1.1 + cw + 3, y - size * 0.82, size * 0.42, size);
    ctx.restore();
  }
  return width;
}

// ---------------------------------------------------------------- robot

function robot(x, y, scale, opts = {}) {
  const {
    alpha = 1,
    face = 1,
    t = 0,
    working = false,
    seed = 0,
    blink = false,
    body = true,
    jets = true,
  } = opts;
  const clock = t + seed;
  const tilt = Math.sin(clock * 3.1) * 0.045;
  const armSwing = working ? Math.sin(clock * 9) * 3.4 : Math.sin(clock * 2.3) * 1.1;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(face * scale, scale);

  // Hover bloom.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const bloom = ctx.createRadialGradient(0, 14, 0, 0, 14, 24);
  bloom.addColorStop(0, withAlpha(C.coral, working ? 0.24 : 0.15));
  bloom.addColorStop(1, withAlpha(C.coral, 0));
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.ellipse(0, 14, 24, 8, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Arms.
  ctx.strokeStyle = "#d4ceba";
  ctx.fillStyle = "#171c15";
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-9.6, 1);
  ctx.lineTo(-14, 5 + armSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9.6, 1);
  ctx.lineTo(14, 5 - armSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-14.4, 5.4 + armSwing, 1.5, 0, TAU);
  ctx.arc(14.4, 5.4 - armSwing, 1.5, 0, TAU);
  ctx.fill();

  // Antenna.
  ctx.strokeStyle = "#c9c3b0";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(3.3, -8.2);
  ctx.quadraticCurveTo(5, -11.5, 4.7, -13.2);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = withAlpha(C.peach, 0.9);
  ctx.shadowBlur = 7;
  ctx.fillStyle = C.peach;
  ctx.beginPath();
  ctx.arc(4.7, -13.7, 1.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  if (body) {
    // Body.
    const bodyGrad = ctx.createLinearGradient(0, -10, 0, 10);
    bodyGrad.addColorStop(0, "#f7f1df");
    bodyGrad.addColorStop(0.55, "#ded8c5");
    bodyGrad.addColorStop(1, "#b9b3a0");
    rrect(-10, -9, 20, 18, 6);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "rgba(4, 8, 5, 0.55)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-6, -8.1);
    ctx.lineTo(5, -8.1);
    ctx.stroke();

    // Visor.
    rrect(-7.4, -4.6, 14.8, 8.2, 2.8);
    ctx.fillStyle = "#050c07";
    ctx.fill();
    ctx.strokeStyle = withAlpha(C.coral, 0.2);
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Eyes.
    const cycled = blink ? 0.12 : (clock * 1.0) % 4.4;
    const blinking = cycled < 0.1;
    const eyeH = blinking ? 0.5 : 1.9;
    ctx.save();
    ctx.shadowColor = withAlpha(C.coral, 0.85);
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#a8ff86";
    rrect(-4.2, -1.1, 2.4, eyeH, 1);
    ctx.fill();
    rrect(1.8, -1.1, 2.4, eyeH, 1);
    ctx.fill();
    ctx.restore();

    // Vents.
    ctx.strokeStyle = "rgba(8, 12, 8, 0.35)";
    ctx.lineWidth = 0.65;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2.6 - 1.2, 5.2);
      ctx.lineTo(i * 2.6 + 0.2, 5.2);
      ctx.stroke();
    }

    // Chest lamp.
    ctx.fillStyle = working ? C.peach : withAlpha(C.coral, 0.8);
    ctx.beginPath();
    ctx.arc(6.8, 2.9, 0.9, 0, TAU);
    ctx.fill();
  }

  // Hover jets.
  if (jets) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = withAlpha(C.coral, 0.55);
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    const jet = 2 + Math.sin(clock * 14) * 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 10.4);
    ctx.lineTo(-4.8, 10.4 + jet);
    ctx.moveTo(4, 10.4);
    ctx.lineTo(4.8, 10.4 + jet);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function sparks(x, y, t, alpha = 1) {
  for (let i = 0; i < 7; i++) {
    const a = -0.4 - i * 0.24 + Math.sin(t * 9 + i) * 0.12;
    const len = 8 + ((i * 13 + Math.floor(t * 30)) % 14);
    const sx = x + 26 + i * 3;
    const sy = y + 8 + Math.sin(t * 7 + i) * 5;
    ctx.save();
    ctx.globalAlpha *= alpha * (0.35 + 0.4 * Math.abs(Math.sin(t * 8 + i)));
    ctx.strokeStyle = i % 3 === 0 ? C.peach : C.coral;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- ui bits

const TASK_DATA = [
  {
    id: "types",
    label: "types",
    meta: "tsc --noEmit · 214 files",
    fixes: 3,
    duration: 1.8,
    beats: [
      [0, "checking 214 files…"],
      [0.5, "3 errors · 2 files"],
      [0.78, "applying patches…"],
      [1, "0 errors · 3 types fixed"],
    ],
  },
  {
    id: "lint",
    label: "lint",
    meta: "eslint --fix · 96 files",
    fixes: 4,
    duration: 1.6,
    beats: [
      [0, "scanning 96 files…"],
      [0.55, "7 warnings · autofixing"],
      [0.82, "re-running lint…"],
      [1, "0 warnings · 4 fixed"],
    ],
  },
  {
    id: "tests",
    label: "tests",
    meta: "vitest run · 128 tests",
    fixes: 3,
    duration: 2.2,
    beats: [
      [0, "38 suites · 128 tests"],
      [0.4, "2 failing · triaging"],
      [0.68, "patching snapshots…"],
      [0.86, "128 passing"],
      [1, "128 passed · 3 fixed"],
    ],
  },
  {
    id: "build",
    label: "build",
    meta: "tsup · production",
    fixes: 2,
    duration: 1.9,
    beats: [
      [0, "bundling 214 modules…"],
      [0.55, "2 import cycles"],
      [0.82, "optimizing chunks…"],
      [1, "2 imports fixed · 84.2 kB"],
    ],
  },
];

function rowState(i, lt, workStart) {
  const starts = [0, 2.6, 5.4, 7.8];
  const durations = TASK_DATA.map((t) => t.duration);
  const start = workStart + starts[i];
  const end = start + durations[i];
  if (lt < start) return "waiting";
  if (lt < end) return "working";
  return "fixed";
}

function rowDetail(i, lt, workStart, state) {
  const task = TASK_DATA[i];
  if (state === "waiting") return task.meta;
  if (state === "fixed") return task.beats[task.beats.length - 1][1];
  const start = workStart + [0, 2.6, 5.4, 7.8][i];
  const p = clamp((lt - start) / task.duration, 0, 1);
  let out = task.beats[0][1];
  for (const [at, txt] of task.beats) if (p >= at) out = txt;
  return out;
}

function taskRow(x, y, w, task, state, detail, alpha = 1, t = 0) {
  const h = 92;
  const color = state === "fixed" ? C.coral : state === "working" ? C.peach : C.faint;
  ctx.save();
  ctx.globalAlpha *= alpha;

  if (state === "working") {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, withAlpha(C.peach, 0.1));
    g.addColorStop(0.6, withAlpha(C.peach, 0.02));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.peach;
    ctx.fillRect(x, y + 10, 2.5, h - 20);
  } else if (state === "fixed") {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, withAlpha(C.coral, 0.075));
    g.addColorStop(0.7, withAlpha(C.coral, 0.012));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = withAlpha(C.coral, 0.6);
    ctx.fillRect(x, y + 10, 2, h - 20);
  }

  // Icon.
  const ix = x + 22;
  const iy = y + 20;
  rrect(ix, iy, 44, 44, 11);
  ctx.fillStyle = state === "fixed" ? withAlpha(C.coral, 0.1) : state === "working" ? withAlpha(C.peach, 0.09) : "rgba(255,255,255,0.02)";
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, state === "waiting" ? 0.25 : 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (state === "fixed") {
    checkMark(ix + 22, iy + 22, 22, 1, C.coral, 1, 2.4);
  } else if (state === "working") {
    ctx.save();
    ctx.strokeStyle = C.peach;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(ix + 22, iy + 22, 9, t * 5.5, t * 5.5 + Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();
  } else {
    dot(ix + 22, iy + 22, 2.6, C.faint, 0.7);
  }

  text(task.label, x + 84, y + 38, { size: 27, weight: 500, color: state === "waiting" ? C.dim : C.ink });
  text(detail, x + 84, y + 66, {
    size: 15,
    family: F.mono,
    color: state === "working" ? withAlpha(C.peach, 0.85) : state === "fixed" ? withAlpha(C.coral, 0.62) : C.faint,
  });

  text(`+${task.fixes}`, x + w - 170, y + 56, {
    size: 16,
    family: F.mono,
    color: C.coral,
    align: "right",
    alpha: state === "fixed" ? 0.72 : 0,
  });

  const stateText = state.toUpperCase();
  text(stateText, x + w - 24, y + 56, {
    size: 14,
    family: F.mono,
    color,
    align: "right",
    ls: 1.6,
    alpha: state === "waiting" ? 0.5 : 1,
  });
  if (state === "working") {
    font(14, 400, F.mono);
    dot(x + w - 24 - ctx.measureText(stateText).width - 12, y + 51, 3, C.peach, 0.5 + 0.5 * Math.sin(t * 6), 8);
  }

  line(x + 20, y + h, x + w - 20, y + h, "rgba(244,241,234,0.08)", 1);
  ctx.restore();
}

function meter(x, y, w, completed, fixes, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  mono(`${completed} / 4 checks`, x, y, { size: 13, color: C.faint, ls: 1.6 });
  mono(`${String(fixes).padStart(2, "0")} fixes`, x + w, y, {
    size: 13,
    color: C.coral,
    ls: 1.6,
    align: "right",
  });
  rrect(x, y + 14, w, 6, 999);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  if (completed > 0) {
    const p = completed / 4;
    rrect(x, y + 14, w * p, 6, 999);
    const g = ctx.createLinearGradient(x, 0, x + w * p, 0);
    g.addColorStop(0, withAlpha(C.coral, 0.5));
    g.addColorStop(1, C.coral);
    ctx.fillStyle = g;
    ctx.fill();
    glow(x + w * p, y + 17, 26, C.coral, 0.5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- images

function drawTerminalImage(name, x, y, w, h, alpha = 1) {
  frame(x, y, w, h, { r: 18, alpha, color: C.coral, glowAlpha: 0.12 });
  image(name, x, y, w, h, alpha, 15, 1.002);
}

// ---------------------------------------------------------------- 01 intro

function intro(lt, sc) {
  const s = times(sc);
  const z = easeInOut(span(lt, s[2].start - 0.35, s[2].start + 1.7));
  const notesOut = 1 - smooth(span(lt, s[2].start - 0.2, s[2].start + 0.9));

  const sx = lerp(0, 580, z);
  const sy = lerp(0, 202, z);
  const sw = lerp(1440, 742, z);
  const sh = lerp(900, 524, z);
  const dx = lerp(390, 676, z);
  const dy = lerp(160, 158, z);
  const dw = lerp(1250, 1114, z);
  const dh = lerp(781, 786, z);

  const pageIn = appear(lt, 0.1, 1.1);
  glow(dx + dw / 2, dy + dh / 2, dw * 0.58, C.coral, 0.12 + 0.08 * z);
  frame(dx, dy, dw, dh, { r: 18, alpha: pageIn, color: C.coral, glowAlpha: 0.16 });
  imageCrop("page", sx, sy, sw, sh, dx, dy, dw, dh, pageIn, 15);

  // A shade under the opening annotations keeps them legible over the page.
  if (notesOut > 0 && z < 0.99) {
    const shade = ctx.createLinearGradient(dx, 0, dx + 460, 0);
    shade.addColorStop(0, "rgba(7,10,21,0.92)");
    shade.addColorStop(0.55, "rgba(7,10,21,0.58)");
    shade.addColorStop(1, "rgba(7,10,21,0)");
    ctx.save();
    ctx.globalAlpha *= notesOut * (1 - z);
    ctx.fillStyle = shade;
    ctx.fillRect(dx, dy, 460, dh);
    ctx.restore();
  }

  // The running state arrives with the key press.
  const runP = smooth(span(lt, s[3].start + 0.35, s[3].start + 1.5));
  if (runP > 0) {
    ctx.save();
    ctx.globalAlpha *= runP;
    // The running capture is composited over a solid plate so the idle
    // result card cannot show through its translucent panels.
    rrect(dx, dy, dw, dh, 15);
    ctx.fillStyle = "#070a08";
    ctx.fill();
    image("terminalWorking", dx, dy, dw, dh, 1, 15, 1.002);
    ctx.restore();
    glow(dx + dw * 0.2, dy + 60, 260, C.coral, 0.12 * runP);
  }

  // Left annotations before the push.
  if (notesOut > 0) {
    kicker("the whole page", 110, 168, C.coral, notesOut);
    const notes = [
      ["No hero image.", C.ink],
      ["No feature grid.", C.dim],
      ["No testimonial wall.", C.dim],
    ];
    notes.forEach(([str, color], i) => {
      const p = appear(lt, s[0].start + i * 0.55, 0.7);
      text(str, 110, 258 + i * 54, { size: 31, weight: 500, color, alpha: p * notesOut, ls: -0.8 });
    });
    line(110, 430, 320, 430, C.line, 1, null, notesOut);
    mono("one screen · one interaction", 110, 466, { size: 15, color: C.faint, alpha: notesOut, ls: 1.4 });
  }

  // Left argument after the push.
  const argIn = smooth(span(lt, s[2].start + 0.1, s[2].start + 1.3));
  if (argIn > 0) {
    kicker("the terminal", 110, 168, C.coral, argIn);
    text("One", 110, 272, { size: 74, weight: 500, ls: -2.6, alpha: argIn });
    text("terminal.", 110, 348, { size: 74, weight: 500, ls: -2.6, color: C.coral, alpha: argIn });
    text("One", 110, 424, { size: 74, weight: 500, ls: -2.6, alpha: argIn });
    text("command.", 110, 500, { size: 74, weight: 500, ls: -2.6, alpha: argIn });
    mono("~/acme/web  ❯  run fix --all", 110, 560, {
      size: 16,
      color: C.dim,
      alpha: argIn * 0.9,
    });
  }

  // The key.
  const keyIn = smooth(span(lt, s[3].start - 0.2, s[3].start + 0.8));
  if (keyIn > 0) {
    const press = smooth(span(lt, s[3].start + 0.3, s[3].start + 0.55)) * (1 - smooth(span(lt, s[3].start + 0.55, s[3].start + 0.9)));
    keycap(202, 690, 104, { p: press, alpha: keyIn });
    mono("press enter", 202, 774, { size: 13, color: C.faint, align: "center", ls: 2, alpha: keyIn });
  }

}

// ---------------------------------------------------------------- 02 gesture

function gesture(lt, sc) {
  const s = times(sc);
  const tileIn = appear(lt, 0.05, 0.9);
  const press = smooth(span(lt, s[1].start + 0.2, s[1].start + 0.45)) * (1 - smooth(span(lt, s[1].start + 0.5, s[1].start + 0.85)));
  const kx = 390;
  const ky = 560;

  kicker("the contract", 110, 168, C.coral, tileIn);
  text("One", 110, 270, { size: 76, weight: 500, ls: -2.6, alpha: tileIn });
  text("interaction.", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: tileIn });

  // Rings behind the key.
  for (let i = 0; i < 4; i++) {
    const rp = smooth(span(lt, s[0].start + i * 0.18, s[0].start + 1.6 + i * 0.18));
    ring(kx, ky - 20, 190 + i * 56 + rp * 10, withAlpha(i % 2 ? C.peach : C.coral, 0.12 - i * 0.02), 1.2, tileIn, [2, 9]);
  }
  keycap(kx, ky - 20, 292, { p: press, alpha: tileIn });
  mono("press enter", kx, ky + 186, { size: 13, color: C.faint, align: "center", ls: 2.2, alpha: tileIn });

  // Second path: the real button.
  const buttonIn = appear(lt, s[1].start + 0.2, 0.7);
  if (buttonIn > 0) {
    const bx = 820;
    const by = 494;
    panel(bx, by, 260, 58, {
      r: 9,
      fill: "rgba(236,231,214,0.94)",
      stroke: "rgba(255,255,255,0.7)",
      alpha: buttonIn,
      glow: withAlpha(C.coral, 0.2),
    });
    dot(bx + 27, by + 29, 11, C.coral, buttonIn, 6);
    text("Run the demo", bx + 52, by + 36, {
      size: 20,
      family: F.mono,
      weight: 600,
      color: "#0a0d09",
      alpha: buttonIn,
    });
    text("or", kx + 178, by + 35, { size: 22, family: F.mono, color: C.faint, alpha: buttonIn });
    mono("enter  /  click", bx + 130, by + 82, { size: 13, color: C.faint, align: "center", ls: 1.8, alpha: buttonIn });
  }

  const contractIn = smooth(span(lt, s[2].start, s[2].start + 0.8));
  if (contractIn > 0) {
    line(820, 596, 1120, 596, withAlpha(C.coral, 0.35), 1.2, null, contractIn);
    text("That is the whole contract.", 820, 640, {
      size: 28,
      weight: 400,
      color: C.dim,
      alpha: contractIn,
    });
  }

  // Ghost interactions, crossed out.
  const ghosts = [
    { label: "carousel", x: 820, y: 668 },
    { label: "scroll trick", x: 1040, y: 668 },
    { label: "second ask", x: 1260, y: 668 },
  ];
  const ghostOut = smooth(span(lt, s[3].start + 0.2, s[3].start + 1.2));
  ghosts.forEach((g, i) => {
    const p = smooth(span(lt, s[3].start + i * 0.28, s[3].start + 0.7 + i * 0.28));
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= p * (0.48 + 0.52 * (1 - ghostOut * 0.6));
    panel(g.x, g.y, 190, 104, {
      r: 12,
      fill: "rgba(255,255,255,0.025)",
      stroke: "rgba(244,241,234,0.16)",
      lw: 1,
    });
    text(g.label, g.x + 95, g.y + 62, { size: 18, family: F.mono, color: C.dim, align: "center" });
    ctx.restore();
    if (ghostOut > 0) {
      const x1 = g.x + 26;
      const x2 = g.x + 164;
      const y1 = g.y + 46;
      const y2 = g.y + 64;
      ctx.save();
      ctx.globalAlpha *= ghostOut;
      ctx.strokeStyle = C.coral;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(lerp(x1, x2, ghostOut), lerp(y1, y2, ghostOut));
      ctx.stroke();
      ctx.restore();
    }
  });

  // Consequence line to four checks.
  const consIn = smooth(span(lt, s[4].start - 0.2, s[4].start + 1.1));
  if (consIn > 0) {
    const y = 870;
    line(210, y, 1800, y, withAlpha(C.coral, 0.28), 1.2, null, consIn);
    mono("consequence", 110, y + 5, { size: 13, color: C.coral, ls: 2.4, alpha: consIn });
    for (let i = 0; i < 4; i++) {
      const x = 720 + i * 290;
      const p = smooth(span(lt, s[4].start + 0.35 + i * 0.3, s[4].start + 1.0 + i * 0.3));
      ring(x, y, 11, withAlpha(C.coral, 0.7), 1.5, p, null);
      dot(x, y, 4, C.coral, p, 8);
      mono(["types", "lint", "tests", "build"][i], x, y + 36, { size: 12, color: C.faint, align: "center", ls: 1.6, alpha: p });
    }
  }
}

// ---------------------------------------------------------------- 03 stage

function stage(lt, sc) {
  const s = times(sc);
  const inP = appear(lt, 0.05, 0.9);
  const leftFade = 1 - smooth(span(lt, s[4].start - 0.15, s[4].start + 0.65));
  const zoomP = smooth(span(lt, s[4].start - 0.15, s[4].start + 0.85));

  kicker("the stage", 110, 168, C.coral, inP * leftFade);
  text("The", 110, 272, { size: 76, weight: 500, ls: -2.6, alpha: inP * leftFade });
  text("terminal.", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: inP * leftFade });

  // Four material notes.
  const details = [
    ["near-black glass", "rgba(255,255,255,0.08)", C.dim],
    ["phosphor lime", C.coral, C.coral],
    ["thin scanlines", "rgba(244,241,234,0.24)", C.dim],
    ["soft vignette", "rgba(244,241,234,0.12)", C.dim],
  ];
  details.forEach(([str, swatch, color], i) => {
    const p = smooth(span(lt, s[1].start + i * 0.4, s[1].start + 0.8 + i * 0.4)) * leftFade;
    if (p <= 0) return;
    const y = 418 + i * 54;
    if (i === 0) {
      rrect(110, y - 20, 34, 26, 5);
      ctx.fillStyle = "rgba(8,12,16,0.9)";
      ctx.fill();
      ctx.strokeStyle = swatch;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (i === 1) {
      ctx.save();
      ctx.globalAlpha *= p;
      glow(127, y - 7, 22, C.coral, 0.25);
      dot(127, y - 7, 7, C.coral, p, 10);
      ctx.restore();
    } else if (i === 2) {
      for (let k = 0; k < 3; k++) line(110, y - 14 + k * 7, 144, y - 14 + k * 7, swatch, 1, null, p);
    } else {
      const g = ctx.createRadialGradient(127, y - 7, 0, 127, y - 7, 18);
      g.addColorStop(0, "rgba(244,241,234,0)");
      g.addColorStop(1, swatch);
      ctx.save();
      ctx.globalAlpha *= p;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(127, y - 7, 18, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    text(str, 168, y, { size: 23, weight: 400, color, alpha: p });
  });

  // The terminal as an object.
  const tx = 700;
  const ty = 150;
  const tw = 1110;
  const th = 784;
  frame(tx, ty, tw, th, { r: 18, alpha: inP, color: C.coral, glowAlpha: 0.14 });
  image("terminal", tx, ty, tw, th, inP, 15, 1.002);

  // A live command types below the notes.
  if (lt > s[3].start - 0.4 && leftFade > 0) {
    const cmdY = 712;
    typedCommand(lt, s[3].start, "run fix --all", 110, cmdY, { size: 25, alpha: leftFade });
    mono("the prompt writes itself", 110, cmdY + 38, { size: 12, color: C.faint, ls: 1.8, alpha: leftFade });
  }

  // Attention lands on the line.
  if (zoomP > 0) {
    ctx.save();
    ctx.globalAlpha *= zoomP;
    ctx.fillStyle = "rgba(7,10,21,0.62)";
    ctx.fillRect(tx, ty, tw, th);
    ctx.restore();

    const cx = 180;
    const cy = lerp(462, 424, zoomP);
    const cw = 1560;
    const ch = 228;

    ctx.save();
    ctx.globalAlpha *= zoomP;
    glow(cx + cw / 2, cy + ch / 2, cw * 0.52, C.coral, 0.14);
    panel(cx - 8, cy - 8, cw + 16, ch + 16, {
      r: 20,
      fill: "rgba(8,13,22,0.6)",
      stroke: withAlpha(C.coral, 0.18),
      lw: 1.1,
      glow: withAlpha(C.coral, 0.2),
    });
    panel(cx, cy, cw, ch, {
      r: 16,
      fill: "rgba(8,13,22,0.96)",
      stroke: withAlpha(C.coral, 0.35),
      lw: 1.3,
    });
    mono("THE PROMPT", cx + 36, cy + 38, { size: 11, color: C.coral, ls: 2.4 });
    mono("agent v0.9.4 · working · types · 1 of 4", cx + cw - 36, cy + 38, {
      size: 12,
      color: C.faint,
      align: "right",
      ls: 1.2,
    });
    line(cx + 30, cy + 60, cx + cw - 30, cy + 60, "rgba(244,241,234,0.08)", 1);

    text("~/acme/web", cx + 38, cy + 128, { size: 24, family: F.mono, color: C.faint });
    text("❯", cx + 268, cy + 128, { size: 38, family: F.mono, color: C.coral });
    text("run fix --all", cx + 314, cy + 128, { size: 44, family: F.mono, weight: 500, color: C.ink });

    font(44, 500, F.mono);
    const textW = ctx.measureText("run fix --all").width;
    const caretX = cx + 314 + textW + 12;
    ctx.save();
    ctx.globalAlpha *= 0.6 + 0.4 * Math.abs(Math.sin(lt * 4.6));
    ctx.fillStyle = C.coral;
    ctx.fillRect(caretX, cy + 88, 7, 48);
    ctx.restore();
    ring(caretX + 3, cy + 112, 32 + 6 * Math.sin(lt * 2.2), withAlpha(C.coral, 0.36), 1.2, 1);

    mono("the line that matters", cx + 36, cy + 190, { size: 12, color: C.faint, ls: 1.8 });
    ctx.restore();

    mono("one line, in focus", cx, cy - 18, { size: 11, color: C.coral, ls: 2, alpha: zoomP * 0.8 });
  }
}

// ---------------------------------------------------------------- 04 checks

function checks(lt, sc) {
  const s = times(sc);
  const panelIn = appear(lt, 0.05, 0.9);
  const workStart = s[2].start + 0.2;

  const px = 600;
  const py = 126;
  const pw = 1210;
  const ph = 810;

  kicker("the run", 110, 168, C.coral, panelIn);
  text("Four", 110, 272, { size: 76, weight: 500, ls: -2.6, alpha: panelIn });
  text("checks.", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: panelIn });
  mono("one run · one receipt", 110, 400, { size: 14, color: C.faint, ls: 1.8, alpha: panelIn });

  frame(px, py, pw, ph, { r: 18, alpha: panelIn, color: C.coral, glowAlpha: 0.12 });
  panel(px, py, pw, ph, { r: 17, fill: "rgba(8,13,20,0.88)", stroke: "rgba(244,241,234,0.08)", alpha: panelIn });

  // Chrome.
  dot(px + 24, py + 26, 4, C.peach, panelIn);
  dot(px + 40, py + 26, 4, C.dim, panelIn * 0.4);
  dot(px + 56, py + 26, 4, C.coral, panelIn * 0.6);
  mono("~/acme/web · agent", px + pw / 2, py + 31, { size: 12, color: C.faint, align: "center", ls: 1.2, alpha: panelIn });
  const busy = lt < workStart ? "QUEUED" : lt < workStart + 10.4 ? "RUNNING" : "DONE";
  mono(busy, px + pw - 24, py + 31, {
    size: 11,
    color: busy === "DONE" ? C.coral : busy === "RUNNING" ? C.peach : C.faint,
    align: "right",
    ls: 1.8,
    alpha: panelIn,
  });
  line(px + 18, py + 54, px + pw - 18, py + 54, "rgba(244,241,234,0.08)", 1, null, panelIn);

  // Command and agent line.
  text("~/acme/web", px + 24, py + 88, { size: 17, family: F.mono, color: C.faint, alpha: panelIn });
  text("❯", px + 146, py + 88, { size: 17, family: F.mono, color: C.coral, alpha: panelIn });
  text("run fix --all", px + 172, py + 88, { size: 17, family: F.mono, color: C.ink, alpha: panelIn });
  if (lt < workStart + 10.4) {
    font(17, 400, F.mono);
    const cmdW = ctx.measureText("run fix --all").width;
    ctx.save();
    ctx.globalAlpha *= panelIn * (0.55 + 0.45 * Math.abs(Math.sin(lt * 4.6)));
    ctx.fillStyle = C.coral;
    ctx.fillRect(px + 172 + cmdW + 5, py + 74, 2.5, 17);
    ctx.restore();
  }
  const agentLine = lt < workStart ? "agent v0.9.4 · idle · 4 checks queued" : lt < workStart + 10.4 ? "agent v0.9.4 · working · checks in progress" : "agent v0.9.4 · session complete · 0 errors";
  text(agentLine, px + 24, py + 116, { size: 12, family: F.mono, color: C.faint, alpha: panelIn * 0.9 });
  line(px + 18, py + 134, px + pw - 18, py + 134, "rgba(244,241,234,0.08)", 1, null, panelIn);

  // Rows.
  const rowY = py + 146;
  let completed = 0;
  let fixes = 0;
  TASK_DATA.forEach((task, i) => {
    const state = panelIn > 0 ? rowState(i, lt, workStart) : "waiting";
    if (state === "fixed") {
      completed += 1;
      fixes += task.fixes;
    }
    taskRow(px + 18, rowY + i * 92, pw - 36, task, state, rowDetail(i, lt, workStart, state), panelIn, lt);
  });

  // Left counter.
  const countP = smooth(span(lt, s[0].start + 0.4, s[0].start + 1.0));
  text(`${completed}`, 110, 610, { size: 132, weight: 500, ls: -6, color: completed === 4 ? C.coral : C.ink, alpha: countP });
  mono("/ 4 green", 110, 646, { size: 15, color: C.dim, ls: 2, alpha: countP });
  text(`${fixes}`, 110, 830, { size: 96, weight: 500, ls: -5, color: C.coral, alpha: countP });
  mono("fixes applied", 110, 866, { size: 15, color: C.dim, ls: 2, alpha: countP });

  // Meter and receipt inside the panel.
  const meterY = py + 530;
  meter(px + 24, meterY, pw - 48, completed, fixes, panelIn);

  const receiptIn = smooth(span(lt, s[5].start - 0.1, s[5].start + 0.9));
  if (receiptIn > 0) {
    const rx = px + 24;
    const ry = py + 592;
    const rw = pw - 48;
    const rh = 178;
    ctx.save();
    ctx.globalAlpha *= receiptIn;
    panel(rx, ry, rw, rh, {
      r: 12,
      fill: withAlpha(C.coral, 0.07),
      stroke: withAlpha(C.coral, 0.32),
      lw: 1.4,
      glow: withAlpha(C.coral, 0.24),
    });
    dot(rx + 46, ry + 54, 21, C.coral, receiptIn, 18);
    checkMark(rx + 46, ry + 54, 28, 1, "#071007", receiptIn, 3.2);
    text("All checks passed", rx + 86, ry + 50, { size: 27, weight: 500, color: C.ink });
    mono(`${fixes} fixes · 2m 14s · 4 files changed`, rx + 86, ry + 82, { size: 15, color: withAlpha(C.coral, 0.75) });
    line(rx + 20, ry + 108, rx + rw - 20, ry + 108, withAlpha(C.coral, 0.14), 1);
    mono("branch", rx + 24, ry + 140, { size: 12, color: C.faint, ls: 2 });
    mono("run/fix-all", rx + 110, ry + 140, { size: 14, color: C.ink });
    mono("ready to push", rx + rw - 24, ry + 140, { size: 12, color: C.coral, align: "right", ls: 1.4 });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- 05 robots

const CUBIC = {
  p0: { x: 342, y: 640 },
  p1: { x: 600, y: 372 },
  p2: { x: 1140, y: 350 },
  p3: { x: 1370, y: 714 },
};

function cubicAt(t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * CUBIC.p0.x + b * CUBIC.p1.x + c * CUBIC.p2.x + d * CUBIC.p3.x,
    y: a * CUBIC.p0.y + b * CUBIC.p1.y + c * CUBIC.p2.y + d * CUBIC.p3.y,
  };
}

function robots(lt, sc) {
  const s = times(sc);
  const inP = appear(lt, 0.05, 0.9);

  kicker("the body", 110, 168, C.coral, inP);
  text("The", 110, 272, { size: 76, weight: 500, ls: -2.6, alpha: inP });
  text("body.", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: inP });

  // Canvas layer.
  const layerIn = smooth(span(lt, s[1].start - 0.2, s[1].start + 0.9));
  if (layerIn > 0) {
    ctx.save();
    ctx.globalAlpha *= layerIn * 0.7;
    rrect(220, 430, 1500, 540, 18);
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = withAlpha(C.coral, 0.3);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
    mono("CANVAS 2D · DPR SCALED", 240, 462, { size: 12, color: C.coral, ls: 2.2, alpha: layerIn * 0.9 });
  }

  // Terminal rows and their small companions.
  const rowsIn = smooth(span(lt, s[1].start + 0.2, s[1].start + 1.1));
  if (rowsIn > 0) {
    text("DOM", 240, 678, { size: 12, family: F.mono, color: C.faint, ls: 2.2, alpha: rowsIn });
    TASK_DATA.forEach((task, i) => {
      const y = 700 + i * 62;
      const p = smooth(span(lt, s[1].start + 0.25 + i * 0.12, s[1].start + 0.8 + i * 0.12));
      line(300, y, 1640, y, "rgba(244,241,234,0.09)", 1, null, p);
      text(task.label, 320, y + 26, { size: 15, family: F.mono, color: C.dim, alpha: p });
      mono(task.meta, 480, y + 26, { size: 12, color: C.faint, alpha: p * 0.7 });

      const mini = smooth(span(lt, s[1].start + 0.45 + i * 0.14, s[1].start + 0.95 + i * 0.14));
      const miniOut = 1 - 0.65 * smooth(span(lt, s[3].start + 0.2, s[3].start + 0.9));
      if (mini > 0) {
        robot(1080, y - 12 + Math.sin(lt * 2.2 + i) * 3, 1.15, {
          alpha: mini * miniOut * 0.45,
          t: lt,
          seed: i * 1.3,
          working: false,
        });
      }

      const done = smooth(span(lt, s[3].start + i * 0.24, s[3].start + 0.52 + i * 0.24));
      if (done > 0) {
        checkMark(1568, y + 21, 12, 1, C.coral, done, 2);
        mono("fixed", 1584, y + 26, { size: 11, color: C.coral, align: "right", ls: 1.4, alpha: done });
      } else {
        mono("waiting", 1616, y + 26, { size: 11, color: C.faint, align: "right", ls: 1.4, alpha: p * 0.6 });
      }
    });
  }

  // Hero robot on the first sentence.
  const heroOut = 1 - smooth(span(lt, s[1].start + 0.2, s[1].start + 0.9));
  if (heroOut > 0) {
    const p = appear(lt, s[0].start + 0.1, 0.9);
    const bob = Math.sin(lt * 2.4) * 4;
    glow(850, 500, 190, C.coral, 0.14 * p);
    robot(850, 500 + bob, 4.4, { alpha: p * heroOut, t: lt, working: false, seed: 1.4 });
    ring(850, 500, 132, withAlpha(C.coral, 0.2), 1, p, [2, 9]);
    ring(850, 500, 164, withAlpha(C.peach, 0.12), 1, p, [2, 9]);
    mono("one body per check", 850, 676, { size: 13, color: C.faint, align: "center", ls: 2, alpha: p * heroOut });
  }

  // The path.
  const pathIn = smooth(span(lt, s[2].start - 0.3, s[2].start + 0.9));
  if (pathIn > 0) {
    line(CUBIC.p0.x, CUBIC.p0.y, CUBIC.p1.x, CUBIC.p1.y, withAlpha(C.coral, 0.18), 1, [4, 6], pathIn);
    line(CUBIC.p3.x, CUBIC.p3.y, CUBIC.p2.x, CUBIC.p2.y, withAlpha(C.coral, 0.18), 1, [4, 6], pathIn);
    for (const [p, name] of [
      [CUBIC.p0, "P0"],
      [CUBIC.p1, "P1"],
      [CUBIC.p2, "P2"],
      [CUBIC.p3, "P3"],
    ]) {
      dot(p.x, p.y, 4, name === "P0" || name === "P3" ? C.coral : C.peach, pathIn, 6);
      mono(name, p.x + 12, p.y - 10, { size: 11, color: C.faint, alpha: pathIn * 0.8 });
    }
    const pts = [];
    const drawP = smooth(span(lt, s[2].start, s[2].start + 1.6));
    for (let i = 0; i <= 80; i++) {
      if (i / 80 > drawP) break;
      const p = cubicAt(i / 80);
      pts.push([p.x, p.y]);
    }
    if (pts.length > 1) curve(pts, withAlpha(C.coral, 0.8), 2, 1);
    mono("B(t) = (1−t)³P₀ + 3(1−t)²tP₁ + 3(1−t)t²P₂ + t³P₃", 300, 1006, {
      size: 19,
      family: F.serif,
      style: "italic",
      color: C.dim,
      alpha: pathIn * 0.9,
    });
  }

  // Caret.
  const caretIn = smooth(span(lt, s[2].start - 0.4, s[2].start + 0.5));
  if (caretIn > 0) {
    ctx.save();
    ctx.globalAlpha *= caretIn * (0.6 + 0.4 * Math.abs(Math.sin(lt * 4.4)));
    ctx.fillStyle = C.coral;
    ctx.fillRect(CUBIC.p0.x - 4, CUBIC.p0.y - 16, 8, 28);
    ctx.restore();
    mono("caret", CUBIC.p0.x - 8, CUBIC.p0.y + 36, { size: 11, color: C.coral, alpha: caretIn, ls: 1.4 });
  }

  // The travelling robot.
  const travelStart = s[2].start + 0.8;
  const travelDur = 2.4;
  const travelP = clamp((lt - travelStart) / travelDur, 0, 1);
  const arrived = lt >= travelStart + travelDur;
  if (lt > travelStart && pathIn > 0) {
    const p = cubicAt(easeInOut(travelP));
    if (!arrived) {
      for (let i = 0; i < 3; i++) {
        const tp = clamp(travelP - (i + 1) * 0.05, 0, 1);
        const pp = cubicAt(easeInOut(tp));
        dot(pp.x, pp.y + 10, 2.4 - i * 0.5, C.coral, pathIn * (0.3 - i * 0.08));
      }
    }
    const bob = arrived ? Math.sin(lt * 2.7) * 2 : 0;
    robot(p.x, p.y + bob, 3.6, {
      alpha: pathIn * (1 - smooth(span(lt, s[4].start + 0.4, s[4].start + 1.0))),
      t: lt,
      working: arrived,
      seed: 0.7,
    });
  }

  // Work and checkmark.
  const workIn = smooth(span(lt, s[3].start, s[3].start + 0.6));
  if (workIn > 0) {
    sparks(CUBIC.p3.x + 8, CUBIC.p3.y - 18, lt, workIn);
    const cp = smooth(span(lt, s[3].start + 0.55, s[3].start + 1.2));
    checkMark(CUBIC.p3.x + 92, CUBIC.p3.y - 94, 48, cp, C.coral, 1, 3.2);
    if (lt > s[3].start + 0.6) {
      ring(CUBIC.p3.x + 92, CUBIC.p3.y - 94, 32 + 10 * Math.sin(lt * 3), withAlpha(C.coral, 0.4), 1.2, workIn);
    }
  }

  // Lifecycle annotations along the path.
  const phaseIn = smooth(span(lt, s[4].start - 0.2, s[4].start + 0.9));
  if (phaseIn > 0) {
    const chips = [
      { name: "spawn", dur: "0.32s", x: 300, y: 544, tx: CUBIC.p0.x + 20, ty: CUBIC.p0.y - 26, color: C.peach },
      { name: "travel", dur: "0.72s", x: 690, y: 336, tx: 870, ty: 410, color: C.coral },
      { name: "work", dur: "1.8s", x: 1410, y: 520, tx: CUBIC.p3.x + 54, ty: CUBIC.p3.y - 54, color: C.coral },
    ];
    chips.forEach((chip, i) => {
      const p = smooth(span(lt, s[4].start + i * 0.22, s[4].start + 0.55 + i * 0.22));
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha *= p;
      line(chip.x + 64, chip.y + 54, chip.tx, chip.ty, withAlpha(chip.color, 0.3), 1, [3, 5]);
      panel(chip.x, chip.y, 128, 54, {
        r: 8,
        fill: "rgba(8,13,22,0.84)",
        stroke: withAlpha(chip.color, 0.3),
        lw: 1,
      });
      text(chip.name, chip.x + 14, chip.y + 23, { size: 12, family: F.mono, color: chip.color, ls: 1 });
      text(chip.dur, chip.x + 14, chip.y + 42, { size: 15, family: F.mono, color: C.ink });
      ctx.restore();
    });
    mono("one robot, in seconds", 300, 514, { size: 12, color: C.faint, ls: 1.8, alpha: phaseIn });
  }
}

// ---------------------------------------------------------------- 06 clock

function clockScene(lt, sc) {
  const s = times(sc);
  const inP = appear(lt, 0.05, 0.9);

  kicker("the machine", 110, 168, C.coral, inP);
  text("The", 110, 272, { size: 76, weight: 500, ls: -2.6, alpha: inP });
  text("clock.", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: inP });

  // RAF node.
  const cx = 310;
  const cy = 570;
  const ringP = 0.5 + 0.5 * Math.sin(lt * 4.2);
  ring(cx, cy, 92, withAlpha(C.coral, 0.18), 1.2, inP, [2, 8]);
  ring(cx, cy, 70, withAlpha(C.coral, 0.55), 1.4, inP);
  glow(cx, cy, 120, C.coral, 0.12);
  dot(cx, cy, 6, C.coral, inP, 14);
  text("RAF", cx, cy + 8, { size: 26, weight: 500, family: F.mono, align: "center", color: C.ink, alpha: inP });
  mono("one frame", cx, cy + 112, { size: 12, color: C.faint, align: "center", ls: 1.8, alpha: inP });
  // rotating arc
  ctx.save();
  ctx.globalAlpha *= inP;
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, 104, lt * 2.2, lt * 2.2 + 0.7);
  ctx.stroke();
  ctx.restore();

  // Lanes.
  const lanesIn = smooth(span(lt, s[2].start - 0.5, s[2].start + 1.0));
  const laneX = 540;
  const laneW = 1180;
  const lanes = [
    { y: 430, name: "timeline", color: C.peach },
    { y: 740, name: "canvas", color: C.mint },
  ];
  lanes.forEach((lane, li) => {
    line(laneX, lane.y, laneX + laneW, lane.y, "rgba(244,241,234,0.12)", 1, null, lanesIn);
    line(cx + 92, cy, laneX - 50, lane.y, withAlpha(lane.color, 0.22), 1.2, [3, 7], lanesIn);
    mono(lane.name, 110, lane.y + 5, { size: 13, color: lane.color, ls: 2, alpha: lanesIn });
    mono(lane.name === "timeline" ? "waits · beats · gaps" : "robots · dust · sparks", laneX, lane.y + 28, {
      size: 11,
      color: C.faint,
      alpha: lanesIn * 0.6,
    });
    // One clock sends pulses down both connectors.
    for (let k = 0; k < 2; k++) {
      const pp = (lt * 0.8 + k * 0.5 + li * 0.24) % 1;
      const px = lerp(cx + 92, laneX - 50, pp);
      const py = lerp(cy, lane.y, pp);
      glow(px, py, 18, lane.color, 0.14 * lanesIn);
      dot(px, py, 3.2, lane.color, lanesIn * 0.8, 8);
    }
  });

  // Pause window.
  const pauseStart = s[3].start + 0.4;
  const resumeStart = s[4].start + 0.5;
  const playT = lt < pauseStart ? lt - s[2].start : lt < resumeStart ? pauseStart - s[2].start : (lt - s[2].start) - (resumeStart - pauseStart);
  const play = clamp(playT / 7.5, 0, 1);
  const paused = lt >= pauseStart && lt < resumeStart;

  // Task blocks on the timeline lane.
  const blocksIn = smooth(span(lt, s[2].start - 0.1, s[2].start + 0.8));
  if (blocksIn > 0) {
    const total = TASK_DATA.reduce((n, t) => n + t.duration, 0);
    let x = laneX + 20;
    const by = 390;
    let elapsed = 0;
    TASK_DATA.forEach((task) => {
      const w = (task.duration / total) * (laneW - 60);
      const startP = elapsed / total;
      const endP = (elapsed + task.duration) / total;
      const active = play >= startP && play < endP;
      const done = play >= endP;
      const color = done ? C.coral : active ? C.peach : C.faint;
      rrect(x, by, w - 8, 54, 8);
      ctx.fillStyle = done ? withAlpha(C.coral, 0.22) : active ? withAlpha(C.peach, 0.24) : "rgba(255,255,255,0.05)";
      ctx.fill();
      ctx.strokeStyle = withAlpha(color, done ? 0.55 : active ? 0.7 : 0.22);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      text(task.label, x + 14, by + 34, { size: 16, family: F.mono, color: done ? C.coral : active ? C.ink : C.dim, alpha: blocksIn });
      if (done) checkMark(x + w - 32, by + 27, 14, 1, C.coral, blocksIn, 2);
      x += w;
      elapsed += task.duration;
    });
    // Playhead.
    const px = laneX + 20 + play * (laneW - 80);
    line(px, 368, px, 468, withAlpha(C.coral, 0.7), 1.4, null, blocksIn);
    dot(px, 368, 5, C.coral, blocksIn, 10);
    mono("playhead", px + 10, 360, { size: 10, color: C.coral, alpha: blocksIn * 0.7, ls: 1.4 });
  }

  // Canvas lane: dust + a robot.
  if (lanesIn > 0) {
    const px = laneX + 20 + play * (laneW - 80);
    for (let i = 0; i < 18; i++) {
      const base = (i * 137.5) % 1;
      const x = laneX + 40 + ((base * laneW + lt * 7) % (laneW - 80));
      const y = 700 + ((i * 47) % 70);
      dot(x, y, 1.2 + (i % 3) * 0.4, i % 4 === 0 ? C.peach : C.mint, lanesIn * 0.3);
    }
    robot(px, 700, 3.0, { alpha: lanesIn, t: lt, working: false, seed: 2.2 });
    mono("same dt", px + 26, 760, { size: 11, color: C.mint, alpha: lanesIn * 0.7, ls: 1.4 });
  }

  // The queue.
  const queueIn = smooth(span(lt, s[1].start - 0.2, s[1].start + 0.9));
  if (queueIn > 0) {
    const qx = 110;
    const qy = 790;
    panel(qx, qy, 380, 190, { r: 12, fill: "rgba(255,255,255,0.015)", stroke: "rgba(244,241,234,0.1)", alpha: queueIn });
    mono("frame queue", qx + 18, qy + 28, { size: 11, color: C.faint, ls: 2, alpha: queueIn });
    const waits = [
      ["wait(1800)", 0.72],
      ["wait(1600)", 0.48],
      ["wait(2200)", 0.3],
    ];
    waits.forEach(([name, len], i) => {
      const y = qy + 52 + i * 40;
      mono(name, qx + 18, y + 13, { size: 12, color: C.dim, alpha: queueIn });
      rrect(qx + 132, y + 2, 210, 8, 4);
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fill();
      const drain = 0.12 + 0.78 * (1 - ((lt * 0.22 + i * 0.31) % 1));
      rrect(qx + 132, y + 2, 210 * len * drain, 8, 4);
      ctx.fillStyle = withAlpha(C.coral, 0.65);
      ctx.fill();
    });
  }

  // Visibility gate.
  const gateIn = smooth(span(lt, s[3].start - 0.3, s[3].start + 0.6));
  if (gateIn > 0) {
    const gx = 1320;
    ctx.save();
    ctx.globalAlpha *= gateIn;
    line(gx, 340, gx, 820, withAlpha(C.peach, 0.45), 1.4, [6, 6]);
    dot(gx, 338, 5, C.peach, gateIn, 8);
    mono("visibility gate", gx + 14, 330, { size: 11, color: C.peach, ls: 1.6, alpha: gateIn });
    if (paused) {
      rrect(gx + 22, 540, 180, 46, 8);
      ctx.fillStyle = withAlpha(C.peach, 0.12);
      ctx.fill();
      ctx.strokeStyle = withAlpha(C.peach, 0.4);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      text("paused", gx + 112, 570, { size: 17, family: F.mono, color: C.peach, align: "center" });
    } else if (lt >= resumeStart) {
      mono("resumed", gx + 22, 570, { size: 12, color: C.coral, ls: 1.8 });
    }
    ctx.restore();
  }

  // Code snippets.
  const codeIn = smooth(span(lt, s[2].start + 0.6, s[2].start + 1.3));
  if (codeIn > 0) {
    mono("const dt = Math.min((now - lastFrame) / 1000, 0.25);", 540, 872, {
      size: 15,
      color: C.dim,
      alpha: codeIn,
    });
    mono("requestAnimationFrame(frame);", 540, 902, {
      size: 15,
      color: withAlpha(C.coral, 0.8),
      alpha: codeIn,
    });
  }

  // Frozen shading while paused.
  if (paused) {
    const p = smooth(span(lt, pauseStart, pauseStart + 0.4));
    ctx.save();
    ctx.globalAlpha *= p * 0.35;
    ctx.fillStyle = "#070a15";
    ctx.fillRect(laneX + 20, 360, laneW - 40, 430);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- 07 sound

function soundScene(lt, sc) {
  const s = times(sc);
  const inP = appear(lt, 0.05, 0.9);

  kicker("the quiet layer", 110, 168, C.coral, inP);
  text("The", 110, 272, { size: 76, weight: 500, ls: -2.6, alpha: inP });
  text("quiet", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: inP });
  text("layer.", 110, 428, { size: 76, weight: 500, ls: -2.6, alpha: inP });

  // Graph.
  const graphIn = smooth(span(lt, s[1].start - 0.5, s[1].start + 0.9));
  const gx = 560;
  const gy = 250;
  const nodes = [
    { name: "VOICE", sub: "osc + noise", w: 260, color: C.peach, kind: "wave" },
    { name: "FILTER", sub: "bandpass", w: 210, color: C.coral, kind: "filter" },
    { name: "GAIN", sub: "master", w: 180, color: C.mint, kind: "gain" },
    { name: "COMP", sub: "5:1", w: 190, color: C.violet, kind: "comp" },
    { name: "OUT", sub: "speakers", w: 180, color: C.coral, kind: "out" },
  ];
  let x = gx;
  const nodeY = gy;
  const nodeH = 170;
  nodes.forEach((node, i) => {
    const p = smooth(span(lt, s[1].start - 0.3 + i * 0.22, s[1].start + 0.5 + i * 0.22));
    if (p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= p;
    panel(x, nodeY, node.w, nodeH, {
      r: 13,
      fill: "rgba(8,14,23,0.82)",
      stroke: withAlpha(node.color, 0.26),
      lw: 1.2,
      glow: withAlpha(node.color, 0.12),
    });
    mono(node.name, x + 18, nodeY + 28, { size: 12, color: node.color, ls: 2, alpha: p });
    mono(node.sub, x + 18, nodeY + 48, { size: 10, color: C.faint, alpha: p * 0.75 });
    drawNodeGlyph(node.kind, x + node.w / 2, nodeY + 108, node.w * 0.56, node.color, p, lt);
    ctx.restore();
    if (i < nodes.length - 1) {
      const nx = x + node.w;
      const ex = x + node.w + 34;
      arrow(nx + 4, nodeY + nodeH / 2, ex - 4, nodeY + nodeH / 2, withAlpha(node.color, 0.4), 1.2, 7, p);
    }
    x += node.w + 38;
  });

  // Gesture gate.
  const gateIn = smooth(span(lt, s[0].start + 0.2, s[0].start + 1.0));
  if (gateIn > 0) {
    const gxp = 566;
    const gyp = 530;
    mono("user gesture", gxp, gyp + 48, { size: 12, color: C.peach, ls: 1.8, alpha: gateIn });
    dot(gxp + 6, gyp + 18, 7, C.peach, gateIn, 10);
    mono("unlock()", gxp + 24, gyp + 23, { size: 15, color: C.ink, alpha: gateIn });
    arrow(gxp + 110, gyp + 18, gxp + 190, gyp + 18, withAlpha(C.peach, 0.4), 1.2, 6, gateIn);
    mono("AudioContext", gxp + 210, gyp + 23, { size: 13, color: C.faint, alpha: gateIn });
  }

  // Event strip.
  const stripIn = smooth(span(lt, s[2].start - 0.4, s[2].start + 0.9));
  if (stripIn > 0) {
    const sx = 560;
    const sy = 600;
    const sw = 1250;
    const sh = 250;
    panel(sx, sy, sw, sh, { r: 14, fill: "rgba(255,255,255,0.014)", stroke: "rgba(244,241,234,0.09)", alpha: stripIn });
    mono("synthesized events", sx + 22, sy + 28, { size: 11, color: C.faint, ls: 2, alpha: stripIn });
    const events = [
      { name: "key", x: 0.08, color: C.dim, glyph: "click" },
      { name: "spawn", x: 0.3, color: C.peach, glyph: "blip" },
      { name: "spark", x: 0.52, color: C.coral, glyph: "tick" },
      { name: "fixed", x: 0.74, color: C.coral, glyph: "ping" },
      { name: "complete", x: 0.9, color: C.mint, glyph: "chord" },
    ];
    const cyc = (lt * 0.3) % 1;
    events.forEach((ev, i) => {
      const px = sx + 40 + ev.x * (sw - 80);
      const p = smooth(span(lt, s[2].start + i * 0.42, s[2].start + 0.85 + i * 0.42));
      if (p <= 0) return;
      line(px, sy + 52, px, sy + 196, withAlpha(ev.color, 0.25), 1, [2, 5], stripIn);
      dot(px, sy + 116, 5, ev.color, p, 8);
      text(ev.name, px, sy + 72, { size: 16, family: F.mono, color: ev.color, align: "center", alpha: p });
      drawEventGlyph(ev.glyph, px, sy + 152, ev.color, p, lt, i);
      mono(`${(0.1 + i * 0.22).toFixed(2)}s`, px, sy + 208, { size: 10, color: C.faint, align: "center", alpha: p * 0.7 });
    });
    // playhead
    const phx = sx + 40 + cyc * (sw - 80);
    line(phx, sy + 44, phx, sy + 212, withAlpha(C.coral, 0.45), 1.2, null, stripIn);
  }

  // Claims.
  const claims = [
    ["0 audio files", C.coral],
    ["no autoplay", C.peach],
    ["gesture only", C.mint],
  ];
  claims.forEach(([str, color], i) => {
    const p = smooth(span(lt, s[3].start + i * 0.3, s[3].start + 0.75 + i * 0.3));
    if (p <= 0) return;
    const y = 640 + i * 62;
    rrect(110, y - 22, 340, 40, 8);
    ctx.fillStyle = withAlpha(color, 0.055);
    ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.25);
    ctx.lineWidth = 1;
    ctx.stroke();
    checkMark(136, y - 2, 13, 1, color, p, 2);
    mono(str, 160, y + 4, { size: 14, color: C.dim, alpha: p });
  });

  // Mute.
  const muteIn = smooth(span(lt, s[4].start - 0.1, s[4].start + 0.8));
  if (muteIn > 0) {
    const mx = 1640;
    const my = 176;
    ctx.save();
    ctx.globalAlpha *= muteIn;
    panel(mx, my, 148, 54, { r: 9, fill: "rgba(255,255,255,0.03)", stroke: withAlpha(C.coral, 0.24), alpha: muteIn });
    text("MUTE", mx + 20, my + 35, { size: 14, family: F.mono, color: C.coral, ls: 2 });
    rrect(mx + 92, my + 16, 38, 20, 10);
    ctx.fillStyle = withAlpha(C.coral, 0.35);
    ctx.fill();
    dot(mx + 118, my + 26, 7, C.coral, muteIn, 8);
    ctx.restore();
    mono("master gain → 0", 1640, 246, { size: 12, color: C.faint, alpha: muteIn * 0.8, ls: 1.4 });
    // flat line across the strip, but the checks keep coming
    line(560, 880, 1810, 880, withAlpha(C.coral, 0.35), 1.2, null, muteIn);
    for (let i = 0; i < 4; i++) {
      checkMark(720 + i * 112, 880, 14, 1, C.coral, muteIn * 0.85, 2);
    }
    mono("the run keeps its rhythm", 1810, 910, { size: 12, color: C.faint, align: "right", alpha: muteIn * 0.7, ls: 1.4 });
  }
}

function drawNodeGlyph(kind, x, y, w, color, alpha, t) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  if (kind === "wave") {
    for (let i = 0; i < 3; i++) {
      const yy = y - 18 + i * 18;
      ctx.beginPath();
      for (let k = 0; k <= 50; k++) {
        const p = k / 50;
        const px = x - w / 2 + p * w;
        const v = Math.sin(p * 4 + t * 2 + i) * 0.5;
        const py = yy + v * 6;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.globalAlpha *= 0.7;
      ctx.stroke();
      ctx.globalAlpha /= 0.7;
    }
  } else if (kind === "filter") {
    ctx.beginPath();
    for (let k = 0; k <= 60; k++) {
      const p = k / 60;
      const px = x - w / 2 + p * w;
      const v = 1 / (1 + Math.exp(-(p - 0.5) * 14));
      const py = y + 20 - v * 40;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (kind === "gain") {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + 20);
    ctx.lineTo(x + w / 2, y - 20);
    ctx.stroke();
    dot(x + w * 0.16, y - 4, 3.5, color, alpha, 6);
  } else if (kind === "comp") {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + 24);
    ctx.lineTo(x - w * 0.08, y + 24);
    ctx.quadraticCurveTo(x + w * 0.2, y + 24, x + w * 0.42, y - 22);
    ctx.stroke();
    line(x - w / 2, y + 24, x + w / 2, y - 24, withAlpha(color, 0.2), 1, [3, 5], alpha);
  } else {
    // speaker
    ctx.beginPath();
    ctx.moveTo(x - w * 0.28, y - 10);
    ctx.lineTo(x - w * 0.12, y - 10);
    ctx.lineTo(x + w * 0.04, y - 24);
    ctx.lineTo(x + w * 0.04, y + 24);
    ctx.lineTo(x - w * 0.12, y + 10);
    ctx.lineTo(x - w * 0.28, y + 10);
    ctx.closePath();
    ctx.fill();
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(x + w * 0.06, y, 8 + i * 10, -0.7, 0.7);
      ctx.globalAlpha = alpha * (0.6 - i * 0.12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawEventGlyph(kind, x, y, color, alpha, t, seed) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  if (kind === "click") {
    for (let i = 0; i < 4; i++) {
      line(x - 14 + i * 9, y - 6, x - 14 + i * 9, y + 6, color, 1.2, null, alpha * 0.6);
    }
  } else if (kind === "blip") {
    for (let i = 0; i <= 40; i++) {
      const p = i / 40;
      const px = x - 22 + p * 44;
      const py = y - Math.sin(p * Math.PI * 2) * (1 - p) * 15;
      if (i === 0) ctx.beginPath();
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (kind === "tick") {
    for (let i = 0; i < 7; i++) {
      const px = x - 18 + i * 6;
      line(px, y - 7 - (i % 3) * 4, px, y + 7 + (i % 2) * 5, color, 1, null, alpha * 0.7);
    }
  } else if (kind === "ping") {
    ring(x, y, 8, color, 1.2, alpha * 0.7);
    ring(x, y, 16, color, 1, alpha * 0.4);
    dot(x, y, 2.5, color, alpha, 5);
  } else {
    for (let i = 0; i < 4; i++) {
      line(x - 20 + i * 12, y - 8, x - 20 + i * 12, y + 8, color, 1.2, null, alpha * 0.6);
    }
    line(x - 26, y - 12, x + 26, y - 12, withAlpha(color, 0.3), 1, null, alpha);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- 08 compression

function compression(lt, sc) {
  const s = times(sc);
  const inP = appear(lt, 0.05, 0.9);

  kicker("the compression", 110, 168, C.coral, inP);
  text("Two", 110, 272, { size: 76, weight: 500, ls: -2.6, alpha: inP });
  text("clocks.", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: inP });
  mono("one story, two durations", 110, 400, { size: 14, color: C.faint, ls: 1.8, alpha: inP });

  // Narrative clock.
  const narrIn = smooth(span(lt, s[0].start + 0.2, s[0].start + 1.0));
  text("2:14", 1510, 300, { size: 92, weight: 500, family: F.mono, align: "right", color: C.ink, alpha: narrIn });
  mono("what the terminal says", 1510, 336, { size: 12, color: C.faint, align: "right", ls: 1.8, alpha: narrIn });
  const narrBar = { x: 660, y: 380, w: 850, h: 56 };
  rrect(narrBar.x, narrBar.y, narrBar.w, narrBar.h, 8);
  ctx.strokeStyle = withAlpha(C.dim, 0.22);
  ctx.lineWidth = 1;
  ctx.stroke();
  const narrTotal = TASK_DATA.reduce((n, t) => n + t.duration, 0);
  let nx = narrBar.x;
  TASK_DATA.forEach((task, i) => {
    const p = smooth(span(lt, s[0].start + 0.3 + i * 0.12, s[0].start + 1.0 + i * 0.12));
    const w = (task.duration / narrTotal) * narrBar.w - 4;
    rrect(nx, narrBar.y, w, narrBar.h, 6);
    ctx.fillStyle = withAlpha(C.coral, 0.18);
    ctx.fill();
    ctx.strokeStyle = withAlpha(C.coral, 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    text(task.label, nx + 12, narrBar.y + 36, { size: 15, family: F.mono, color: C.ink, alpha: p });
    nx += w + 4;
  });

  // Stage clock.
  const stageIn = smooth(span(lt, s[1].start - 0.1, s[1].start + 0.9));
  text("0:10", 1510, 560, { size: 92, weight: 500, family: F.mono, align: "right", color: C.coral, alpha: stageIn });
  mono("what the stage shows", 1510, 596, { size: 12, color: C.faint, align: "right", ls: 1.8, alpha: stageIn });
  const stageBar = { x: 660, y: 640, w: 380, h: 56 };
  rrect(stageBar.x, stageBar.y, stageBar.w, stageBar.h, 8);
  ctx.strokeStyle = withAlpha(C.coral, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  let sx = stageBar.x;
  TASK_DATA.forEach((task, i) => {
    const p = smooth(span(lt, s[1].start + 0.2 + i * 0.12, s[1].start + 0.9 + i * 0.12));
    const w = (task.duration / narrTotal) * stageBar.w - 4;
    rrect(sx, stageBar.y, w, stageBar.h, 6);
    ctx.fillStyle = withAlpha(C.coral, 0.28);
    ctx.fill();
    ctx.strokeStyle = withAlpha(C.coral, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    text(task.label, sx + 7, stageBar.y + 36, { size: 11, family: F.mono, color: C.ink, alpha: p });
    sx += w + 4;
  });

  // The compression factor.
  const speedIn = smooth(span(lt, s[2].start + 0.1, s[2].start + 0.9));
  if (speedIn > 0) {
    text("13×", 1180, 540, {
      size: 58,
      family: F.mono,
      weight: 500,
      color: C.peach,
      alpha: speedIn,
      align: "center",
    });
    mono("compressed", 1180, 574, { size: 11, color: C.faint, align: "center", ls: 2, alpha: speedIn * 0.8 });
  }

  // Same sequence braces.
  const seqIn = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.8));
  if (seqIn > 0) {
    line(660, 730, 1510, 730, withAlpha(C.coral, 0.28), 1, null, seqIn);
    mono("same four blocks · same order", 660, 764, { size: 13, color: C.coral, ls: 1.8, alpha: seqIn });
    // connecting guide lines
    for (let i = 0; i < 5; i++) {
      const x = 660 + (i / 4) * 840;
      line(x, 404, x, 700, withAlpha(C.coral, 0.06), 1, [2, 8], seqIn);
    }
  }

  // State machine.
  const machineIn = smooth(span(lt, s[3].start - 0.2, s[3].start + 0.9));
  if (machineIn > 0) {
    const states = ["idle", "typing", "running", "complete"];
    const startX = 660;
    const y = 900;
    const gap = 250;
    states.forEach((name, i) => {
      const p = smooth(span(lt, s[3].start + 0.1 + i * 0.24, s[3].start + 0.7 + i * 0.24));
      const x = startX + i * gap;
      const active = i === 2;
      rrect(x, y - 26, 150, 52, 26);
      ctx.fillStyle = active ? withAlpha(C.coral, 0.13) : "rgba(255,255,255,0.025)";
      ctx.fill();
      ctx.strokeStyle = active ? withAlpha(C.coral, 0.55) : withAlpha(C.dim, 0.18);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      text(name, x + 75, y + 6, {
        size: 15,
        family: F.mono,
        color: active ? C.coral : C.dim,
        align: "center",
        alpha: p,
      });
      if (i < states.length - 1) {
        arrow(x + 160, y, x + gap - 12, y, withAlpha(C.coral, 0.32), 1.2, 7, p);
      }
    });
    mono("the state machine", 660, 966, { size: 11, color: C.faint, ls: 1.8, alpha: machineIn * 0.8 });
    mono("idle → typing → running → complete", 1510, 966, { size: 11, color: C.faint, align: "right", ls: 1.8, alpha: machineIn * 0.8 });
  }

  // Live feed.
  const feedIn = smooth(span(lt, s[4].start - 0.2, s[4].start + 0.9));
  if (feedIn > 0) {
    const fx = 110;
    const fy = 786;
    panel(fx, fy, 390, 84, { r: 10, fill: withAlpha(C.peach, 0.055), stroke: withAlpha(C.peach, 0.3), alpha: feedIn });
    mono("SSE / WebSocket", fx + 20, fy + 32, { size: 16, color: C.peach, alpha: feedIn });
    mono("same states · real work", fx + 20, fy + 58, { size: 11, color: C.faint, alpha: feedIn * 0.8 });
    arrow(fx + 398, fy + 42, fx + 508, fy + 82, withAlpha(C.peach, 0.35), 1.2, 7, feedIn);
    mono("task feed", fx + 518, fy + 102, { size: 11, color: C.faint, alpha: feedIn * 0.8 });
  }
}

// ---------------------------------------------------------------- 09 restraint

function restraint(lt, sc) {
  const s = times(sc);
  const inP = appear(lt, 0.05, 0.9);
  const titleFade = 1 - smooth(span(lt, s[3].start - 0.3, s[3].start + 0.7));
  const devicesIn = smooth(span(lt, s[3].start - 0.2, s[3].start + 1.1));
  const splitOut = 1 - smooth(span(lt, s[3].start - 0.3, s[3].start + 0.9));

  kicker("the quiet defaults", 110, 168, C.coral, inP * titleFade);
  text("The", 110, 272, { size: 76, weight: 500, ls: -2.6, alpha: inP * titleFade });
  text("quiet", 110, 350, { size: 76, weight: 500, ls: -2.6, color: C.coral, alpha: inP * titleFade });
  text("defaults.", 110, 428, { size: 76, weight: 500, ls: -2.6, alpha: inP * titleFade });

  // Split panels.
  if (splitOut > 0) {
    const panels = [
      { x: 110, y: 470, w: 800, h: 300, name: "full motion", color: C.coral, robot: true },
      { x: 1010, y: 470, w: 800, h: 300, name: "reduced motion", color: C.faint, robot: false },
    ];
    panels.forEach((p, pi) => {
      const pin = smooth(span(lt, s[0].start + pi * 0.2, s[0].start + 0.9 + pi * 0.2)) * splitOut;
      ctx.save();
      ctx.globalAlpha *= pin;
      panel(p.x, p.y, p.w, p.h, {
        r: 14,
        fill: "rgba(8,13,22,0.7)",
        stroke: withAlpha(p.color, pi === 0 ? 0.28 : 0.16),
        lw: 1.2,
      });
      mono(p.name, p.x + 20, p.y + 30, { size: 11, color: p.color, ls: 2 });
      mono(pi === 0 ? "canvas on" : "canvas off", p.x + p.w - 20, p.y + 30, {
        size: 11,
        color: pi === 0 ? C.coral : C.faint,
        align: "right",
        ls: 1.6,
        alpha: pin,
      });
      TASK_DATA.forEach((task, i) => {
        const ry = p.y + 66 + i * 52;
        line(p.x + 20, ry, p.x + p.w - 20, ry, "rgba(244,241,234,0.08)", 1, null, pin);
        text(task.label, p.x + 30, ry + 24, { size: 15, family: F.mono, color: C.dim, alpha: pin });
        const fixed = i < 2;
        const working = i === 2;
        dot(p.x + p.w - 34, ry + 18, 4, fixed ? C.coral : working ? C.peach : C.faint, pin, fixed ? 8 : 0);
        mono(fixed ? "fixed" : working ? "working" : "waiting", p.x + p.w - 48, ry + 23, {
          size: 10,
          color: fixed ? C.coral : working ? C.peach : C.faint,
          align: "right",
          ls: 1.4,
          alpha: pin * 0.9,
        });
      });
      ctx.restore();
      if (pi === 0) {
        const bob = Math.sin(lt * 2.6) * 4;
        robot(p.x + 640, p.y + 190 + bob, 2.4, { alpha: pin, t: lt, working: false, seed: 1.1 });
      }
    });
  }

  // Motion media query card.
  const codeIn = smooth(span(lt, s[1].start - 0.2, s[1].start + 0.8)) * splitOut;
  if (codeIn > 0) {
    const x = 110;
    const y = 810;
    mono("@media (prefers-reduced-motion: reduce)", x, y, { size: 14, color: C.coral, alpha: codeIn });
    mono("canvas → hidden · statuses → unchanged", x, y + 30, { size: 12, color: C.faint, alpha: codeIn * 0.8 });
  }

  // Keyboard and buttons.
  const keysIn = smooth(span(lt, s[2].start - 0.2, s[2].start + 0.9)) * splitOut;
  if (keysIn > 0) {
    keycap(160, 930, 66, { alpha: keysIn });
    mono("enter", 160, 992, { size: 11, color: C.faint, align: "center", ls: 1.6, alpha: keysIn });
    rrect(280, 902, 210, 54, 8);
    ctx.fillStyle = "rgba(236,231,214,0.92)";
    ctx.fill();
    text("Run the demo", 316, 936, { size: 16, family: F.mono, weight: 600, color: "#0a0d09", alpha: keysIn });
    ctx.save();
    ctx.globalAlpha *= keysIn;
    ctx.strokeStyle = withAlpha(C.coral, 0.65);
    ctx.lineWidth = 2;
    rrect(272, 894, 226, 70, 11);
    ctx.stroke();
    ctx.restore();
    mono("real buttons · visible focus · enter starts", 530, 936, { size: 12, color: C.faint, alpha: keysIn * 0.8 });
  }

  // Devices.
  if (devicesIn > 0) {
    const desk = { x: 110, y: 280, w: 1060, h: 662 };
    const phone = { x: 1300, y: 280, w: 306, h: 662 };
    ctx.save();
    ctx.globalAlpha *= devicesIn;
    mono("1280 × 800 · laptop", desk.x, 252, { size: 12, color: C.faint, ls: 1.6, alpha: devicesIn });
    frame(desk.x, desk.y, desk.w, desk.h, { r: 16, alpha: devicesIn, color: C.coral, glowAlpha: 0.1 });
    image("page", desk.x, desk.y, desk.w, desk.h, devicesIn, 14, 1.002);
    mono("390 × 844 · phone", phone.x + phone.w, 252, {
      size: 12,
      color: C.faint,
      align: "right",
      ls: 1.6,
      alpha: devicesIn,
    });
    frame(phone.x, phone.y, phone.w, phone.h, { r: 28, alpha: devicesIn, color: C.coral, glowAlpha: 0.1 });
    image("mobile", phone.x, phone.y, phone.w, phone.h, devicesIn, 26, 1.002);
    ctx.restore();
  }

  // Final line.
  const finalIn = smooth(span(lt, s[4].start - 0.2, s[4].start + 0.9));
  if (finalIn > 0) {
    text("Restraint is part of the design,", 110, 1012, { size: 24, weight: 400, color: C.dim, alpha: finalIn });
    text("not a fallback.", 470, 1012, {
      size: 28,
      family: F.serif,
      style: "italic",
      color: C.coral,
      alpha: finalIn,
    });
  }
}

// ---------------------------------------------------------------- 10 close

function close(lt, sc) {
  const s = times(sc);
  // The close gets a breath. The previous film has faded before this opens.
  const inP = appear(lt, 0.55, 0.9);
  const finalIn = smooth(span(lt, s[5].start - 0.2, s[5].start + 1.0));

  const tx = 830;
  const ty = 150;
  const tw = 980;
  const th = 691;

  // Terminal.
  const termAlpha = inP * (1 - 0.78 * finalIn);
  frame(tx, ty, tw, th, { r: 18, alpha: termAlpha, color: C.coral, glowAlpha: 0.14 });
  image("terminalComplete", tx, ty, tw, th, termAlpha, 15, 1.002);

  // Facts.
  const factAlpha = inP * (1 - 0.82 * finalIn);
  kicker("one run", 110, 168, C.coral, factAlpha);
  keycap(160, 292, 98, { alpha: factAlpha, p: 0.35 * Math.sin(lt * 2.4) });
  mono("one key press", 250, 300, { size: 15, color: C.dim, ls: 1.6, alpha: factAlpha });

  const checksIn = smooth(span(lt, s[1].start - 0.1, s[1].start + 0.8));
  for (let i = 0; i < 4; i++) {
    const p = smooth(span(lt, s[1].start + i * 0.16, s[1].start + 0.6 + i * 0.16)) * factAlpha;
    const x = 112 + i * 58;
    const y = 430;
    ctx.save();
    ctx.globalAlpha *= p;
    ring(x, y, 17, withAlpha(C.coral, 0.4), 1.2, p);
    checkMark(x, y, 18, 1, C.coral, p, 2.2);
    ctx.restore();
  }
  mono("four checks", 110, 480, { size: 15, color: C.faint, ls: 1.8, alpha: checksIn * factAlpha });

  const fixesIn = smooth(span(lt, s[2].start - 0.1, s[2].start + 0.8));
  text("12", 110, 660, { size: 128, weight: 500, ls: -6, color: C.coral, alpha: fixesIn * factAlpha });
  mono("fixes", 250, 620, { size: 15, color: C.faint, ls: 2, alpha: fixesIn * factAlpha });

  const branchIn = smooth(span(lt, s[3].start - 0.1, s[3].start + 0.8));
  if (branchIn > 0) {
    mono("run/fix-all", 110, 750, { size: 16, color: C.ink, alpha: branchIn * factAlpha });
    dot(256, 745, 4, C.coral, branchIn * factAlpha, 8);
    mono("ready to push", 272, 750, { size: 13, color: C.coral, alpha: branchIn * factAlpha * 0.8 });
  }

  // The last line.
  if (finalIn > 0) {
    // Let the terminal become an echo, not a background.
    ctx.save();
    ctx.globalAlpha *= finalIn * 0.68;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha *= finalIn;
    glow(W / 2, 520, 520, C.coral, 0.09);
    ring(W / 2, 520, 290, withAlpha(C.coral, 0.12), 1, finalIn, [2, 10]);
    revealText("The demo", 960, 510, smooth(span(lt, s[5].start, s[5].start + 0.9)), {
      size: 104,
      weight: 500,
      align: "center",
      ls: -4,
      alpha: finalIn,
    });
    revealText("is the product", 960, 616, smooth(span(lt, s[5].start + 0.35, s[5].start + 1.2)), {
      size: 104,
      weight: 500,
      align: "center",
      ls: -4,
      color: C.coral,
      alpha: finalIn,
    });
    dot(1318, 604, 9, C.coral, finalIn, 14);
    mono("RUN / PROTOTYPE 01", 960, 792, { size: 13, color: C.faint, align: "center", ls: 3, alpha: finalIn * 0.55 });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- export

export const SCENES = {
  intro,
  gesture,
  stage,
  checks,
  robots,
  clock: clockScene,
  sound: soundScene,
  compression,
  restraint,
  close,
};
