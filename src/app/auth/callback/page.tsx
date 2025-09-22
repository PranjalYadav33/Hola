"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not available');
        router.replace('/login?error=configuration');
        return;
      }

      try {
        // Get the current session after OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }

        if (data.session) {
          console.log('Auth callback successful, redirecting to home');
          router.replace('/');
        } else {
          console.log('No session found, redirecting to login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        router.replace('/login?error=unexpected');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
}