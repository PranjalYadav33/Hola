import { NextResponse } from "next/server";

// No-op middleware (we will protect routes inside pages/layouts using Supabase session)
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
