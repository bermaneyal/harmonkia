import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchDetector } from 'pitchy';
import { freqToHole, type Detected } from './harmonica';

export interface PitchState {
  listening: boolean;
  error: string | null;
  /** Current stable detection, or null when silent / unclear */
  detected: Detected | null;
  /** 0..1 confidence from the detector */
  clarity: number;
  /** RMS volume, 0..~1 */
  volume: number;
}

const FFT_SIZE = 2048;
const MIN_CLARITY = 0.9;
const MIN_VOLUME = 0.01;
const MIN_FREQ = 200; // below hole 1 blow (C4 ≈ 261 Hz) with margin
const MAX_FREQ = 2200; // above hole 10 blow (C7 ≈ 2093 Hz)

/**
 * Listens to the microphone and continuously reports the detected pitch
 * mapped to a harmonica hole. Runs a requestAnimationFrame loop.
 */
export function usePitch() {
  const [state, setState] = useState<PitchState>({
    listening: false,
    error: null,
    detected: null,
    clarity: 0,
    volume: 0,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    setState((s) => ({ ...s, listening: false, detected: null, clarity: 0, volume: 0 }));
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      // AudioContext must be created/resumed from a user gesture (iOS Safari).
      const ctx = new AudioContext();
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      source.connect(analyser);

      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      detector.minVolumeDecibels = -40;
      const buffer = new Float32Array(detector.inputLength);

      ctxRef.current = ctx;
      streamRef.current = stream;
      setState((s) => ({ ...s, listening: true, error: null }));

      const tick = () => {
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        const volume = Math.sqrt(sum / buffer.length);

        const [pitch, clarity] = detector.findPitch(buffer, ctx.sampleRate);
        const ok =
          volume > MIN_VOLUME && clarity > MIN_CLARITY && pitch > MIN_FREQ && pitch < MAX_FREQ;

        setState((s) => ({
          ...s,
          volume,
          clarity,
          detected: ok ? freqToHole(pitch) : null,
        }));
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

  return { ...state, start, stop };
}
