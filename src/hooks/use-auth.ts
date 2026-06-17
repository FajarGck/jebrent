'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { roleFromUserMetadata } from '@/lib/auth';
import type { Profile } from '@/types/database';
import type { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(
    async (currentUser: User) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
      if (!error && data) {
        setProfile(data);
        return;
      }

      const metadataRole = roleFromUserMetadata(currentUser);
      if (metadataRole) {
        setProfile({
          id: currentUser.id,
          full_name: (currentUser.user_metadata?.full_name as string) || currentUser.email?.split('@')[0] || 'User',
          role: metadataRole,
          phone: (currentUser.user_metadata?.phone as string) ?? null,
          emergency_phone: null,
          nik: null,
          avatar_url: null,
          is_available: true,
          created_at: '',
          updated_at: '',
        });
        return;
      }

      setProfile(null);
    },
    [supabase],
  );

  const refresh = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);
    if (currentUser) await fetchProfile(currentUser);
    else setProfile(null);
  }, [supabase, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await refresh();
      if (mounted) setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) await fetchProfile(nextUser);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, refresh, fetchProfile]);

  return { user, profile, loading, refresh };
}
