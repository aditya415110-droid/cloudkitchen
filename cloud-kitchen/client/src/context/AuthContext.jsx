import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (sessionParam) => {
    try {
      const res = await api.getMe();
      const userData = res?.data || res;
      setUser(userData);
      return userData;
    } catch (err) {
      console.warn('Backend profile fetch failed, using Supabase session fallback:', err.message);
      try {
        const session = sessionParam || (await supabase.auth.getSession()).data.session;
        if (session?.user) {
          const fallbackUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
            role: session.user.user_metadata?.role || 'CUSTOMER',
          };
          setUser(fallbackUser);
          return fallbackUser;
        }
      } catch (sessionErr) {
        console.error('Error fetching fallback session:', sessionErr);
      }
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (session) => {
      if (session) {
        await fetchUser(session);
      } else {
        if (isMounted) setUser(null);
      }
      if (isMounted) setLoading(false);
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        handleSession(session);
      }
    }).catch((err) => {
      console.error('Error fetching Supabase session:', err);
      if (isMounted) setLoading(false);
    });

    // Listen for auth state changes (e.g. OAuth callback sign in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await handleSession(session);
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, fetchUser, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
