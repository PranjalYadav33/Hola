"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not available');
        setMessage('Configuration error');
        setTimeout(() => router.replace('/login?error=configuration'), 2000);
        return;
      }

      try {
        // Check for auth code in URL parameters
        const code = searchParams.get('code');
        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            setMessage('Authentication failed');
            setTimeout(() => router.replace(`/login?error=${encodeURIComponent(error.message)}`), 2000);
            return;
          }

          if (data?.session) {
            console.log('Auth successful, redirecting to home');
            setMessage('Authentication successful! Redirecting...');
            // Give a moment for the auth context to update
            setTimeout(() => router.replace('/'), 500);
            return;
          }
        }

        // Fallback: check for existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session check error:', sessionError);
          setMessage('Session verification failed');
          setTimeout(() => router.replace(`/login?error=${encodeURIComponent(sessionError.message)}`), 2000);
          return;
        }

        if (sessionData?.session) {
          console.log('Existing session found, redirecting to home');
          setMessage('Authentication successful! Redirecting...');
          setTimeout(() => router.replace('/'), 500);
        } else {
          console.log('No session found, redirecting to login');
          setMessage('Authentication incomplete');
          setTimeout(() => router.replace('/login'), 2000);
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        setMessage('Unexpected error occurred');
        setTimeout(() => router.replace('/login?error=unexpected'), 2000);
      }
    };

    // Use a small delay to ensure the URL parameters are available
    const timer = setTimeout(handleAuthCallback, 200);
    return () => clearTimeout(timer);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
      <div className="text-center text-white max-w-md mx-auto p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg font-medium mb-2">{message}</p>
        <p className="text-sm text-white/80">Please wait while we complete your sign-in...</p>
      </div>
    </div>
  );
}