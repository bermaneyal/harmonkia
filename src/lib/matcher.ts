import type { Detected } from './harmonica';

/**
 * The "did the player just play the target?" state machine, shared by the
 * practice screen (App) and the Calibration page so both behave identically
 * and the calibration page can show its internals.
 *
 * Rules:
 * - a hole must be reported for `holdFrames` consecutive frames to count;
 * - after it counted, the matcher is disarmed until the reported hole changes
 *   or there is silence, so a sustained note is counted once;
 * - silence re-arms, so the same hole can be played twice in a row.
 */
export interface MatcherState {
  hold: number;
  armed: boolean;
  lastMidi: number | null;
}

export interface MatcherOptions {
  holdFrames: number;
  octaveTolerant: boolean;
}

export type MatchEvent = 'none' | 'hit' | 'wrong';

export function createMatcher(): MatcherState {
  return { hold: 0, armed: true, lastMidi: null };
}

export function resetMatcher(m: MatcherState) {
  m.hold = 0;
  m.armed = true;
  m.lastMidi = null;
}

export function matchesTarget(playedMidi: number, targetMidi: number, octaveTolerant: boolean): boolean {
  if (playedMidi === targetMidi) return true;
  return octaveTolerant && Math.abs(playedMidi - targetMidi) === 12;
}

/**
 * Feed one frame. Mutates `m`, returns what happened this frame.
 * `targetMidi` undefined means "nothing expected" (still tracks arming).
 */
export function stepMatcher(
  m: MatcherState,
  detected: Detected | null,
  targetMidi: number | undefined,
  opts: MatcherOptions,
): MatchEvent {
  if (!detected) {
    m.hold = 0;
    m.armed = true;
    m.lastMidi = null;
    return 'none';
  }
  const midi = detected.nearest.midi;
  if (midi !== m.lastMidi) {
    m.hold = 0;
    m.armed = true;
    m.lastMidi = midi;
  }
  if (!m.armed) return 'none';

  m.hold += 1;
  if (m.hold < opts.holdFrames) return 'none';
  m.armed = false;

  if (targetMidi === undefined) return 'none';
  return matchesTarget(midi, targetMidi, opts.octaveTolerant) ? 'hit' : 'wrong';
}
