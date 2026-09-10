import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { songs } from './data/songs';
import { parseSong } from './lib/tabs';
import { usePitch } from './lib/usePitch';
import { createMatcher, resetMatcher, stepMatcher } from './lib/matcher';
import { useSettings } from './lib/settings';
import { click, playNote } from './lib/tone';
import {
  clearHistory,
  loadHistory,
  saveAttempt,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_START,
  SPEED_STEP,
  STREAK_TO_LEVEL_UP,
  type Attempt,
  type Mistake,
  type Mode,
} from './lib/practice';
import { useAuth } from './lib/useAuth';
import {
  deleteAllCloudData,
  deleteSongCloudData,
  exportHistoryJson,
  importHistoryJson,
  pendingCount,
  syncAll,
} from './lib/sync';
import { clearAllHistory } from './lib/practice';
import { TabView, type NoteStatus } from './components/TabView';
import { Tuner } from './components/Tuner';
import { Summary } from './components/Summary';
import { AccountBar, type SyncStatus } from './components/AccountBar';
import { Calibration } from './components/Calibration';

/** pause before the next loop starts */
const LOOP_PAUSE_MS = 1500;

export default function App() {
  const parsed = useMemo(() => songs.map(parseSong), []);
  const [songId, setSongId] = useState(parsed[0].id);
  const song = parsed.find((s) => s.id === songId)!;

  // ---- practice settings ----
  const [mode, setMode] = useState<Mode>('free');
  const [range, setRange] = useState<[number, number]>([0, song.lines.length - 1]);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(SPEED_START);
  const [autoLevel, setAutoLevel] = useState(true);
  const [streak, setStreak] = useState(0);

  // ---- run state ----
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState<NoteStatus[]>([]);
  const [summary, setSummary] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<Attempt[]>(() => loadHistory(parsed[0].id));
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);

  const pitch = usePitch();
  const settings = useSettings();
  const [view, setView] = useState<'practice' | 'calibration'>('practice');

  // ---- account & cloud sync ----
  const auth = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('off');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pending, setPending] = useState(() => pendingCount());
  const [toast, setToast] = useState<string | null>(null);
  const songIdRef = useRef(songId);
  songIdRef.current = songId;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const runSync = useCallback(async () => {
    if (!auth.user) return;
    setSyncStatus('syncing');
    try {
      const r = await syncAll(auth.user.id);
      setSyncStatus('idle');
      setSyncError(null);
      if (r.changedSongs.includes(songIdRef.current)) setHistory(loadHistory(songIdRef.current));
      if (r.pulled > 0) showToast(`נמשכו ${r.pulled} ניסיונות ממכשירים אחרים`);
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setPending(pendingCount());
    }
  }, [auth.user, showToast]);

  // sign-in / app load → full sync; sign-out → wipe local copy (shared devices)
  const prevUserRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!auth.ready) return;
    const uid = auth.user?.id ?? null;
    if (prevUserRef.current !== undefined && prevUserRef.current !== null && uid === null) {
      clearAllHistory();
      setHistory([]);
      setSummary(null);
      setPending(0);
      setSyncStatus('off');
    }
    prevUserRef.current = uid;
    if (uid) void runSync();
  }, [auth.ready, auth.user, runSync]);

  // retry when the connection comes back
  useEffect(() => {
    const onOnline = () => void runSync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runSync]);

  const exportHistory = () => {
    const blob = new Blob([exportHistoryJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `harmonkia-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importHistory = async (file: File) => {
    try {
      const n = importHistoryJson(await file.text());
      setHistory(loadHistory(songId));
      setPending(pendingCount());
      showToast(n > 0 ? `יובאו ${n} ניסיונות חדשים` : 'לא נמצאו ניסיונות חדשים בקובץ');
      void runSync();
    } catch (e) {
      showToast(`הייבוא נכשל: ${e instanceof Error ? e.message : 'קובץ לא תקין'}`);
    }
  };

  const deleteAll = async () => {
    if (!auth.user) return;
    if (!window.confirm('למחוק את כל היסטוריית התרגולים שלך מהענן ומהמכשיר הזה? אי אפשר לבטל.')) return;
    try {
      await deleteAllCloudData(auth.user.id);
      setHistory([]);
      setSummary(null);
      setPending(0);
      showToast('כל הנתונים נמחקו');
    } catch (e) {
      showToast(`המחיקה נכשלה: ${e instanceof Error ? e.message : 'שגיאה'}`);
    }
  };

  const clearSongHistory = async () => {
    clearHistory(song.id);
    setHistory([]);
    setPending(pendingCount());
    if (auth.user) {
      try {
        await deleteSongCloudData(auth.user.id, song.id);
      } catch (e) {
        showToast(`נמחק מקומית, אבל לא מהענן: ${e instanceof Error ? e.message : 'שגיאה'}`);
      }
    }
  };

  // section boundaries (note indices, inclusive)
  const section = useMemo(() => {
    const first = song.lines[range[0]]?.[0]?.index ?? 0;
    const lastLine = song.lines[range[1]] ?? [];
    const last = lastLine[lastLine.length - 1]?.index ?? song.notes.length - 1;
    return { first, last, count: last - first + 1 };
  }, [song, range]);

  const finished = current > section.last;
  const target = finished ? undefined : song.notes[current];
  const bpm = Math.round((song.bpm * speed) / 100);

  // refs for detection logic (avoid stale closures in the rAF-driven effect)
  const matcherRef = useRef(createMatcher());
  const hitThisNoteRef = useRef(false);
  const mistakesRef = useRef<Mistake[]>([]);
  const startedAtRef = useRef(0);
  const passEndedRef = useRef(false);
  const loopTimerRef = useRef(0);

  const resetPass = useCallback(
    (from: number) => {
      window.clearTimeout(loopTimerRef.current);
      setCurrent(from);
      setStatus(new Array(song.notes.length).fill('idle'));
      resetMatcher(matcherRef.current);
      hitThisNoteRef.current = false;
      mistakesRef.current = [];
      startedAtRef.current = performance.now();
      passEndedRef.current = false;
    },
    [song],
  );

  // song changed: reset everything
  useEffect(() => {
    setRange([0, song.lines.length - 1]);
    setRunning(false);
    setSummary(null);
    setStreak(0);
    setHistory(loadHistory(song.id));
    resetPass(song.lines[0]?.[0]?.index ?? 0);
  }, [song, resetPass]);

  // section changed: jump to its start
  useEffect(() => {
    setRunning(false);
    setStreak(0);
    resetPass(section.first);
  }, [section, resetPass]);

  // ---- pitch → hit / mistake ----
  useEffect(() => {
    if (!running || finished || !target) return;
    const d = pitch.detected;
    const ev = stepMatcher(matcherRef.current, d, target.midi, settings);
    if (ev === 'none' || !d) return;

    if (ev === 'hit') {
      if (hitThisNoteRef.current) return;
      hitThisNoteRef.current = true;
      setStatus((s) => s.map((v, i) => (i === current ? 'hit' : v)));
      if (mode === 'free') {
        window.setTimeout(() => {
          hitThisNoteRef.current = false;
          setCurrent((c) => c + 1);
        }, 120);
      }
    } else if (!hitThisNoteRef.current) {
      mistakesRef.current.push({
        index: current,
        hole: target.hole,
        breath: target.breath,
        playedHole: d.nearest.hole,
        playedBreath: d.nearest.breath,
      });
      setStatus((s) => s.map((v, i) => (i === current && v === 'idle' ? 'miss' : v)));
    }
  }, [pitch.detected, running, finished, target, current, mode, settings]);

  // ---- tempo mode: metronome drives the cursor ----
  useEffect(() => {
    if (!running || mode !== 'tempo' || finished || !target) return;
    const prev = song.notes[current - 1];
    click(!prev || prev.line !== target.line);
    const id = window.setTimeout(() => {
      if (!hitThisNoteRef.current) {
        setStatus((s) => s.map((v, i) => (i === current && v === 'idle' ? 'miss' : v)));
        // not played at all → record as a miss without "playedInstead"
        const already = mistakesRef.current.some((m) => m.index === current);
        if (!already) mistakesRef.current.push({ index: current, hole: target.hole, breath: target.breath });
      }
      hitThisNoteRef.current = false;
      resetMatcher(matcherRef.current);
      setCurrent((c) => c + 1);
    }, 60000 / bpm);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, current, bpm, finished]);

  // ---- end of pass: summary, history, graduated speed, loop ----
  useEffect(() => {
    if (!running || !finished || passEndedRef.current) return;
    passEndedRef.current = true;

    const hits = status.slice(section.first, section.last + 1).filter((s) => s === 'hit').length;
    const attempt: Attempt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      songId: song.id,
      at: Date.now(),
      mode,
      speed,
      lines: range,
      total: section.count,
      hits,
      mistakes: mistakesRef.current,
      clean: hits === section.count && mistakesRef.current.length === 0,
      duration: (performance.now() - startedAtRef.current) / 1000,
    };
    setHistory(saveAttempt(attempt));
    setSummary(attempt);
    setPending(pendingCount());
    if (auth.user) void runSync();

    let nextStreak = attempt.clean ? streak + 1 : 0;
    let nextSpeed = speed;
    if (autoLevel && mode === 'tempo' && nextStreak >= STREAK_TO_LEVEL_UP && speed < SPEED_MAX) {
      nextSpeed = Math.min(SPEED_MAX, speed + SPEED_STEP);
      nextStreak = 0;
      setLevelUpMsg(`שלוש פעמים נקי – עולים ל-${nextSpeed}%`);
      window.setTimeout(() => setLevelUpMsg(null), 3000);
    }
    setStreak(nextStreak);
    setSpeed(nextSpeed);

    if (loop) {
      loopTimerRef.current = window.setTimeout(() => resetPass(section.first), LOOP_PAUSE_MS);
    } else {
      setRunning(false);
    }
  }, [running, finished, status, section, song.id, mode, speed, range, streak, autoLevel, loop, resetPass, auth.user, runSync]);

  // ---- handlers ----
  const toggleRun = async () => {
    if (running) {
      setRunning(false);
      window.clearTimeout(loopTimerRef.current);
      return;
    }
    if (finished) resetPass(section.first);
    if (!pitch.listening) await pitch.start();
    setRunning(true);
  };

  const selectLine = (line: number, extend: boolean) => {
    setRange((r) => {
      if (!extend) return [line, line];
      return [Math.min(r[0], line), Math.max(r[1], line)];
    });
  };

  const lineLabel = (li: number) => {
    const words = song.lines[li].map((n) => n.syllable).join(' ').replace(/- /g, '');
    return `${li + 1}. ${words.length > 22 ? words.slice(0, 22) + '…' : words}`;
  };

  const sectionHits = status.slice(section.first, section.last + 1).filter((s) => s === 'hit').length;

  if (view === 'calibration') {
    return (
      <div className="app">
        <Calibration pitch={pitch} onClose={() => setView('practice')} />
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>הרמוניקה</h1>
          <p className="sub">לימוד ותרגול מפוחית דיאטונית ב-C</p>
        </div>
        <AccountBar
          ready={auth.ready}
          user={auth.user}
          status={auth.user ? syncStatus : 'off'}
          pending={pending}
          error={auth.error ?? syncError}
          onSignIn={() => void auth.signIn()}
          onSignOut={() => void auth.signOut()}
          onSyncNow={() => void runSync()}
          onExport={exportHistory}
          onImport={(f) => void importHistory(f)}
          onDeleteAll={() => void deleteAll()}
        />
      </header>
      {toast && <div className="toast">{toast}</div>}

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

        <label>
          קטע לתרגול
          <div className="range">
            <select value={range[0]} onChange={(e) => setRange([Number(e.target.value), Math.max(Number(e.target.value), range[1])])}>
              {song.lines.map((_, li) => (
                <option key={li} value={li}>
                  {lineLabel(li)}
                </option>
              ))}
            </select>
            <span>עד</span>
            <select value={range[1]} onChange={(e) => setRange([Math.min(range[0], Number(e.target.value)), Number(e.target.value)])}>
              {song.lines.map((_, li) => (
                <option key={li} value={li}>
                  {lineLabel(li)}
                </option>
              ))}
            </select>
          </div>
        </label>

        {mode === 'tempo' && (
          <label>
            מהירות {speed}% ({bpm} BPM)
            <input
              type="range"
              min={SPEED_MIN}
              max={SPEED_MAX}
              step={SPEED_STEP}
              value={speed}
              onChange={(e) => {
                setSpeed(Number(e.target.value));
                setStreak(0);
              }}
            />
          </label>
        )}

        <div className="checks">
          <label className="check">
            <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> חזור על הקטע בלופ
          </label>
          {mode === 'tempo' && (
            <label className="check">
              <input type="checkbox" checked={autoLevel} onChange={(e) => setAutoLevel(e.target.checked)} /> העלה
              מהירות אחרי {STREAK_TO_LEVEL_UP} פעמים נקי
            </label>
          )}
        </div>

        <div className="buttons">
          <button className="primary" onClick={toggleRun}>
            {running ? 'עצור' : finished ? 'שוב' : 'התחל'}
          </button>
          <button onClick={() => resetPass(section.first)} disabled={running}>
            אפס
          </button>
          <button onClick={() => target && playNote(target.midi)} disabled={!target}>
            השמע תו נוכחי
          </button>
          <button onClick={() => (pitch.listening ? pitch.stop() : pitch.start())}>
            {pitch.listening ? 'כבה מיקרופון' : 'הפעל מיקרופון'}
          </button>
          <button
            onClick={() => {
              setRunning(false);
              setView('calibration');
            }}
            title="בדיקה וכיול של זיהוי הצליל"
          >
            כיול
          </button>
        </div>
        {pitch.error && <p className="error">שגיאת מיקרופון: {pitch.error}</p>}
      </section>

      <div className="statusbar">
        <span>
          קטע: שורות {range[0] + 1}–{range[1] + 1} · {sectionHits}/{section.count} תווים נכונים
        </span>
        <span className="streak" title="פעמים נקיות ברצף">
          {'●'.repeat(streak)}
          {'○'.repeat(Math.max(0, STREAK_TO_LEVEL_UP - streak))}
        </span>
        {levelUpMsg && <strong className="levelup">{levelUpMsg}</strong>}
        {finished && running && loop && <span className="muted">מתחילים שוב…</span>}
      </div>

      <Tuner detected={pitch.detected} target={target} volume={pitch.volume} listening={pitch.listening} />

      <Summary
        attempt={summary}
        history={history}
        onClose={() => setSummary(null)}
        onClearHistory={() => void clearSongHistory()}
      />

      <TabView
        song={song}
        current={finished ? -1 : current}
        status={status}
        range={range}
        onNoteClick={(n) => playNote(n.midi)}
        onLineClick={selectLine}
      />

      <footer>
        <span className="muted desktop-hint">לחיצה על מספר שורה בוחרת אותה לתרגול; Shift+לחיצה מרחיבה את הקטע.</span>
        {song.source && (
          <a href={song.source} target="_blank" rel="noreferrer">
            מקור הטאבים
          </a>
        )}
      </footer>
    </div>
  );
}
