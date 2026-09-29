'use client';

/**
 * Completion feedback: a single subtle tick + a 15ms haptic pulse.
 *
 * Design notes (PRD §3, §4):
 *  - Sound is synthesised with the Web Audio API — no asset to download, nothing
 *    fetched at load, and the AudioContext is only created lazily on the first
 *    real user gesture (so we never touch autoplay permissions on load).
 *  - When sound is disabled we never construct the context or schedule a node,
 *    rather than playing a muted sound.
 *  - Haptics use navigator.vibrate with a feature-detect so unsupported browsers
 *    (notably iOS Safari) silently no-op.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

type AudioContextCtor = typeof AudioContext;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** Call once from a user gesture so later ticks are allowed to play. */
export function primeAudio() {
  if (unlocked) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume().catch(() => undefined);
  }
  unlocked = true;
}

/** Short, soft "tick": a fast high sine blip + a touch of filtered noise. */
function playTick() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') {
    c.resume().catch(() => undefined);
  }
  const t0 = c.currentTime;

  // Tone: ~1.6kHz sine, 60ms, quick decay — a "pop", not a chime
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1650, t0);
  osc.frequency.exponentialRampToValueAtTime(760, t0 + 0.05);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.07);

  // Transient: very short filtered noise gives the tick its "click" edge
  const frames = Math.floor(c.sampleRate * 0.02);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 3;
  }
  const src = c.createBufferSource();
  const bp = c.createBiquadFilter();
  const ng = c.createGain();
  bp.type = 'bandpass';
  bp.frequency.value = 2600;
  bp.Q.value = 1.2;
  ng.gain.value = 0.07;
  src.buffer = buf;
  src.connect(bp).connect(ng).connect(c.destination);
  src.start(t0);
}

export function playTickSound(enabled: boolean) {
  if (!enabled) return; // never instantiate when off
  try {
    playTick();
  } catch {
    // audio is a nicety — never let it break the interaction
  }
}

export function vibrate(enabled: boolean) {
  if (!enabled) return;
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(15);
  } catch {
    // unsupported / blocked — silent no-op
  }
}

export function hapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/** Fire all three feedback channels together (visual animation is caller's job). */
export function completionFeedback(opts: { sound: boolean; haptics: boolean }) {
  playTickSound(opts.sound);
  vibrate(opts.haptics);
}
