import type { Breath } from './harmonica';
import { holeToMidi } from './harmonica';
import type { SongSource } from '../data/songs';

export interface TabNote {
  hole: number;
  breath: Breath;
  midi: number;
  syllable: string;
  /** index of the line in the song */
  line: number;
  /** running index across the whole song */
  index: number;
}

export interface Song {
  id: string;
  title: string;
  bpm: number;
  source?: string;
  lines: TabNote[][];
  notes: TabNote[];
}

/** Parses a token like "5" or "5-" */
export function parseToken(token: string): { hole: number; breath: Breath } | null {
  const m = /^(\d+)(-?)$/.exec(token.trim());
  if (!m) return null;
  return { hole: Number(m[1]), breath: m[2] === '-' ? 'draw' : 'blow' };
}

export function parseSong(src: SongSource): Song {
  const lines: TabNote[][] = [];
  const notes: TabNote[] = [];
  src.lines.forEach((line, lineIdx) => {
    const tokens = line.tab.split(/\s+/).filter(Boolean);
    const syllables = line.lyrics.split(/\s+/).filter(Boolean);
    const parsed: TabNote[] = [];
    tokens.forEach((tok, i) => {
      const p = parseToken(tok);
      if (!p) return;
      const note: TabNote = {
        hole: p.hole,
        breath: p.breath,
        midi: holeToMidi(p.hole, p.breath),
        syllable: syllables[i] ?? '',
        line: lineIdx,
        index: notes.length,
      };
      parsed.push(note);
      notes.push(note);
    });
    lines.push(parsed);
  });
  return { id: src.id, title: src.title, bpm: src.bpm, source: src.source, lines, notes };
}
