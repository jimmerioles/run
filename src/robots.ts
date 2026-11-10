type Point = { x: number; y: number };

type RobotPhase = "spawn" | "travel" | "work" | "celebrate" | "exit";

type Robot = {
  taskId: string;
  rowEl: HTMLElement;
  phase: RobotPhase;
  age: number;
  x: number;
  y: number;
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
  face: 1 | -1;
  scale: number;
  alpha: number;
  seed: number;
  sparkClock: number;
  soundClock: number;
  trailClock: number;
  done: boolean;
};

type ParticleKind = "spark" | "dot" | "trail" | "check" | "ring";

type Particle = {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
};

type Dust = {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  depth: number;
};

export type RobotSceneOptions = {
  onSpark?: () => void;
};

const TAU = Math.PI * 2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const cubicPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number) => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
};

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export class RobotScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly screen: HTMLElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: RobotSceneOptions;
  private readonly observer: ResizeObserver;

  private w = 0;
  private h = 0;
  private baseScale = 1;
  private clock = 0;
  private reduced = false;
  private robots: Robot[] = [];
  private particles: Particle[] = [];
  private dust: Dust[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    screen: HTMLElement,
    options: RobotSceneOptions = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Run: Canvas 2D is unavailable.");

    this.canvas = canvas;
    this.screen = screen;
    this.ctx = ctx;
    this.options = options;

    this.measure();
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(screen);
  }

  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
    if (reduced) {
      this.robots = [];
      this.particles = [];
      this.clear();
    }
  }

  reset(): void {
    this.robots = [];
    this.particles = [];
    this.clear();
  }

  hasLife(): boolean {
    return this.robots.length > 0 || this.particles.length > 0;
  }

  spawn(taskId: string, rowEl: HTMLElement, originEl: HTMLElement): void {
    if (this.reduced || this.w <= 0 || this.h <= 0) return;
    if (this.robots.some((robot) => robot.taskId === taskId && !robot.done)) {
      return;
    }

    const from = this.relativePoint(originEl, 16, 2);
    const to = this.targetFor(rowEl);
    const dx = to.x - from.x;

    const robot: Robot = {
      taskId,
      rowEl,
      phase: "spawn",
      age: 0,
      x: from.x,
      y: from.y,
      from,
      c1: { x: from.x + Math.min(80, Math.max(34, dx * 0.24)), y: from.y + 16 },
      c2: { x: to.x - 62, y: to.y - 45 },
      to,
      face: dx >= 0 ? 1 : -1,
      scale: 0.1,
      alpha: 1,
      seed: Math.random() * 100,
      sparkClock: 0.12,
      soundClock: 0.2,
      trailClock: 0,
      done: false,
    };

    this.robots.push(robot);
    this.burst(from.x, from.y, 7, 60);
    this.emitRing(from.x, from.y - 2, "rgba(157, 255, 120, 0.55)", 3);
  }

  finish(taskId: string): void {
    if (this.reduced) return;
    const robot = this.robots.find(
      (item) => item.taskId === taskId && item.phase !== "exit",
    );
    if (!robot) return;

    robot.phase = "celebrate";
    robot.age = 0;
    robot.scale = 1;
    this.emitCheck(robot.x, robot.y - 7);
    this.emitRing(robot.to.x, robot.to.y + 1, "rgba(157, 255, 120, 0.7)", 4);
    this.burst(robot.to.x, robot.to.y + 5, 8, 52);
  }

  frame(dt: number, _time: number): void {
    if (this.reduced) {
      this.clear();
      return;
    }

    this.clock += dt;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    this.drawDust();
    this.updateParticles(dt);

    for (const robot of this.robots) {
      this.updateRobot(robot, dt);
    }

    this.drawParticleLayer(false);
    for (const robot of this.robots) {
      if (robot.alpha > 0.01) this.drawRobot(robot);
    }
    this.drawParticleLayer(true);

    this.robots = this.robots.filter((robot) => !robot.done);
  }

  private measure(): void {
    const rect = this.screen.getBoundingClientRect();
    const width = Math.max(0, Math.round(rect.width));
    const height = Math.max(0, Math.round(rect.height));
    if (width === 0 || height === 0) return;

    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.w = width;
    this.h = height;
    this.baseScale = width < 520 ? 0.92 : width < 740 ? 1.02 : 1.12;

    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.makeDust();

    for (const robot of this.robots) {
      robot.to = this.targetFor(robot.rowEl);
    }
    this.clear();
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  private makeDust(): void {
    if (this.dust.length && this.w > 0 && this.h > 0) return;
    this.dust = Array.from({ length: 16 }, () => ({
      x: 0.03 + Math.random() * 0.94,
      y: Math.random(),
      size: 0.6 + Math.random() * 1.3,
      speed: 2.5 + Math.random() * 7,
      phase: Math.random() * TAU,
      depth: Math.random(),
    }));
  }

  private relativePoint(el: HTMLElement, offsetX = 0, offsetY = 0): Point {
    const screenRect = this.screen.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left - screenRect.left + rect.width + offsetX,
      y: rect.top - screenRect.top + rect.height / 2 + offsetY,
    };
  }

  private targetFor(rowEl: HTMLElement): Point {
    const screenRect = this.screen.getBoundingClientRect();
    const rect = rowEl.getBoundingClientRect();
    return {
      x: rect.left - screenRect.left + rect.width * 0.66,
      y: rect.top - screenRect.top + rect.height / 2 - 3,
    };
  }

  private updateRobot(robot: Robot, dt: number): void {
    robot.age += dt;

    switch (robot.phase) {
      case "spawn": {
        const k = clamp(robot.age / 0.32, 0, 1);
        robot.scale = Math.max(0.1, easeOutBack(k));
        robot.x = robot.from.x;
        robot.y = robot.from.y + Math.sin(k * Math.PI) * 3;
        if (k >= 1) {
          robot.phase = "travel";
          robot.age = 0;
          robot.scale = 1;
        }
        break;
      }

      case "travel": {
        const k = clamp(robot.age / 0.72, 0, 1);
        const eased = easeInOutCubic(k);
        const point = cubicPoint(
          robot.from,
          robot.c1,
          robot.c2,
          robot.to,
          eased,
        );
        robot.x = point.x;
        robot.y = point.y + Math.sin(k * Math.PI * 3 + robot.seed) * 2.4;
        robot.face = robot.to.x >= robot.from.x ? 1 : -1;

        robot.trailClock -= dt;
        if (robot.trailClock <= 0) {
          robot.trailClock = 0.055;
          this.emitTrail(robot.x, robot.y + 9);
        }

        if (k >= 1) {
          robot.phase = "work";
          robot.age = 0;
          robot.x = robot.to.x;
          robot.y = robot.to.y;
        }
        break;
      }

      case "work": {
        robot.x = robot.to.x + Math.sin(this.clock * 1.9 + robot.seed) * 6;
        robot.y =
          robot.to.y + Math.sin(this.clock * 2.7 + robot.seed * 2.1) * 2 - 2;
        robot.scale += (1 - robot.scale) * Math.min(1, dt * 8);
        robot.face = 1;

        robot.sparkClock -= dt;
        if (robot.sparkClock <= 0) {
          robot.sparkClock = 0.07 + Math.random() * 0.08;
          this.emitSpark(robot.x, robot.y, robot.face);
        }

        robot.soundClock -= dt;
        if (robot.soundClock <= 0) {
          robot.soundClock = 0.33 + Math.random() * 0.3;
          this.options.onSpark?.();
        }
        break;
      }

      case "celebrate": {
        const k = clamp(robot.age / 0.8, 0, 1);
        robot.x = robot.to.x;
        robot.y = robot.to.y - Math.sin(k * Math.PI) * 14;
        robot.scale = 1 + Math.sin(k * Math.PI) * 0.08;
        robot.face = 1;
        if (k >= 1) {
          robot.phase = "exit";
          robot.age = 0;
        }
        break;
      }

      case "exit": {
        const k = clamp(robot.age / 0.62, 0, 1);
        const eased = k * k;
        robot.x = robot.to.x + eased * 130;
        robot.y = robot.to.y - eased * 54 - Math.sin(k * Math.PI) * 4;
        robot.alpha = 1 - Math.pow(k, 1.7);
        robot.scale = 1 - eased * 0.18;
        robot.face = 1;
        robot.trailClock -= dt;
        if (robot.trailClock <= 0 && k < 0.7) {
          robot.trailClock = 0.045;
          this.emitTrail(robot.x, robot.y + 8);
        }
        if (k >= 1) robot.done = true;
        break;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (particle.kind === "spark") {
        particle.vy += 150 * dt;
        particle.vx *= 0.985;
      } else if (particle.kind === "ring") {
        particle.size += dt * 62;
      } else if (particle.kind === "check") {
        particle.vy *= 0.985;
      } else {
        particle.vx *= 0.955;
        particle.vy *= 0.955;
      }

      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rotation += particle.spin * dt;
    }

    if (this.particles.length > 360) {
      this.particles.splice(0, this.particles.length - 360);
    }
  }

  private emitSpark(x: number, y: number, face: 1 | -1): void {
    const amber = Math.random() < 0.18;
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const speed = 22 + Math.random() * 52;
    this.particles.push({
      kind: "spark",
      x: x + face * (5 + Math.random() * 8),
      y: y + 6 + Math.random() * 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.65 + 8,
      life: 0.3 + Math.random() * 0.32,
      maxLife: 0.62,
      size: 0.8 + Math.random() * 1.1,
      color: amber ? "#ffb765" : "#9dff78",
      rotation: 0,
      spin: 0,
    });
  }

  private emitTrail(x: number, y: number): void {
    this.particles.push({
      kind: "trail",
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: 6 + Math.random() * 10,
      life: 0.24 + Math.random() * 0.2,
      maxLife: 0.44,
      size: 0.7 + Math.random() * 1,
      color: "#9dff78",
      rotation: 0,
      spin: 0,
    });
  }

  private burst(x: number, y: number, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      this.particles.push({
        kind: "dot",
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity + 6,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        size: 0.8 + Math.random() * 1.4,
        color: Math.random() < 0.22 ? "#ffb765" : "#9dff78",
        rotation: 0,
        spin: 0,
      });
    }
  }

  private emitCheck(x: number, y: number): void {
    this.particles.push({
      kind: "check",
      x,
      y,
      vx: 0,
      vy: -17,
      life: 0.9,
      maxLife: 0.9,
      size: 1,
      color: "#b9ff9c",
      rotation: 0,
      spin: 0,
    });
  }

  private emitRing(
    x: number,
    y: number,
    color: string,
    size: number,
  ): void {
    this.particles.push({
      kind: "ring",
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.55,
      maxLife: 0.55,
      size,
      color,
      rotation: 0,
      spin: 0,
    });
  }

  private drawDust(): void {
    const ctx = this.ctx;
    ctx.save();
    for (const mote of this.dust) {
      const y =
        (((mote.y * this.h - this.clock * mote.speed) % (this.h + 20)) +
          this.h +
          20) %
          (this.h + 20) -
        10;
      const x =
        mote.x * this.w + Math.sin(this.clock * 0.23 + mote.phase) * 5;
      const twinkle = 0.5 + Math.sin(this.clock * 0.8 + mote.phase) * 0.5;
      ctx.globalAlpha = (0.025 + mote.depth * 0.055) * twinkle;
      ctx.fillStyle = mote.depth > 0.72 ? "#ffcf8f" : "#c7ffad";
      ctx.fillRect(x, y, mote.size, mote.size);
    }
    ctx.restore();
  }

  private drawParticleLayer(foreground: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const particle of this.particles) {
      const isForeground =
        particle.kind === "spark" ||
        particle.kind === "check" ||
        particle.kind === "ring";
      if (isForeground !== foreground) continue;

      const t = clamp(particle.life / particle.maxLife, 0, 1);

      if (particle.kind === "ring") {
        ctx.globalAlpha = t * 0.6;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
        ctx.stroke();
        continue;
      }

      if (particle.kind === "check") {
        const progress = 1 - t;
        const scale = 0.7 + Math.sin(clamp(progress * 2.2, 0, 1) * Math.PI) * 0.4;
        ctx.globalAlpha = Math.min(1, t * 1.8);
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.scale(scale, scale);
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-1, 4);
        ctx.lineTo(6, -5);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (particle.kind === "spark") {
        ctx.globalAlpha = t * 0.9;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = particle.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(
          particle.x - particle.vx * 0.014,
          particle.y - particle.vy * 0.014,
        );
        ctx.stroke();
        continue;
      }

      ctx.globalAlpha = t * (particle.kind === "trail" ? 0.32 : 0.55);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawRobot(robot: Robot): void {
    const ctx = this.ctx;
    const working = robot.phase === "work";
    const celebrating = robot.phase === "celebrate";
    const tilt =
      Math.sin(this.clock * 3.1 + robot.seed) * 0.045 +
      (celebrating ? Math.sin(clamp(robot.age / 0.8, 0, 1) * Math.PI) * 0.16 : 0);
    const armSwing = working
      ? Math.sin(this.clock * 9 + robot.seed) * 3.4
      : Math.sin(this.clock * 2.3 + robot.seed) * 1.1;

    ctx.save();
    ctx.translate(robot.x, robot.y);
    ctx.rotate(tilt);
    ctx.scale(robot.face * this.baseScale * robot.scale, this.baseScale * robot.scale);
    ctx.globalAlpha = robot.alpha;

    // Hover bloom beneath the body.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(0, 14, 0, 0, 14, 22);
    glow.addColorStop(0, "rgba(157, 255, 120, 0.16)");
    glow.addColorStop(1, "rgba(157, 255, 120, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 14, 23, 8, 0, 0, TAU);
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

    // Antenna and its amber lamp.
    ctx.strokeStyle = "#c9c3b0";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(3.3, -8.2);
    ctx.quadraticCurveTo(5, -11.5, 4.7, -13.2);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = "rgba(255, 183, 101, 0.9)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#ffb765";
    ctx.beginPath();
    ctx.arc(4.7, -13.7, 1.4, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Body.
    const body = ctx.createLinearGradient(0, -10, 0, 10);
    body.addColorStop(0, "#f7f1df");
    body.addColorStop(0.55, "#ded8c5");
    body.addColorStop(1, "#b9b3a0");
    roundedPath(ctx, -10, -9, 20, 18, 6);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = "rgba(4, 8, 5, 0.55)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Top edge highlight.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-6, -8.1);
    ctx.lineTo(5, -8.1);
    ctx.stroke();

    // Visor.
    roundedPath(ctx, -7.4, -4.6, 14.8, 8.2, 2.8);
    ctx.fillStyle = "#050c07";
    ctx.fill();
    ctx.strokeStyle = "rgba(157, 255, 120, 0.2)";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Eyes blink on a slow, slightly random cycle.
    const blinkCycle = (this.clock + robot.seed * 1.7) % 4.4;
    const blinking = blinkCycle < 0.1;
    const eyeHeight = blinking ? 0.5 : 1.9;
    ctx.save();
    ctx.shadowColor = "rgba(157, 255, 120, 0.85)";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#a8ff86";
    roundedPath(ctx, -4.2, -1.1, 2.4, eyeHeight, 1);
    ctx.fill();
    roundedPath(ctx, 1.8, -1.1, 2.4, eyeHeight, 1);
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
    ctx.fillStyle = working ? "#ffb765" : "rgba(157, 255, 120, 0.8)";
    ctx.beginPath();
    ctx.arc(6.8, 2.9, 0.9, 0, TAU);
    ctx.fill();

    // Hover jets.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(157, 255, 120, 0.55)";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    const jet = 2 + Math.sin(this.clock * 14 + robot.seed) * 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 10.4);
    ctx.lineTo(-4.8, 10.4 + jet);
    ctx.moveTo(4, 10.4);
    ctx.lineTo(4.8, 10.4 + jet);
    ctx.stroke();
    ctx.restore();

    // Work beam: a faint little inspection cone onto the row.
    if (working) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(157, 255, 120, 0.16)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);
      ctx.lineDashOffset = -this.clock * 11;
      ctx.beginPath();
      ctx.moveTo(-4, 11);
      ctx.lineTo(-8, 20);
      ctx.moveTo(4, 11);
      ctx.lineTo(8, 20);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}
