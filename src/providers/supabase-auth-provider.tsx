"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";

export type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null, loading: true });

export const useSupabaseAuth = () => useContext(AuthContext);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Supabase client not available');
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Error getting session:', error);
      } else {
        console.log('Initial session:', { 
          hasSession: !!data.session, 
          userId: data.session?.user?.id,
          userEmail: data.session?.user?.email 
        });
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', { 
        event, 
        hasSession: !!newSession, 
        userId: newSession?.user?.id,
        userEmail: newSession?.user?.email 
      });
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Handle specific auth events
      if (event === 'SIGNED_IN') {
        console.log('User signed in successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      } else if (event === 'USER_UPDATED') {
        console.log('User updated');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, user, loading }), [session, user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
