import type { Detected } from '../lib/harmonica';
import { midiToName } from '../lib/harmonica';
import type { TabNote } from '../lib/tabs';

interface Props {
  detected: Detected | null;
  target?: TabNote;
  volume: number;
  listening: boolean;
}

/** Shows what the microphone hears vs. what the song expects. */
export function Tuner({ detected, target, volume, listening }: Props) {
  const match = detected && target && detected.nearest.midi === target.midi;
  const cls = ['tuner', !listening ? 'off' : match ? 'match' : detected ? 'wrong' : 'silent'].join(' ');

  return (
    <section className={cls}>
      <div className="col">
        <div className="label">צריך לנגן</div>
        {target ? (
          <div className="big">
            <span className="arrow">{target.breath === 'blow' ? '↑' : '↓'}</span>
            {target.hole}
            <small>{midiToName(target.midi)}</small>
          </div>
        ) : (
          <div className="big">—</div>
        )}
      </div>

      <div className="col">
        <div className="label">{listening ? 'המיקרופון שומע' : 'מיקרופון כבוי'}</div>
        {detected ? (
          <div className="big">
            <span className="arrow">{detected.nearest.breath === 'blow' ? '↑' : '↓'}</span>
            {detected.nearest.hole}
            <small>
              {midiToName(detected.midi)} · {detected.freq.toFixed(0)} Hz ·{' '}
              {detected.cents > 0 ? '+' : ''}
              {detected.cents.toFixed(0)}¢
            </small>
          </div>
        ) : (
          <div className="big dim">…</div>
        )}
        <div className="vu">
          <div className="vu-fill" style={{ width: `${Math.min(100, volume * 400)}%` }} />
        </div>
      </div>
    </section>
  );
}
