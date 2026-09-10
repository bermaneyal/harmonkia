import { useSyncExternalStore } from 'react';

/**
 * Tunable pitch-detection settings. Persisted in localStorage so a user can
 * calibrate once per device (mics differ a lot between laptops and phones).
 * Edited from the Calibration page; read by usePitch and the matcher.
 */
export interface DetectionSettings {
  /** pitchy clarity 0..1 required to accept a frame */
  minClarity: number;
  /** absolute RMS floor in dBFS (e.g. -50) */
  minVolumeDb: number;
  /** signal must exceed measured noise floor by this factor */
  noiseRatio: number;
  /** frames in the majority-vote window */
  voteWindow: number;
  /** votes needed to report a hole (or silence) */
  voteMin: number;
  /** stable frames the same hole must be held before it counts as played */
  holdFrames: number;
  /** accept a note one octave off the target */
  octaveTolerant: boolean;
  /** analyser FFT size (2048 = faster, 4096 = steadier on low holes) */
  fftSize: 1024 | 2048 | 4096;
  /** ask the browser for automatic gain control on the mic (helps quiet phone mics) */
  agc: boolean;
}

export const DEFAULT_SETTINGS: DetectionSettings = {
  minClarity: 0.8,
  minVolumeDb: -60,
  noiseRatio: 2.5,
  voteWindow: 7,
  voteMin: 4,
  holdFrames: 3,
  octaveTolerant: true,
  fftSize: 2048,
  agc: false,
};

const KEY = 'harmonkia.detection';

function load(): DetectionSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DetectionSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let current: DetectionSettings = load();
const listeners = new Set<() => void>();

export function getSettings(): DetectionSettings {
  return current;
}

export function updateSettings(patch: Partial<DetectionSettings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function resetSettings() {
  current = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** React hook: current settings, re-renders on change. */
export function useSettings(): DetectionSettings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

export const dbToRms = (db: number) => Math.pow(10, db / 20);
export const rmsToDb = (rms: number) => (rms > 0 ? 20 * Math.log10(rms) : -120);
