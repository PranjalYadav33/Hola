import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import CallProvider from "@/components/call/call-manager";
import { Toaster } from "react-hot-toast";
import { SupabaseAuthProvider } from "@/providers/supabase-auth-provider";
import AuthGate from "@/components/auth-gate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hola",
  description: "Hola - A modern, real-time chat experience",
  icons: {
    icon: "/hola-logo.svg",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseAuthProvider>
            <CallProvider>
              <AuthGate>
                {children}
              </AuthGate>
              <Toaster />
            </CallProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
