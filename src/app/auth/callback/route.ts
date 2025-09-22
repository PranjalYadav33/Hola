import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';

// OAuth callback handler for Supabase authentication
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  console.log('OAuth callback received:', { 
    hasCode: !!code, 
    next,
    fullUrl: request.url 
  });

  if (code) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error('Supabase client not available in callback');
      return NextResponse.redirect(new URL('/login?error=configuration', origin));
    }

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error && data.session) {
        console.log('OAuth callback success:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          hasAccessToken: !!data.session.access_token
        });
        
        // Add a small delay to ensure session is properly established
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Redirect to home with success parameter
        const redirectUrl = new URL('/', origin);
        redirectUrl.searchParams.set('auth', 'success');
        
        return NextResponse.redirect(redirectUrl);
      } else {
        console.error('Auth callback error:', error);
        const errorMessage = error?.message || 'Authentication failed';
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, origin));
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error);
      return NextResponse.redirect(new URL('/login?error=unexpected', origin));
    }
  }

  console.log('No code in callback, redirecting to login');
  return NextResponse.redirect(new URL('/login', origin));
}