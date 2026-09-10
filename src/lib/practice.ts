import type { Breath } from './harmonica';

export type Mode = 'free' | 'tempo';

/** A wrong or missed note during an attempt. */
export interface Mistake {
  /** index of the target note in the song */
  index: number;
  hole: number;
  breath: Breath;
  /** what was actually played, if anything was detected */
  playedHole?: number;
  playedBreath?: Breath;
}

/** One pass over a section of a song. */
export interface Attempt {
  id: string;
  songId: string;
  at: number;
  mode: Mode;
  /** tempo as percent of the song's bpm (tempo mode) */
  speed: number;
  /** inclusive line range */
  lines: [number, number];
  total: number;
  hits: number;
  mistakes: Mistake[];
  clean: boolean;
  /** seconds */
  duration: number;
}

export function accuracy(a: Attempt): number {
  return a.total ? Math.round((a.hits / a.total) * 100) : 0;
}

export function holeLabel(hole: number, breath: Breath): string {
  return `${breath === 'blow' ? '↑' : '↓'}${hole}`;
}

export interface WeakSpot {
  hole: number;
  breath: Breath;
  count: number;
  /** most common wrong note played instead, if any */
  playedInstead?: { hole: number; breath: Breath; count: number };
}

/** Groups mistakes by target hole to find the weak spots. */
export function weakSpots(mistakes: Mistake[], limit = 5): WeakSpot[] {
  const byTarget = new Map<string, { hole: number; breath: Breath; count: number; played: Map<string, number> }>();
  for (const m of mistakes) {
    const key = `${m.breath}${m.hole}`;
    let entry = byTarget.get(key);
    if (!entry) {
      entry = { hole: m.hole, breath: m.breath, count: 0, played: new Map() };
      byTarget.set(key, entry);
    }
    entry.count++;
    if (m.playedHole !== undefined && m.playedBreath) {
      const pk = `${m.playedBreath}${m.playedHole}`;
      entry.played.set(pk, (entry.played.get(pk) ?? 0) + 1);
    }
  }
  return [...byTarget.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => {
      let playedInstead: WeakSpot['playedInstead'];
      for (const [pk, count] of e.played) {
        if (!playedInstead || count > playedInstead.count) {
          const breath: Breath = pk.startsWith('blow') ? 'blow' : 'draw';
          playedInstead = { hole: Number(pk.replace(/\D/g, '')), breath, count };
        }
      }
      return { hole: e.hole, breath: e.breath, count: e.count, playedInstead };
    });
}

// ---- persistence -------------------------------------------------------

const KEY = (songId: string) => `harmonkia:history:${songId}`;
const MAX_HISTORY = 100;

export function loadHistory(songId: string): Attempt[] {
  try {
    const raw = localStorage.getItem(KEY(songId));
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(a: Attempt): Attempt[] {
  const history = [...loadHistory(a.songId), a].slice(-MAX_HISTORY);
  try {
    localStorage.setItem(KEY(a.songId), JSON.stringify(history));
  } catch {
    /* storage unavailable (private mode etc.) – keep in memory only */
  }
  return history;
}

export function clearHistory(songId: string) {
  try {
    localStorage.removeItem(KEY(songId));
  } catch {
    /* ignore */
  }
}

// ---- graduated practice ------------------------------------------------

export const SPEED_MIN = 40;
export const SPEED_MAX = 120;
export const SPEED_START = 60;
export const SPEED_STEP = 10;
/** clean passes in a row needed to bump the speed */
export const STREAK_TO_LEVEL_UP = 3;
