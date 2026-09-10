import { useEffect, useRef, useState } from 'react';
import { ALL_HOLE_NOTES, midiToName, type Breath, type HoleNote } from '../lib/harmonica';
import { createMatcher, resetMatcher, stepMatcher, type MatcherState } from '../lib/matcher';
import { DEFAULT_SETTINGS, resetSettings, rmsToDb, updateSettings, useSettings, type DetectionSettings } from '../lib/settings';
import type { PitchApi, RawFrame } from '../lib/usePitch';

interface Props {
  pitch: PitchApi;
  onClose: () => void;
}

interface LogEntry {
  t: number;
  kind: 'hit' | 'wrong' | 'target';
  text: string;
}

const arrow = (b: Breath) => (b === 'blow' ? '↑' : '↓');
const holeLabel = (n: HoleNote) => `${arrow(n.breath)}${n.hole}`;
const TIMELINE_MS = 6000;

/**
 * Diagnostics & calibration for pitch detection: live meters, a timeline of
 * raw vs. accepted frames, a hole-by-hole test that runs the exact matcher
 * used in practice, sliders for every threshold, and a copyable debug report.
 */
export function Calibration({ pitch, onClose }: Props) {
  const settings = useSettings();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ---- hole test ----
  const [target, setTarget] = useState<HoleNote | null>(null);
  const [advance, setAdvance] = useState(true);
  const matcherRef = useRef<MatcherState>(createMatcher());
  const [matcher, setMatcher] = useState<MatcherState>({ ...matcherRef.current });
  const [log, setLog] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Record<string, { hits: number; wrong: Record<string, number>; firstMs: number[] }>>({});
  const targetSetAtRef = useRef(0);
  const hitRef = useRef(false);
  const targetRef = useRef<HoleNote | null>(null);
  targetRef.current = target;

  const pushLog = (kind: LogEntry['kind'], text: string) =>
    setLog((l) => [{ t: performance.now(), kind, text }, ...l].slice(0, 40));

  const pickTarget = (n: HoleNote | null) => {
    setTarget(n);
    resetMatcher(matcherRef.current);
    hitRef.current = false;
    targetSetAtRef.current = performance.now();
    if (n) pushLog('target', `מטרה: ${holeLabel(n)} (${midiToName(n.midi)})`);
  };

  // Step the shared matcher on every stable detection change - identical to App.
  useEffect(() => {
    const d = pitch.detected;
    const t = targetRef.current;
    const ev = stepMatcher(matcherRef.current, d, t?.midi, settings);
    setMatcher({ ...matcherRef.current });
    if (ev === 'none' || !d || !t) return;
    const key = holeLabel(t);
    const played = `${holeLabel(d.nearest)} ${midiToName(d.midi)} ${d.freq.toFixed(0)}Hz`;
    if (ev === 'hit') {
      if (hitRef.current) return;
      hitRef.current = true;
      const ms = performance.now() - targetSetAtRef.current;
      pushLog('hit', `✓ ${key} זוהה (${played}) אחרי ${(ms / 1000).toFixed(1)} שנ׳`);
      setStats((s) => {
        const e = s[key] ?? { hits: 0, wrong: {}, firstMs: [] };
        return { ...s, [key]: { ...e, hits: e.hits + 1, firstMs: [...e.firstMs, ms] } };
      });
      if (advance) {
        window.setTimeout(() => {
          // same 120ms advance as practice mode; next note in the 20-note list
          const i = ALL_HOLE_NOTES.findIndex((n) => n === t);
          pickTarget(ALL_HOLE_NOTES[(i + 1) % ALL_HOLE_NOTES.length]);
        }, 120);
      }
    } else if (!hitRef.current) {
      pushLog('wrong', `✗ ${key}: נוגן ${played}`);
      setStats((s) => {
        const e = s[key] ?? { hits: 0, wrong: {}, firstMs: [] };
        const w = holeLabel(d.nearest);
        return { ...s, [key]: { ...e, wrong: { ...e.wrong, [w]: (e.wrong[w] ?? 0) + 1 } } };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch.detected, settings, advance]);

  // ---- timeline canvas ----
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const cv = canvasRef.current;
      if (!cv) return;
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      if (cv.width !== W * dpr || cv.height !== H * dpr) {
        cv.width = W * dpr;
        cv.height = H * dpr;
      }
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      const now = performance.now();
      const frames = pitch.history.current;
      const pitchH = H * 0.68;
      const volTop = pitchH + 8;
      const volH = H - volTop;
      const MIDI_LO = 57;
      const MIDI_HI = 98;
      const yOf = (midi: number) => pitchH - ((midi - MIDI_LO) / (MIDI_HI - MIDI_LO)) * pitchH;
      const xOf = (t: number) => W - ((now - t) / TIMELINE_MS) * W;
      const DB_LO = -90;
      const yDb = (db: number) => volTop + volH - ((Math.max(DB_LO, db) - DB_LO) / -DB_LO) * volH;

      // hole reference lines
      g.font = '10px system-ui';
      g.textAlign = 'left';
      for (const n of ALL_HOLE_NOTES) {
        const y = yOf(n.midi);
        g.strokeStyle = n.breath === 'blow' ? 'rgba(59,130,246,0.18)' : 'rgba(245,158,11,0.18)';
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
        g.fillStyle = n.breath === 'blow' ? 'rgba(59,130,246,0.7)' : 'rgba(245,158,11,0.7)';
        g.fillText(holeLabel(n), n.breath === 'blow' ? 2 : 22, y - 1);
      }
      // target
      const t = targetRef.current;
      if (t) {
        const y = yOf(t.midi);
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        g.setLineDash([4, 4]);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
        g.setLineDash([]);
        if (settings.octaveTolerant) {
          g.strokeStyle = 'rgba(255,255,255,0.25)';
          for (const m of [t.midi - 12, t.midi + 12]) {
            if (m < MIDI_LO || m > MIDI_HI) continue;
            g.beginPath();
            g.moveTo(0, yOf(m));
            g.lineTo(W, yOf(m));
            g.stroke();
          }
        }
      }

      // volume strip: gate line + volume line
      g.strokeStyle = 'rgba(255,255,255,0.15)';
      g.beginPath();
      g.moveTo(0, volTop);
      g.lineTo(W, volTop);
      g.stroke();
      let first = true;
      g.strokeStyle = 'rgba(239,68,68,0.7)';
      g.beginPath();
      for (const f of frames) {
        if (now - f.t > TIMELINE_MS) continue;
        const x = xOf(f.t);
        const y = yDb(rmsToDb(f.gate));
        if (first) g.moveTo(x, y);
        else g.lineTo(x, y);
        first = false;
      }
      g.stroke();
      first = true;
      g.strokeStyle = 'rgba(34,197,94,0.9)';
      g.beginPath();
      for (const f of frames) {
        if (now - f.t > TIMELINE_MS) continue;
        const x = xOf(f.t);
        const y = yDb(rmsToDb(f.volume));
        if (first) g.moveTo(x, y);
        else g.lineTo(x, y);
        first = false;
      }
      g.stroke();

      // pitch dots
      for (const f of frames) {
        if (now - f.t > TIMELINE_MS || !f.raw) continue;
        const x = xOf(f.t);
        const y = yOf(f.raw.midi);
        if (f.reject === null) {
          g.fillStyle = '#22c55e';
          g.fillRect(x - 1.5, y - 1.5, 3, 3);
        } else {
          g.fillStyle = f.reject === 'volume' ? 'rgba(139,149,168,0.35)' : 'rgba(239,68,68,0.45)';
          g.fillRect(x - 1, y - 1, 2, 2);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [pitch.history, settings.octaveTolerant]);

  // ---- auto threshold: measure ~2s of silence, put the gate above it ----
  const [calibrating, setCalibrating] = useState<number | null>(null);
  const autoThreshold = () => {
    if (!pitch.listening) return;
    setCalibrating(2);
    const started = performance.now();
    const iv = window.setInterval(() => {
      const left = 2 - (performance.now() - started) / 1000;
      if (left > 0) {
        setCalibrating(Math.ceil(left));
        return;
      }
      window.clearInterval(iv);
      const vols = pitch.history.current
        .filter((fr) => fr.t >= started)
        .map((fr) => rmsToDb(fr.volume))
        .sort((a, b) => a - b);
      setCalibrating(null);
      if (vols.length === 0) return;
      // 90th percentile of the silence, plus a margin
      const noise = vols[Math.floor(vols.length * 0.9)];
      const db = Math.max(-90, Math.min(-20, Math.round(noise + 8)));
      updateSettings({ minVolumeDb: db, noiseRatio: 2 });
      pushLog('target', `הסף כויל: רעש ${noise.toFixed(0)} dB → סף ${db} dB`);
    }, 200);
  };

  const toggleAgc = async (on: boolean) => {
    updateSettings({ agc: on });
    if (pitch.listening) {
      pitch.stop();
      await pitch.start();
    }
  };

  // ---- debug report ----
  const [copied, setCopied] = useState<string | null>(null);
  const copyReport = async () => {
    const frames = pitch.history.current.slice(-300).map((f: RawFrame) => [
      Math.round(f.t),
      +f.freq.toFixed(1),
      +f.clarity.toFixed(3),
      +rmsToDb(f.volume).toFixed(1),
      +rmsToDb(f.gate).toFixed(1),
      f.reject ?? 'ok',
      f.raw ? holeLabel(f.raw.nearest) : '',
    ]);
    const report = {
      when: new Date().toISOString(),
      ua: navigator.userAgent,
      fps: Math.round(pitch.fps),
      settings,
      target: target ? holeLabel(target) : null,
      matcher,
      stats,
      log: log.map((l) => l.text),
      frames: '[t, Hz, clarity, dB, gateDb, reject, hole]',
      data: frames,
    };
    const text = JSON.stringify(report);
    try {
      await navigator.clipboard.writeText(text);
      setCopied('הדו"ח הועתק – אפשר להדביק אותו בצ׳אט');
    } catch {
      setCopied(text);
    }
  };

  const f = pitch.frame;
  const volDb = f ? rmsToDb(f.volume) : -120;
  const gateDb = f ? rmsToDb(f.gate) : -120;
  const floorDb = f ? rmsToDb(f.noiseFloor) : -120;
  const pct = (db: number) => `${Math.max(0, Math.min(100, ((db + 90) / 90) * 100))}%`;
  const rejectText: Record<string, string> = {
    volume: 'שקט מדי (מתחת לסף העוצמה)',
    clarity: 'לא ברור (בהירות נמוכה)',
    range: 'מחוץ לטווח המפוחית',
  };

  // Plain render helper (not a component): the page re-renders every audio
  // frame, and an inline component would remount and break slider dragging.
  const slider = (k: keyof DetectionSettings, label: string, min: number, max: number, step: number, fmt?: (v: number) => string) => {
    const v = settings[k] as number;
    return (
      <label className="cal-slider">
        <span>
          {label}
          <b>{fmt ? fmt(v) : v}</b>
          {v !== (DEFAULT_SETTINGS[k] as number) && <small> (ברירת מחדל {fmt ? fmt(DEFAULT_SETTINGS[k] as number) : String(DEFAULT_SETTINGS[k])})</small>}
        </span>
        <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => updateSettings({ [k]: Number(e.target.value) })} />
      </label>
    );
  };

  return (
    <div className="cal">
      <header className="cal-head">
        <div>
          <h1>כיול זיהוי הצליל</h1>
          <p className="sub">נגן תווים בודדים וראה בדיוק מה המיקרופון שומע ומה נספר כפגיעה</p>
        </div>
        <div className="buttons">
          <button onClick={() => (pitch.listening ? pitch.stop() : pitch.start())} className={pitch.listening ? '' : 'primary'}>
            {pitch.listening ? 'כבה מיקרופון' : 'הפעל מיקרופון'}
          </button>
          <button onClick={onClose}>← חזרה לתרגול</button>
        </div>
      </header>
      {pitch.error && <p className="error">שגיאת מיקרופון: {pitch.error}</p>}

      {/* ---- live meters ---- */}
      <section className="cal-panel cal-live">
        <div className="cal-meter">
          <div className="cal-meter-head">
            <span>עוצמה</span>
            <b dir="ltr">{volDb > -119 ? volDb.toFixed(0) : '—'} dB</b>
          </div>
          <div className="cal-bar">
            <div className="cal-bar-fill" style={{ width: pct(volDb), background: f && f.reject === 'volume' ? 'var(--muted)' : 'var(--hit)' }} />
            <div className="cal-bar-mark" style={{ insetInlineStart: pct(gateDb) }} title="סף" />
            <div className="cal-bar-mark floor" style={{ insetInlineStart: pct(floorDb) }} title="רצפת רעש" />
          </div>
          <small className="muted" dir="ltr">
            gate {gateDb > -119 ? gateDb.toFixed(0) : '—'} dB · noise {floorDb > -119 ? floorDb.toFixed(0) : '—'} dB
          </small>
        </div>
        <div className="cal-meter">
          <div className="cal-meter-head">
            <span>בהירות</span>
            <b dir="ltr">{f ? f.clarity.toFixed(2) : '—'}</b>
          </div>
          <div className="cal-bar">
            <div className="cal-bar-fill" style={{ width: `${(f?.clarity ?? 0) * 100}%`, background: f && f.clarity > settings.minClarity ? 'var(--hit)' : 'var(--muted)' }} />
            <div className="cal-bar-mark" style={{ insetInlineStart: `${settings.minClarity * 100}%` }} />
          </div>
          <small className="muted" dir="ltr">{Math.round(pitch.fps)} fps</small>
        </div>
        <div className="cal-meter">
          <div className="cal-meter-head">
            <span>גולמי (כל פריים)</span>
          </div>
          <div className="cal-big" dir="ltr">
            {f?.raw ? (
              <>
                <span className={f.raw.nearest.breath}>{holeLabel(f.raw.nearest)}</span>
                <small>
                  {midiToName(f.raw.midi)} · {f.freq.toFixed(0)} Hz · {f.raw.cents > 0 ? '+' : ''}
                  {f.raw.cents.toFixed(0)}¢
                </small>
              </>
            ) : (
              <span className="dim">…</span>
            )}
          </div>
          <small className={f?.reject ? 'warn' : 'muted'}>{f?.reject ? rejectText[f.reject] : f ? 'התקבל' : ''}</small>
        </div>
        <div className="cal-meter">
          <div className="cal-meter-head">
            <span>יציב (אחרי הצבעה)</span>
          </div>
          <div className="cal-big" dir="ltr">
            {pitch.detected ? (
              <>
                <span className={pitch.detected.nearest.breath}>{holeLabel(pitch.detected.nearest)}</span>
                <small>{midiToName(pitch.detected.nearest.midi)}</small>
              </>
            ) : (
              <span className="dim">שקט</span>
            )}
          </div>
          <small className="muted" dir="ltr">
            hold {matcher.hold}/{settings.holdFrames} · {matcher.armed ? 'armed' : 'disarmed'} · last {matcher.lastMidi ?? '—'}
          </small>
        </div>
      </section>

      <section className="cal-panel">
        <canvas ref={canvasRef} className="cal-canvas" />
        <small className="muted">
          6 שניות אחרונות. נקודות ירוקות = פריימים שהתקבלו, אפורות = נדחו בגלל עוצמה, אדומות = נדחו בגלל בהירות. למטה: עוצמה (ירוק) מול הסף (אדום). קו מקווקו = המטרה.
        </small>
      </section>

      {/* ---- hole test ---- */}
      <section className="cal-panel">
        <div className="cal-row">
          <h2>בדיקת חורים</h2>
          <label className="check">
            <input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)} /> אחרי פגיעה עבור לתו הבא (כמו בתרגול)
          </label>
          <button onClick={() => pickTarget(null)} disabled={!target}>
            נקה מטרה
          </button>
        </div>
        <div className="cal-holes" dir="ltr">
          {(['blow', 'draw'] as Breath[]).map((b) => (
            <div className="cal-holes-row" key={b}>
              {ALL_HOLE_NOTES.filter((n) => n.breath === b).map((n) => {
                const st = stats[holeLabel(n)];
                return (
                  <button
                    key={holeLabel(n)}
                    className={['cal-hole', b, target === n ? 'current' : '', st?.hits ? 'ok' : ''].join(' ')}
                    onClick={() => pickTarget(target === n ? null : n)}
                    title={midiToName(n.midi)}
                  >
                    <span className="arrow">{arrow(b)}</span>
                    <span className="hole">{n.hole}</span>
                    {st && (
                      <span className="cal-hole-stat">
                        {st.hits > 0 && <em>✓{st.hits}</em>}
                        {Object.keys(st.wrong).length > 0 && <em className="bad">✗{Object.values(st.wrong).reduce((a, c) => a + c, 0)}</em>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {target && (
          <p className="cal-target" dir="rtl">
            נגן עכשיו: <b dir="ltr">{holeLabel(target)}</b> ({midiToName(target.midi)}, {Math.round(440 * Math.pow(2, (target.midi - 69) / 12))} Hz)
            {stats[holeLabel(target)] && Object.keys(stats[holeLabel(target)].wrong).length > 0 && (
              <span className="muted">
                {' '}
                · זוהה בטעות כ־
                {Object.entries(stats[holeLabel(target)].wrong)
                  .map(([k, v]) => `${k}×${v}`)
                  .join(', ')}
              </span>
            )}
          </p>
        )}
        <ul className="cal-log">
          {log.map((l, i) => (
            <li key={`${l.t}-${i}`} className={l.kind}>
              {l.text}
            </li>
          ))}
        </ul>
      </section>

      {/* ---- settings ---- */}
      <section className="cal-panel">
        <div className="cal-row">
          <h2>הגדרות זיהוי</h2>
          <button onClick={resetSettings}>אפס לברירת מחדל</button>
        </div>
        <p className="muted small">נשמר במכשיר הזה בלבד. שינויים נכנסים לתוקף מיידית, גם בתרגול.</p>
        <div className="cal-row">
          <button onClick={autoThreshold} disabled={!pitch.listening || calibrating !== null} className="primary">
            {calibrating !== null ? `שקט… ${calibrating}` : 'כייל סף עוצמה אוטומטית (2 שנ׳ שקט)'}
          </button>
          <label className="check">
            <input type="checkbox" checked={settings.agc} onChange={(e) => void toggleAgc(e.target.checked)} /> הגברה אוטומטית של המיקרופון (AGC)
          </label>
        </div>
        <div className="cal-sliders">
          {slider('minVolumeDb', 'סף עוצמה', -90, -20, 1, (v) => `${v} dB`)}
          {slider('noiseRatio', 'יחס מעל רצפת הרעש', 1, 6, 0.25, (v) => `×${v}`)}
          {slider('minClarity', 'סף בהירות', 0.5, 0.98, 0.01)}
          {slider('voteWindow', 'חלון הצבעה (פריימים)', 1, 15, 1)}
          {slider('voteMin', 'קולות נדרשים', 1, 15, 1)}
          {slider('holdFrames', 'פריימים להחזקה', 1, 12, 1)}
          <label className="cal-slider">
            <span>
              גודל FFT<b>{settings.fftSize}</b>
            </span>
            <select value={settings.fftSize} onChange={(e) => updateSettings({ fftSize: Number(e.target.value) as DetectionSettings['fftSize'] })}>
              <option value={1024}>1024 – מהיר, פחות יציב</option>
              <option value={2048}>2048 – מאוזן</option>
              <option value={4096}>4096 – יציב בחורים נמוכים, איטי יותר</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={settings.octaveTolerant} onChange={(e) => updateSettings({ octaveTolerant: e.target.checked })} /> קבל תו באוקטבה שגויה
            כפגיעה
          </label>
        </div>
        {settings.voteMin > settings.voteWindow && <p className="error">״קולות נדרשים״ גדול מחלון ההצבעה – שום תו לא יזוהה.</p>}
      </section>

      <section className="cal-panel">
        <div className="cal-row">
          <h2>דו"ח לאבחון</h2>
          <button onClick={() => void copyReport()} disabled={!pitch.listening && pitch.history.current.length === 0}>
            העתק דו"ח
          </button>
        </div>
        <p className="muted small">כולל את ההגדרות, הפריימים האחרונים ויומן הבדיקה – בלי שמע.</p>
        {copied && (copied.startsWith('{') ? <textarea className="cal-report" readOnly value={copied} onFocus={(e) => e.target.select()} /> : <p className="ok">{copied}</p>)}
      </section>
    </div>
  );
}
