import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface AuthState {
  /** false until the initial session check finished */
  ready: boolean;
  user: User | null;
  error: string | null;
}

/** Current Supabase user + Google sign-in / sign-out. No-op when cloud is disabled. */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ ready: !supabase, user: null, error: null });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setState((s) => ({ ...s, ready: true, user: data.session?.user ?? null }));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((s) => ({ ...s, ready: true, user: session?.user ?? null }));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setState((s) => ({ ...s, error: error.message }));
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setState((s) => ({ ...s, error: error.message }));
  }, []);

  return { ...state, signIn, signOut };
}

/** Display name / avatar from the Google profile. */
export function userDisplay(user: User) {
  const meta = user.user_metadata ?? {};
  return {
    name: (meta.full_name as string) || (meta.name as string) || user.email || 'משתמש',
    avatar: (meta.avatar_url as string) || (meta.picture as string) || undefined,
  };
}
