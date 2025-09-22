import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.redirect(new URL('/login?error=configuration', request.url));
    }

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Redirect to the main app
        return NextResponse.redirect(new URL(next, request.url));
      } else {
        console.error('Auth callback error:', error);
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
      return NextResponse.redirect(new URL('/login?error=unexpected', request.url));
    }
  }

  // No code present, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}