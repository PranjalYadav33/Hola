"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import Image from "next/image";
import { Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useSupabaseAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session && !authLoading) {
      router.replace("/");
    }
  }, [session, authLoading, router]);

  useEffect(() => {
    // Check for error messages from URL parameters
    const error = searchParams?.get('error');
    if (error) {
      let errorMessage = decodeURIComponent(error);
      
      if (error === 'configuration') {
        errorMessage = 'Authentication service configuration error. Please contact support.';
      } else if (error === 'unexpected') {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      setMessage(errorMessage);
    }
  }, [searchParams]);

  if (!supabase) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-6">
        <div className="max-w-lg w-full text-center rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/hola-logo.svg" alt="Hola" width={40} height={40} />
            <h1 className="text-2xl font-semibold">Hola</h1>
          </div>
          <p className="text-sm text-white/80">
            App is not configured. Please set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage("Authentication service is not available. Please check configuration.");
      return;
    }
    
    if (!email || !password) {
      setMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: email.trim(), 
          password 
        });
        
        if (error) {
          console.error("Login error:", error);
          throw error;
        }
        
        // Check if user session exists
        if (data.user) {
          router.replace("/");
        } else {
          throw new Error("Authentication failed - no user returned");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) {
          console.error("Registration error:", error);
          throw error;
        }
        
        if (data.user && !data.user.email_confirmed_at) {
          setMessage("Please check your email inbox to confirm your account before signing in.");
        } else if (data.user) {
          setMessage("Account created successfully! You can now sign in.");
          setMode("login");
        } else {
          throw new Error("Registration failed - no user returned");
        }
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      
      // Provide user-friendly error messages
      let errorMessage = err.message || "Something went wrong";
      
      if (err.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage = "Please check your email and click the confirmation link before signing in.";
      } else if (err.message?.includes("User already registered")) {
        errorMessage = "An account with this email already exists. Try signing in instead.";
      } else if (err.message?.includes("Password should be at least")) {
        errorMessage = "Password must be at least 6 characters long.";
      } else if (err.message?.includes("Unable to validate email address")) {
        errorMessage = "Please enter a valid email address.";
      } else if (err.message?.includes("Network request failed")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      setMessage("Authentication service is not available.");
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error("Google OAuth error:", error);
        throw error;
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setMessage(err.message || "Failed to sign in with Google");
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    if (!supabase) {
      setMessage("Authentication service is not available.");
      return;
    }
    
    if (!email || !email.includes('@')) {
      setMessage("Please enter a valid email address above to receive a reset link.");
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) {
        console.error("Password reset error:", error);
        throw error;
      }
      
      setMessage("Password reset link has been sent to your email.");
    } catch (err: any) {
      console.error("Password reset error:", err);
      setMessage(err.message || "Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background image */}
      <Image src="/bg-dark.png" alt="Background" fill priority className="object-cover" />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Top nav */}
      <header className="absolute top-0 inset-x-0 flex items-center justify-between px-6 py-4 text-white">
        <div className="flex items-center gap-2">
          <Image src="/hola-logo.svg" alt="Hola" width={28} height={28} />
          <span className="font-semibold tracking-wide">Hola</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/80">
          <span className="text-white">Login</span>
          <span className="hover:text-white">About</span>
          <span className="hover:text-white" onClick={() => setMode("register")}>Register</span>
          <span className="hover:text-white">Contact</span>
        </nav>
      </header>

      {/* Center form */}
      <main className="relative z-10 min-h-screen grid place-items-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-white shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <Image src="/hola-logo.svg" alt="Hola" width={48} height={48} className="opacity-90" />
          </div>
          <div className="space-y-4">
            <label className="block text-sm text-white/80">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-full bg-white/20 border border-white/20 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder-white/60 disabled:opacity-50"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <label className="block text-sm text-white/80">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-full bg-white/20 border border-white/20 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder-white/60 disabled:opacity-50"
                placeholder="Enter your password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full py-2 rounded-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Please wait...
                </div>
              ) : (
                mode === "login" ? "GET STARTED" : "CREATE ACCOUNT"
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-white/80 mt-3">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="accent-rose-500"
                />
                Keep Logged In
              </label>
              <button type="button" onClick={onForgotPassword} className="hover:text-white">
                Forgot Password?
              </button>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-white/20" />
              <span className="text-xs text-white/60">or</span>
              <div className="h-px flex-1 bg-white/20" />
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full py-2 rounded-full bg-white/90 text-gray-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  Please wait...
                </div>
              ) : (
                "Continue with Google"
              )}
            </button>

            {message && (
              <p className="text-xs mt-3 text-center text-rose-200">{message}</p>
            )}

            <div className="flex items-center justify-between text-xs mt-4">
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="uppercase tracking-wide text-white/80 hover:text-white"
              >
                {mode === "login" ? "CREATE ACCOUNT" : "BACK TO LOGIN"}
              </button>
              <span className="uppercase tracking-wide text-white/60">NEED HELP?</span>
            </div>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 inset-x-0 text-[11px] text-white/70 text-center py-4">
        <div className="flex items-center justify-center gap-6">
          <span>About Us</span>
          <span>Privacy Policy</span>
          <span>Terms Of Use</span>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} Hola. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
