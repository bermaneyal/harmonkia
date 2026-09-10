import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { freqToHole, type Detected } from './harmonica';
import { dbToRms, getSettings } from './settings';

/** Why a raw frame was not accepted (null = accepted). */
export type RejectReason = 'volume' | 'clarity' | 'range' | null;

/** Unfiltered per-frame measurement, for the calibration page. */
export interface RawFrame {
  t: number;
  freq: number;
  /** detector output before sub-octave correction */
  rawFreq: number;
  clarity: number;
  /** RMS 0..1 */
  volume: number;
  noiseFloor: number;
  /** effective volume gate (RMS) this frame */
  gate: number;
  reject: RejectReason;
  /** hole mapping of the raw pitch, even when rejected (null if out of range) */
  raw: Detected | null;
}

export interface PitchState {
  listening: boolean;
  error: string | null;
  /** Current stable detection (after majority vote), or null when silent / unclear */
  detected: Detected | null;
  /** 0..1 confidence from the detector (raw, per frame) */
  clarity: number;
  /** RMS volume, 0..~1 (raw, per frame) */
  volume: number;
  /** last raw frame */
  frame: RawFrame | null;
  /** frames per second of the detection loop (rAF), smoothed */
  fps: number;
}

const MIN_FREQ = 200; // below hole 1 blow (C4 ≈ 261 Hz) with margin
const MAX_FREQ = 2200; // above hole 10 blow (C7 ≈ 2093 Hz)
/** how much louder (dB) the 2x bin must be than the reported pitch to call it a sub-octave error */
const OCTAVE_FIX_DB = 8;

/**
 * Listens to the microphone and continuously reports the detected pitch
 * mapped to a harmonica hole. Runs a requestAnimationFrame loop.
 *
 * Thresholds come from settings.ts (tunable on the Calibration page):
 * volume/clarity gates per frame, then a majority vote over the last few
 * frames so single-frame dropouts don't reset the hold counter downstream.
 */
export function usePitch() {
  const [state, setState] = useState<PitchState>({
    listening: false,
    error: null,
    detected: null,
    clarity: 0,
    volume: 0,
    frame: null,
    fps: 0,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  /** ring of recent raw frames, for the calibration timeline (not React state: too hot) */
  const historyRef = useRef<RawFrame[]>([]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    setState((s) => ({ ...s, listening: false, detected: null, clarity: 0, volume: 0, frame: null }));
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: getSettings().agc,
        },
      });
      // AudioContext must be created/resumed from a user gesture (iOS Safari).
      const ctx = new AudioContext();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = getSettings().fftSize;

      // Band-pass the mic before measuring. Phone/laptop mics carry a lot of
      // rumble (handling noise, hum, wind) at 20-150 Hz, well below hole 1
      // blow (C4 = 261 Hz). That rumble used to dominate the RMS and set the
      // noise floor; two cascaded high-pass stages (~24 dB/oct) remove it.
      // The low-pass just trims hiss; harmonics needed for pitch stay intact.
      const hp1 = ctx.createBiquadFilter();
      hp1.type = 'highpass';
      hp1.frequency.value = 180;
      hp1.Q.value = 0.7;
      const hp2 = ctx.createBiquadFilter();
      hp2.type = 'highpass';
      hp2.frequency.value = 180;
      hp2.Q.value = 0.7;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5000;
      source.connect(hp1).connect(hp2).connect(lp).connect(analyser);

      let detector = PitchDetector.forFloat32Array(analyser.fftSize);
      detector.minVolumeDecibels = -70; // we gate volume ourselves
      let buffer = new Float32Array(detector.inputLength);
      let spectrum = new Float32Array(analyser.frequencyBinCount);

      ctxRef.current = ctx;
      streamRef.current = stream;
      setState((s) => ({ ...s, listening: true, error: null }));

      // Recent per-frame results (null = silence/unclear) for the majority vote.
      const recent: (Detected | null)[] = [];
      // Slowly tracked noise floor (RMS) - falls quickly, rises very slowly.
      let noiseFloor = 0.001;
      let lastStable: Detected | null = null;
      let lastT = performance.now();
      let fps = 60;

      const tick = () => {
        const s = getSettings();
        if (analyser.fftSize !== s.fftSize) {
          analyser.fftSize = s.fftSize;
          detector = PitchDetector.forFloat32Array(s.fftSize);
          detector.minVolumeDecibels = -70;
          buffer = new Float32Array(detector.inputLength);
          spectrum = new Float32Array(analyser.frequencyBinCount);
          recent.length = 0;
        }

        const now = performance.now();
        const dt = now - lastT;
        lastT = now;
        if (dt > 0) fps = fps * 0.9 + (1000 / dt) * 0.1;

        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const volume = Math.sqrt(sum / buffer.length);

        noiseFloor = volume < noiseFloor ? volume : noiseFloor * 0.995 + volume * 0.005;
        const gate = Math.max(dbToRms(s.minVolumeDb), noiseFloor * s.noiseRatio);

        const [rawPitch, clarity] = detector.findPitch(buffer, ctx.sampleRate);

        // Sub-octave correction. The McLeod method sometimes locks onto 2 or 4
        // periods of a high note (hole 7 blow C6 read as C4 = hole 1). A real
        // harmonica note always has a strong fundamental, so if the spectrum
        // has clearly more energy at 2x the reported pitch than at the pitch
        // itself, the true note is an octave up. Checked twice (up to 4x).
        let pitch = rawPitch;
        if (Number.isFinite(pitch) && pitch > 0) {
          analyser.getFloatFrequencyData(spectrum);
          const binHz = ctx.sampleRate / analyser.fftSize;
          const magAt = (f: number) => {
            const b = Math.round(f / binHz);
            let m = -Infinity;
            for (let k = Math.max(0, b - 1); k <= Math.min(spectrum.length - 1, b + 1); k++) m = Math.max(m, spectrum[k]);
            return m;
          };
          for (let i = 0; i < 2; i++) {
            const up = pitch * 2;
            if (up >= MAX_FREQ) break;
            if (magAt(up) > magAt(pitch) + OCTAVE_FIX_DB) pitch = up;
            else break;
          }
        }
        const inRange = pitch > MIN_FREQ && pitch < MAX_FREQ;
        const raw = inRange && Number.isFinite(pitch) ? freqToHole(pitch) : null;
        const reject: RejectReason =
          volume <= gate ? 'volume' : clarity <= s.minClarity ? 'clarity' : !inRange ? 'range' : null;
        const frame: RawFrame = { t: now, freq: pitch, rawFreq: rawPitch, clarity, volume, noiseFloor, gate, reject, raw };
        const accepted = reject === null ? raw : null;

        const hist = historyRef.current;
        hist.push(frame);
        if (hist.length > 600) hist.splice(0, hist.length - 600);

        recent.push(accepted);
        while (recent.length > s.voteWindow) recent.shift();

        // Count votes per MIDI note; keep the most recent frame for each.
        const votes = new Map<number, { count: number; last: Detected }>();
        let silent = 0;
        for (const f of recent) {
          if (!f) {
            silent++;
            continue;
          }
          const v = votes.get(f.nearest.midi);
          if (v) {
            v.count++;
            v.last = f;
          } else votes.set(f.nearest.midi, { count: 1, last: f });
        }
        let winner: Detected | null = null;
        let winnerCount = 0;
        for (const v of votes.values()) {
          if (v.count > winnerCount) {
            winnerCount = v.count;
            winner = v.last;
          }
        }

        let stable: Detected | null;
        if (winner && winnerCount >= s.voteMin) stable = winner;
        else if (silent >= s.voteMin) stable = null;
        else stable = lastStable; // undecided (note transition): keep previous
        lastStable = stable;

        setState((st) => ({ ...st, volume, clarity, detected: stable, frame, fps }));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setState((s) => ({
        ...s,
        listening: false,
        error: e instanceof Error ? e.message : 'לא ניתן לגשת למיקרופון',
      }));
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { ...state, start, stop, history: historyRef };
}

export type PitchApi = ReturnType<typeof usePitch>;
