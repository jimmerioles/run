/**
 * Run's tiny synthesizer. No audio files: key clicks, robot blips, sparks,
 * task pings, and a final chime are built from oscillators and filtered noise.
 * The context is created only from a user gesture.
 */

type AudioCtor = typeof AudioContext;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private readonly level = 0.72;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }

    const Ctor: AudioCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor({ latencyHint: "interactive" });

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.level;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -26;
    comp.knee.value = 10;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.22;

    master.connect(comp);
    comp.connect(ctx.destination);

    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.22));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const fade = 1 - i / length;
      data[i] = (Math.random() * 2 - 1) * fade * fade;
    }

    this.ctx = ctx;
    this.master = master;
    this.noise = buffer;

    if (ctx.state === "suspended") void ctx.resume();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    if (ctx.state === "suspended" && !muted) void ctx.resume();
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(muted ? 0 : this.level, now, 0.015);
  }

  /** A soft mechanical typing tick. */
  key(): void {
    const ctx = this.ctx;
    const master = this.master;
    const noise = this.noise;
    if (!ctx || !master || !noise || this.muted) return;

    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    source.playbackRate.value = 0.8 + Math.random() * 0.5;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1500 + Math.random() * 1400;
    band.Q.value = 0.85;

    const gain = ctx.createGain();
    const peak = 0.028 + Math.random() * 0.012;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

    source.connect(band);
    band.connect(gain);
    gain.connect(master);
    source.start(t, Math.random() * 0.12, 0.05);
    source.stop(t + 0.06);
  }

  /** A tiny upward blip when a robot leaves the prompt. */
  spawn(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240 + Math.random() * 50, t);
    osc.frequency.exponentialRampToValueAtTime(540 + Math.random() * 90, t + 0.12);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1600;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.045, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** A pinpoint tick while a robot works. */
  spark(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1700 + Math.random() * 1300, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.008, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  /** Two-note confirmation when a check turns green. */
  fixed(index = 0): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;

    const t = ctx.currentTime;
    const base = [440, 494, 523.25, 587.33][index % 4];
    for (const [offset, freq, level] of [
      [0, base, 0.042],
      [0.065, base * 1.5, 0.034],
    ] as const) {
      const start = t + offset;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(level, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);

      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.34);
    }
  }

  /** The small success chord at the end of a run. */
  complete(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;

    const t = ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const start = t + i * 0.07;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2400, start);
      filter.frequency.exponentialRampToValueAtTime(1200, start + 1.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.036, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 1.3);
    });

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 130.81;
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, t);
    subGain.gain.exponentialRampToValueAtTime(0.028, t + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    sub.connect(subGain);
    subGain.connect(master);
    sub.start(t);
    sub.stop(t + 0.9);
  }
}
