"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";

function AuthGateContent({ children }: { children: React.ReactNode }) {
  const { session, loading, user } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authCheckDelay, setAuthCheckDelay] = useState(false);

  useEffect(() => {
    // Check if we just came from OAuth callback
    const authSuccess = searchParams?.get('auth');
    if (authSuccess === 'success' && !session && !loading) {
      console.log('OAuth success detected, waiting for session...');
      setAuthCheckDelay(true);
      // Give extra time for session to be established
      const timer = setTimeout(() => {
        setAuthCheckDelay(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, session, loading]);

  useEffect(() => {
    console.log('AuthGate - Session state:', { 
      hasSession: !!session, 
      loading, 
      pathname, 
      userId: user?.id,
      userEmail: user?.email,
      authCheckDelay
    });

    // Don't redirect if we're still waiting for auth to complete
    if (authCheckDelay) {
      return;
    }

    if (!loading) {
      if (!session && pathname !== "/login" && !pathname.startsWith("/auth")) {
        console.log('No session, redirecting to login from:', pathname);
        router.replace("/login");
      } else if (session && pathname === "/login") {
        console.log('Has session, redirecting to home from login');
        // Clear any auth success parameters when redirecting
        const url = new URL(window.location.href);
        url.pathname = '/';
        url.searchParams.delete('auth');
        router.replace(url.pathname + url.search);
      }
    }
  }, [session, loading, router, pathname, user, authCheckDelay]);

  // Show loading state while checking authentication or waiting for OAuth
  if (loading || authCheckDelay) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>{authCheckDelay ? 'Completing authentication...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Allow access to auth pages without session
  if (!session && (pathname === "/login" || pathname.startsWith("/auth"))) {
    return <>{children}</>;
  }

  // Require session for all other pages
  if (!session) {
    return null;
  }

  return <>{children}</>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <AuthGateContent>{children}</AuthGateContent>
    </Suspense>
  );
}
