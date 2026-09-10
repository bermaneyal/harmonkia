import { useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { cloudEnabled } from '../lib/supabase';
import { userDisplay } from '../lib/useAuth';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

interface Props {
  ready: boolean;
  user: User | null;
  status: SyncStatus;
  pending: number;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onDeleteAll: () => void;
}

/** Header strip: Google sign-in, sync status, and a small settings menu. */
export function AccountBar(p: Props) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const statusText =
    p.status === 'syncing'
      ? 'מסנכרן…'
      : p.status === 'error'
        ? 'שגיאת סנכרון'
        : p.pending > 0
          ? `${p.pending} ניסיונות מחכים לסנכרון`
          : 'מסונכרן';

  return (
    <div className="account">
      {cloudEnabled && p.ready && !p.user && (
        <button className="google" onClick={p.onSignIn} title="שמור את ההיסטוריה בענן וסנכרן בין מכשירים">
          <GoogleIcon /> התחבר עם Google
        </button>
      )}

      {p.user && (
        <div className={`whoami ${p.status}`} title={statusText}>
          {userDisplay(p.user).avatar ? (
            <img src={userDisplay(p.user).avatar} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span className="avatar-fallback">{userDisplay(p.user).name.slice(0, 1)}</span>
          )}
          <span className="name">{userDisplay(p.user).name}</span>
          <span className={`dot ${p.status} ${p.pending > 0 ? 'pending' : ''}`} />
        </div>
      )}

      <div className="menu-wrap">
        <button className="icon" onClick={() => setOpen((o) => !o)} title="הגדרות" aria-label="הגדרות">
          ⋯
        </button>
        {open && (
          <div className="menu" onMouseLeave={() => setOpen(false)}>
            {p.user && (
              <>
                <div className="menu-status">{statusText}</div>
                <button onClick={() => { p.onSyncNow(); setOpen(false); }}>סנכרן עכשיו</button>
              </>
            )}
            <button onClick={() => { p.onExport(); setOpen(false); }}>ייצא היסטוריה (JSON)</button>
            <button onClick={() => fileRef.current?.click()}>ייבא היסטוריה מקובץ…</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) p.onImport(f);
                e.target.value = '';
                setOpen(false);
              }}
            />
            {p.user && (
              <>
                <hr />
                <button onClick={() => { p.onSignOut(); setOpen(false); }}>התנתק</button>
                <button className="danger" onClick={() => { p.onDeleteAll(); setOpen(false); }}>
                  מחק את כל הנתונים שלי
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {p.error && <span className="error small">{p.error}</span>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
