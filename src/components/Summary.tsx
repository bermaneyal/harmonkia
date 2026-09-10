import { accuracy, holeLabel, weakSpots, type Attempt } from '../lib/practice';

interface Props {
  attempt: Attempt | null;
  history: Attempt[];
  onClose: () => void;
  onClearHistory: () => void;
}

function breathName(b: 'blow' | 'draw') {
  return b === 'blow' ? 'נשיפה' : 'שאיפה';
}

/**
 * Summary of the last attempt, plus a progress strip and all-time weak holes
 * for this song (from localStorage history).
 */
export function Summary({ attempt, history, onClose, onClearHistory }: Props) {
  if (!attempt && history.length === 0) return null;

  const spots = attempt ? weakSpots(attempt.mistakes, 4) : [];
  const recent = history.slice(-12);
  const allTime = weakSpots(history.flatMap((a) => a.mistakes), 3);
  const best = history.reduce((m, a) => Math.max(m, accuracy(a)), 0);

  return (
    <section className="summary">
      {attempt && (
        <div className="summary-attempt">
          <div className="summary-head">
            <h2>{attempt.clean ? 'מושלם!' : 'סיכום הניסיון'}</h2>
            <button className="link" onClick={onClose}>
              סגור
            </button>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-value">{accuracy(attempt)}%</div>
              <div className="stat-label">דיוק</div>
            </div>
            <div className="stat">
              <div className="stat-value">
                {attempt.hits}/{attempt.total}
              </div>
              <div className="stat-label">תווים נכונים</div>
            </div>
            <div className="stat">
              <div className="stat-value">{attempt.mistakes.length}</div>
              <div className="stat-label">שגיאות</div>
            </div>
            {attempt.mode === 'tempo' && (
              <div className="stat">
                <div className="stat-value">{attempt.speed}%</div>
                <div className="stat-label">מהירות</div>
              </div>
            )}
            <div className="stat">
              <div className="stat-value">{attempt.duration.toFixed(0)}s</div>
              <div className="stat-label">זמן</div>
            </div>
          </div>

          {spots.length > 0 && (
            <div className="weak">
              <div className="label">איפה זה נפל</div>
              <ul>
                {spots.map((s) => (
                  <li key={`${s.breath}${s.hole}`}>
                    <b dir="ltr">{holeLabel(s.hole, s.breath)}</b> חור {s.hole} {breathName(s.breath)} –{' '}
                    {s.count === 1 ? 'שגיאה אחת' : `${s.count} שגיאות`}
                    {s.playedInstead && (
                      <span className="muted">
                        {' '}
                        (ניגנת במקום <b dir="ltr">{holeLabel(s.playedInstead.hole, s.playedInstead.breath)}</b>)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="summary-history">
          <div className="summary-head">
            <div className="label">
              התקדמות · {history.length} ניסיונות · שיא {best}%
            </div>
            <button className="link" onClick={onClearHistory}>
              נקה היסטוריה
            </button>
          </div>
          <div className="bars" dir="ltr" title="דיוק בניסיונות האחרונים">
            {recent.map((a) => (
              <div
                key={a.id}
                className={`bar ${a.clean ? 'clean' : ''}`}
                style={{ height: `${Math.max(6, accuracy(a))}%` }}
                title={`${accuracy(a)}% · ${a.mode === 'tempo' ? `${a.speed}% מהירות` : 'חופשי'} · ${new Date(
                  a.at,
                ).toLocaleString('he-IL')}`}
              />
            ))}
          </div>
          {allTime.length > 0 && (
            <div className="muted small">
              החורים החלשים שלך בשיר הזה:{' '}
              {allTime.map((s, i) => (
                <span key={`${s.breath}${s.hole}`}>
                  {i > 0 && ', '}
                  <b dir="ltr">{holeLabel(s.hole, s.breath)}</b> ({s.count})
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
