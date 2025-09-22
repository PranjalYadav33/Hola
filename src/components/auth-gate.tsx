"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, user } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('AuthGate - Session state:', { 
      hasSession: !!session, 
      loading, 
      pathname, 
      userId: user?.id,
      userEmail: user?.email 
    });

    if (!loading) {
      if (!session && pathname !== "/login" && !pathname.startsWith("/auth")) {
        console.log('No session, redirecting to login');
        router.replace("/login");
      } else if (session && pathname === "/login") {
        console.log('Has session, redirecting to home');
        router.replace("/");
      }
    }
  }, [session, loading, router, pathname, user]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
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
