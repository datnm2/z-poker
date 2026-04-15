import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/providers/auth-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Z-Poker",
  description: "Office Poker Elo Tracker",
  appleWebApp: {
    capable: true,
    title: "Z-Poker",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="flex min-h-dvh flex-col bg-background text-foreground antialiased">
        <ClerkProvider>
          <I18nProvider>
            <AuthProvider>
              <main className="flex flex-1 flex-col">{children}</main>
              <footer className="pb-20 pt-3 text-center text-xs text-muted-foreground/40">
                <a
                  href="https://dat09vn.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-muted-foreground"
                >
                  Powered by Dat Light Solution
                </a>
              </footer>
            </AuthProvider>
          </I18nProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
