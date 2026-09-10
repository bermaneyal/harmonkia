// מיפוי חורים של מפוחית דיאטונית (Richter) ב-C לתווים ולתדרים.

export type Breath = 'blow' | 'draw';

export interface HoleNote {
  hole: number;
  breath: Breath;
  /** MIDI note number */
  midi: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Richter tuning, key of C. C4 = MIDI 60.
const BLOW_MIDI = [60, 64, 67, 72, 76, 79, 84, 88, 91, 96]; // holes 1..10
const DRAW_MIDI = [62, 67, 71, 74, 77, 81, 83, 86, 89, 93];

export function holeToMidi(hole: number, breath: Breath): number {
  const table = breath === 'blow' ? BLOW_MIDI : DRAW_MIDI;
  const midi = table[hole - 1];
  if (midi === undefined) throw new Error(`Invalid hole ${hole}`);
  return midi;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function midiToName(midi: number): string {
  const rounded = Math.round(midi);
  return `${NOTE_NAMES[rounded % 12]}${Math.floor(rounded / 12) - 1}`;
}

/** All 20 notes of the harmonica, for reverse lookup. */
export const ALL_HOLE_NOTES: HoleNote[] = [
  ...BLOW_MIDI.map((midi, i) => ({ hole: i + 1, breath: 'blow' as Breath, midi })),
  ...DRAW_MIDI.map((midi, i) => ({ hole: i + 1, breath: 'draw' as Breath, midi })),
];

export interface Detected {
  freq: number;
  midi: number;
  /** deviation from nearest hole note, in cents */
  cents: number;
  nearest: HoleNote;
}

/**
 * Given a detected frequency, find the closest harmonica hole/breath.
 * Note: hole 2 draw and hole 3 blow are both G4 - we prefer the blow (simpler),
 * matching is done by MIDI number so either spelling is accepted when checking.
 */
export function freqToHole(freq: number): Detected {
  const midi = freqToMidi(freq);
  let best = ALL_HOLE_NOTES[0];
  let bestDist = Infinity;
  for (const n of ALL_HOLE_NOTES) {
    const d = Math.abs(n.midi - midi);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return { freq, midi, cents: (midi - best.midi) * 100, nearest: best };
}
