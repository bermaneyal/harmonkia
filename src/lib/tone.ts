import { midiToFreq } from './harmonica';

let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Plays a short reference tone for a MIDI note (simple harmonica-ish timbre). */
export function playNote(midi: number, durationSec = 0.5) {
  const ac = getCtx();
  void ac.resume();
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain.gain.setValueAtTime(0.25, now + durationSec - 0.06);
  gain.gain.linearRampToValueAtTime(0, now + durationSec);
  gain.connect(ac.destination);

  // Two detuned oscillators sound a bit like a free reed.
  for (const [type, detune] of [
    ['sawtooth', 0],
    ['square', 6],
  ] as const) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = midiToFreq(midi);
    osc.detune.value = detune;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    osc.connect(filter).connect(gain);
    osc.start(now);
    osc.stop(now + durationSec);
  }
}

/** Short metronome click. */
export function click(accent = false) {
  const ac = getCtx();
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.frequency.value = accent ? 1600 : 1000;
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}
