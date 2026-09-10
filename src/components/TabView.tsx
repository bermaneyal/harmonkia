import type { Song, TabNote } from '../lib/tabs';

export type NoteStatus = 'idle' | 'hit' | 'miss';

interface Props {
  song: Song;
  current: number;
  status: NoteStatus[];
  onNoteClick?: (note: TabNote) => void;
}

/**
 * Renders the song as lines of tab "cards": hole number with an arrow
 * (↑ blow / ↓ draw) and the syllable beneath. Tabs read left-to-right even
 * in an RTL page, so the line container is forced to dir="ltr"; syllables
 * are Hebrew so each card is dir="rtl".
 */
export function TabView({ song, current, status, onNoteClick }: Props) {
  return (
    <section className="tabs">
      {song.lines.map((line, li) => (
        <div className="tab-line" dir="ltr" key={li}>
          {line.map((n) => {
            const cls = [
              'note',
              n.breath,
              n.index === current ? 'current' : '',
              status[n.index] ?? 'idle',
            ].join(' ');
            return (
              <button
                type="button"
                key={n.index}
                className={cls}
                onClick={() => onNoteClick?.(n)}
                title={`חור ${n.hole} ${n.breath === 'blow' ? 'נשיפה' : 'שאיפה'}`}
              >
                <span className="arrow">{n.breath === 'blow' ? '↑' : '↓'}</span>
                <span className="hole">{n.hole}</span>
                <span className="syl" dir="rtl">
                  {n.syllable}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}
