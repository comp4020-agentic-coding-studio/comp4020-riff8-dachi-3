// Ink Strings: every ribbon is a plucked string, synthesised, no samples.
// A Karplus-Strong pluck is computed once per (note, timbre) into an
// AudioBuffer and cached, which is cheaper and steadier than a live feedback
// loop (a DelayNode in a cycle can't be shorter than one 128-frame block,
// which caps the pitch). Everything is pentatonic, enveloped, voice-capped
// and run through a limiter, so nothing can clip or clash.
import { pathLength } from "./lib/shapes.js";

const SCALE = [0, 2, 4, 7, 9]; // major pentatonic
const ROOT_MIDI = 45; // A2
const DEGREES = 15; // three octaves
const MAX_VOICES = 8;
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

// One timbre per palette colour: how bright the pluck is, how fast it
// darkens, and where along the string it's plucked.
const TIMBRES = {
  "#2b2118": { bright: 0.35, damp: 0.996, pick: 0.5 }, // walnut: round, low
  "#5b4636": { bright: 0.5, damp: 0.994, pick: 0.3 }, // umber: woody
  "#8a6d3b": { bright: 0.85, damp: 0.997, pick: 0.15 }, // ochre: bright, ringing
  "#3f5d40": { bright: 0.6, damp: 0.995, pick: 0.22 }, // pine: koto-ish
  "#3a5a6b": { bright: 0.45, damp: 0.998, pick: 0.4 }, // slate: long, soft
  "#7a3b3b": { bright: 0.7, damp: 0.992, pick: 0.12 }, // madder: short, plucky
};

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);
const degreeToMidi = (d) => ROOT_MIDI + 12 * Math.floor(d / 5) + SCALE[d % 5];
export const noteName = (d) => {
  const m = degreeToMidi(d);
  return `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
};

// Drawn length picks the degree; the hand's handle shifts it, so one hand's
// strokes share a register you can learn by ear.
export function degreeFor(mark) {
  const len = Math.min(1, pathLength(mark.path) / 2600);
  const voice = hashString(mark.handle ?? "") % 5;
  return Math.max(0, Math.min(DEGREES - 1, Math.round(len * 8) + voice));
}

export function createSound() {
  const ctx = new AudioContext();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 6;
  limiter.ratio.value = 16;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(limiter).connect(ctx.destination);
  const LEVEL = 0.55;

  const buffers = new Map();
  let voices = 0;

  function pluckBuffer(degree, color) {
    const key = `${degree}:${color}`;
    let buf = buffers.get(key);
    if (buf) return buf;
    const t = TIMBRES[color] ?? TIMBRES["#2b2118"];
    const sr = ctx.sampleRate;
    const f = midiToHz(degreeToMidi(degree));
    const period = Math.max(2, Math.round(sr / f));
    const length = Math.round(sr * 2.4);
    const data = new Float32Array(length);
    // excitation: noise, low-passed by brightness, combed by pick position
    let lp = 0;
    const pickOffset = Math.max(1, Math.round(period * t.pick));
    for (let i = 0; i < period; i++) {
      const noise = Math.random() * 2 - 1;
      lp += t.bright * (noise - lp);
      data[i] = lp;
    }
    for (let i = period - 1; i >= pickOffset; i--) data[i] -= data[i - pickOffset];
    // damping rises with pitch so high strings don't ring forever
    const damp = t.damp - (degree / DEGREES) * 0.004;
    for (let i = period; i < length; i++) {
      data[i] = damp * 0.5 * (data[i - period] + data[Math.max(0, i - period - 1)]);
    }
    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
    if (peak > 0) for (let i = 0; i < length; i++) data[i] /= peak;
    buf = ctx.createBuffer(1, length, sr);
    buf.copyToChannel(data, 0);
    buffers.set(key, buf);
    return buf;
  }

  // ageDays darkens: older strokes sound deeper. speed (0..1) shortens: a
  // fast pass chatters, a slow one lets each string bloom.
  function pluck(mark, { ageDays = 0, pan = 0, speed = 0, gain = 1 } = {}) {
    if (voices >= MAX_VOICES || ctx.state !== "running") return null;
    const degree = degreeFor(mark);
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = pluckBuffer(degree, mark.color);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500 + 7000 * Math.exp(-Math.max(0, ageDays) / 9);
    filter.Q.value = 0.4;
    const env = ctx.createGain();
    const peak = 0.22 * gain * (1 - speed * 0.45);
    const ring = 2.3 - speed * 1.7;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.004);
    env.gain.setTargetAtTime(0, now + 0.05, ring / 4);
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-0.9, Math.min(0.9, pan));
    src.connect(filter).connect(env).connect(panner).connect(master);
    src.start(now);
    src.stop(now + ring + 0.3);
    voices++;
    src.onended = () => {
      voices--;
      panner.disconnect();
    };
    return noteName(degree);
  }

  // The drone: one slow voice per person here, low in the same scale.
  const drones = new Map();
  function setDrone(ids) {
    const now = ctx.currentTime;
    for (const id of ids) {
      if (drones.has(id)) continue;
      const degree = hashString(id) % 10;
      const f = midiToHz(degreeToMidi(degree) - 12);
      const out = ctx.createGain();
      out.gain.setValueAtTime(0, now);
      out.gain.linearRampToValueAtTime(0.05 / Math.max(1, Math.sqrt(ids.length)), now + 3);
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 700;
      const oscs = [0, 0.004].map((detune, i) => {
        const o = ctx.createOscillator();
        o.type = i === 0 ? "sine" : "triangle";
        o.frequency.value = f * (1 + detune);
        o.connect(filter);
        o.start(now);
        return o;
      });
      // breathing: a very slow swell on each voice, out of step with others
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + (hashString(id) % 7) / 100;
      const depth = ctx.createGain();
      depth.gain.value = 250;
      lfo.connect(depth).connect(filter.frequency);
      lfo.start(now);
      filter.connect(out).connect(master);
      drones.set(id, { out, oscs: [...oscs, lfo], degree });
    }
    for (const [id, d] of drones) {
      if (ids.includes(id)) continue;
      d.out.gain.cancelScheduledValues(now);
      d.out.gain.setValueAtTime(d.out.gain.value, now);
      d.out.gain.linearRampToValueAtTime(0, now + 4);
      for (const o of d.oscs) o.stop(now + 4.2);
      drones.delete(id);
    }
    return [...drones.values()].map((d) => noteName(d.degree));
  }

  return {
    ctx,
    async enable() {
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(LEVEL, ctx.currentTime, 0.3);
    },
    disable() {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => ctx.state === "running" && master.gain.value < 0.01 && ctx.suspend(), 1500);
    },
    pluck,
    setDrone,
  };
}
