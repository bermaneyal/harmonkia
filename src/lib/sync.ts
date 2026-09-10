import { supabase } from './supabase';
import {
  clearAllHistory,
  loadAllHistory,
  markSynced,
  mergeRemote,
  type Attempt,
  type Mistake,
  type Mode,
} from './practice';

/**
 * Offline-first sync of practice history.
 *
 * localStorage is the source of truth on the device. Attempts are immutable
 * events with client-generated ids, so syncing is just a set union:
 *   push  = insert every local attempt with synced !== true (duplicates ignored)
 *   pull  = fetch everything on the server newer than what we already have
 * No conflicts are possible.
 */

interface Row {
  id: string;
  user_id: string;
  song_id: string;
  at: number;
  mode: Mode;
  speed: number;
  line_from: number;
  line_to: number;
  total: number;
  hits: number;
  mistakes: Mistake[];
  clean: boolean;
  duration: number;
}

function toRow(a: Attempt, userId: string): Row {
  return {
    id: a.id,
    user_id: userId,
    song_id: a.songId,
    at: a.at,
    mode: a.mode,
    speed: a.speed,
    line_from: a.lines[0],
    line_to: a.lines[1],
    total: a.total,
    hits: a.hits,
    mistakes: a.mistakes ?? [],
    clean: a.clean,
    duration: a.duration,
  };
}

function fromRow(r: Row): Attempt {
  return {
    id: r.id,
    songId: r.song_id,
    at: Number(r.at),
    mode: r.mode,
    speed: r.speed,
    lines: [r.line_from, r.line_to],
    total: r.total,
    hits: r.hits,
    mistakes: r.mistakes ?? [],
    clean: r.clean,
    duration: r.duration,
    synced: true,
  };
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  /** song ids whose local history changed because of the pull */
  changedSongs: string[];
}

const PAGE = 1000;

export function pendingCount(): number {
  return loadAllHistory().filter((a) => !a.synced).length;
}

export async function syncAll(userId: string): Promise<SyncResult> {
  if (!supabase) return { pushed: 0, pulled: 0, changedSongs: [] };

  // ---- push ----
  const local = loadAllHistory();
  const unsynced = local.filter((a) => !a.synced);
  if (unsynced.length > 0) {
    for (let i = 0; i < unsynced.length; i += PAGE) {
      const chunk = unsynced.slice(i, i + PAGE);
      const { error } = await supabase
        .from('attempts')
        .upsert(chunk.map((a) => toRow(a, userId)), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      markSynced(chunk.map((a) => a.id));
    }
  }

  // ---- pull ----
  // Everything newer than the newest attempt we already know to be on the
  // server. (Attempts created offline on another device and pushed later
  // could have an older `at`; a full pull happens on first sign-in per
  // device, which covers the common case. A periodic full pull is a TODO.)
  const newestSynced = local.filter((a) => a.synced).reduce((m, a) => Math.max(m, a.at), 0);
  const pulled: Attempt[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .gt('at', newestSynced)
      .order('at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    pulled.push(...rows.map(fromRow));
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  const changedSongs = mergeRemote(pulled);

  return { pushed: unsynced.length, pulled: pulled.length, changedSongs };
}

/** Deletes all of the user's attempts on the server and on this device. */
export async function deleteAllCloudData(userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('attempts').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
  clearAllHistory();
}

/** Deletes the user's rows for one song on the server (local deletion is done by the caller). */
export async function deleteSongCloudData(userId: string, songId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('attempts').delete().eq('user_id', userId).eq('song_id', songId);
  if (error) throw new Error(error.message);
}

/** JSON export of everything stored locally (backup / manual transfer). */
export function exportHistoryJson(): string {
  return JSON.stringify(
    { app: 'harmonkia', version: 1, exportedAt: new Date().toISOString(), attempts: loadAllHistory() },
    null,
    2,
  );
}

/** Imports a JSON export; returns the number of new attempts added. */
export function importHistoryJson(text: string): number {
  const parsed = JSON.parse(text) as { attempts?: Attempt[] };
  if (!Array.isArray(parsed.attempts)) throw new Error('קובץ לא תקין');
  const valid = parsed.attempts.filter((a) => a && typeof a.id === 'string' && typeof a.songId === 'string');
  const before = loadAllHistory().length;
  // imported attempts are local-only until the next sync
  mergeRemote(valid, false);
  return loadAllHistory().length - before;
}
