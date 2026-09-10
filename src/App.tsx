import { useEffect, useMemo, useRef, useState } from 'react';
import { songs } from './data/songs';
import { parseSong } from './lib/tabs';
import { usePitch } from './lib/usePitch';
import { click, playNote } from './lib/tone';
import { TabView, type NoteStatus } from './components/TabView';
import { Tuner } from './components/Tuner';

type Mode = 'free' | 'tempo';

/** frames the same correct pitch must be held before counting as a hit */
const HOLD_FRAMES = 6;

export default function App() {
  const parsed = useMemo(() => songs.map(parseSong), []);
  const [songId, setSongId] = useState(parsed[0].id);
  const song = parsed.find((s) => s.id === songId)!;

  const [mode, setMode] = useState<Mode>('free');
  const [bpm, setBpm] = useState(song.bpm);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState<NoteStatus[]>([]);

  const pitch = usePitch();

  // reset when song changes
  useEffect(() => {
    setCurrent(0);
    setStatus(new Array(song.notes.length).fill('idle'));
    setBpm(song.bpm);
    setRunning(false);
  }, [song]);

  const target = song.notes[current];
  const finished = current >= song.notes.length;

  // ---- Free mode: advance when the correct note is held ----
  const holdRef = useRef(0);
  const armedRef = useRef(true);
  const hitThisNoteRef = useRef(false);

  useEffect(() => {
    if (!running || finished) return;
    const d = pitch.detected;

    // Re-arm between notes: need silence or a different note before the same
    // hole can count again (handles "5 5 5").
    if (!d || d.nearest.midi !== target.midi) {
      holdRef.current = 0;
      if (!d) armedRef.current = true;
      if (d && d.nearest.midi !== target.midi) armedRef.current = true;
      return;
    }

    if (!armedRef.current) return;
    holdRef.current += 1;
    if (holdRef.current >= HOLD_FRAMES && !hitThisNoteRef.current) {
      hitThisNoteRef.current = true;
      setStatus((s) => s.map((v, i) => (i === current ? 'hit' : v)));
      if (mode === 'free') {
        armedRef.current = false;
        holdRef.current = 0;
        window.setTimeout(() => {
          hitThisNoteRef.current = false;
          setCurrent((c) => c + 1);
        }, 120);
      }
    }
  }, [pitch.detected, running, finished, target, current, mode]);

  // ---- Tempo mode: metronome drives the cursor ----
  useEffect(() => {
    if (!running || mode !== 'tempo' || finished) return;
    const interval = 60000 / bpm;
    click(target.line !== song.notes[current - 1]?.line);
    const id = window.setTimeout(() => {
      setStatus((s) => s.map((v, i) => (i === current && v !== 'hit' ? 'miss' : v)));
      hitThisNoteRef.current = false;
      holdRef.current = 0;
      armedRef.current = true;
      setCurrent((c) => c + 1);
    }, interval);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, current, bpm, finished]);

  useEffect(() => {
    if (finished) setRunning(false);
  }, [finished]);

  const restart = () => {
    setCurrent(0);
    setStatus(new Array(song.notes.length).fill('idle'));
    hitThisNoteRef.current = false;
    holdRef.current = 0;
    armedRef.current = true;
  };

  const toggleRun = async () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (finished) restart();
    if (!pitch.listening) await pitch.start();
    setRunning(true);
  };

  const hits = status.filter((s) => s === 'hit').length;

  return (
    <div className="app">
      <header>
        <h1>הרמוניקה</h1>
        <p className="sub">לימוד ותרגול מפוחית דיאטונית ב-C</p>
      </header>

      <section className="controls">
        <label>
          שיר
          <select value={songId} onChange={(e) => setSongId(e.target.value)}>
            {parsed.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          מצב
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setRunning(false);
            }}
          >
            <option value="free">חופשי – מתקדם כשמנגנים נכון</option>
            <option value="tempo">קצב – מטרונום מוביל</option>
          </select>
        </label>

        {mode === 'tempo' && (
          <label>
            BPM {bpm}
            <input
              type="range"
              min={40}
              max={160}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
            />
          </label>
        )}

        <div className="buttons">
          <button className="primary" onClick={toggleRun}>
            {running ? 'עצור' : finished ? 'מהתחלה' : 'התחל'}
          </button>
          <button onClick={restart} disabled={running}>
            אפס
          </button>
          <button onClick={() => target && playNote(target.midi)} disabled={!target}>
            השמע תו נוכחי
          </button>
          <button onClick={() => (pitch.listening ? pitch.stop() : pitch.start())}>
            {pitch.listening ? 'כבה מיקרופון' : 'הפעל מיקרופון'}
          </button>
        </div>
        {pitch.error && <p className="error">שגיאת מיקרופון: {pitch.error}</p>}
      </section>

      <Tuner detected={pitch.detected} target={target} volume={pitch.volume} listening={pitch.listening} />

      <TabView song={song} current={current} status={status} onNoteClick={(n) => playNote(n.midi)} />

      <footer>
        <span>
          {hits} / {song.notes.length} תווים נכונים
        </span>
        {finished && <strong> · כל הכבוד, סיימת את השיר!</strong>}
        {song.source && (
          <a href={song.source} target="_blank" rel="noreferrer">
            מקור הטאבים
          </a>
        )}
      </footer>
    </div>
  );
}
