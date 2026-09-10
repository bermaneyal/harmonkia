import type { Song, TabNote } from '../lib/tabs';

export type NoteStatus = 'idle' | 'hit' | 'miss';

interface Props {
  song: Song;
  current: number;
  status: NoteStatus[];
  /** inclusive line range being practiced */
  range: [number, number];
  onNoteClick?: (note: TabNote) => void;
  onLineClick?: (line: number, shiftKey: boolean) => void;
}

/**
 * Renders the song as lines of tab "cards": hole number with an arrow
 * (↑ blow / ↓ draw) and the syllable beneath. Tabs read left-to-right even
 * in an RTL page, so the line container is forced to dir="ltr"; syllables
 * are Hebrew so each card is dir="rtl".
 *
 * Clicking the line number selects that line as the practice section;
 * shift+click extends the section to include it.
 */
export function TabView({ song, current, status, range, onNoteClick, onLineClick }: Props) {
  return (
    <section className="tabs">
      {song.lines.map((line, li) => {
        const inside = li >= range[0] && li <= range[1];
        return (
          <div className={`tab-row ${inside ? '' : 'outside'}`} dir="ltr" key={li}>
            <button
              type="button"
              className="line-no"
              onClick={(e) => onLineClick?.(li, e.shiftKey)}
              title="לחיצה: תרגל שורה זו · Shift+לחיצה: הרחב את הקטע"
            >
              {li + 1}
            </button>
            <div className="tab-line" dir="ltr">
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
          </div>
        );
      })}
    </section>
  );
}
