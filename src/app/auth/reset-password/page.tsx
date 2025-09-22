"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) return;

      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setMessage("Invalid reset link. Please request a new password reset.");
          return;
        }

        if (data.session) {
          setIsValidSession(true);
        } else {
          setMessage("Invalid or expired reset link. Please request a new password reset.");
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setMessage("Something went wrong. Please try again.");
      }
    };

    checkSession();
  }, [supabase]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      setMessage("Authentication service is not available.");
      return;
    }

    if (!password || password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error("Password update error:", error);
        throw error;
      }

      setMessage("Password updated successfully! Redirecting to login...");
      
      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/login?message=Password updated successfully. Please sign in with your new password.");
      }, 2000);

    } catch (err: any) {
      console.error("Password reset error:", err);
      setMessage(err.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession && message) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* Background image */}
        <Image src="/bg-dark.png" alt="Background" fill priority className="object-cover" />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Center content */}
        <main className="relative z-10 min-h-screen grid place-items-center px-4">
          <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-white shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <Image src="/hola-logo.svg" alt="Hola" width={48} height={48} className="opacity-90" />
            </div>
            
            <h1 className="text-xl font-semibold mb-4">Reset Password</h1>
            
            <p className="text-white/80 mb-6">{message}</p>
            
            <button
              onClick={() => router.push("/login")}
              className="w-full py-2 rounded-full bg-rose-500 hover:bg-rose-600 transition font-semibold"
            >
              Back to Login
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background image */}
      <Image src="/bg-dark.png" alt="Background" fill priority className="object-cover" />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Center form */}
      <main className="relative z-10 min-h-screen grid place-items-center px-4">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-white shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <Image src="/hola-logo.svg" alt="Hola" width={48} height={48} className="opacity-90" />
          </div>
          
          <h1 className="text-xl font-semibold text-center mb-6">Set New Password</h1>

          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              message.includes("successfully") 
                ? "bg-green-500/20 text-green-300 border border-green-500/20" 
                : "bg-red-500/20 text-red-300 border border-red-500/20"
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <label className="block text-sm text-white/80">New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-full bg-white/20 border border-white/20 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder-white/60 disabled:opacity-50"
                placeholder="Enter new password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <label className="block text-sm text-white/80">Confirm New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-full bg-white/20 border border-white/20 focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder-white/60 disabled:opacity-50"
                placeholder="Confirm new password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isValidSession}
              className="mt-6 w-full py-2 rounded-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating Password...
                </div>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}