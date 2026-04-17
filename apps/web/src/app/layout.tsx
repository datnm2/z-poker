import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zpoker.vercel.app";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const TITLE = "Z-Poker — Poker trưa văn phòng, có Elo đàng hoàng";
const DESCRIPTION =
  "Z-Poker giúp dân văn phòng tracking Elo poker dài hạn qua mỗi giờ trưa. Chip ảo, chơi vui, không tiền thật. Tách biệt theo email công ty.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Z-Poker",
  },
  description: DESCRIPTION,
  applicationName: "Z-Poker",
  keywords: [
    "poker",
    "elo",
    "office poker",
    "poker văn phòng",
    "poker trưa",
    "elo tracker",
    "poker leaderboard",
    "z-poker",
  ],
  authors: [{ name: "Dat Light Solution", url: "https://dat09vn.com" }],
  creator: "Dat Light Solution",
  alternates: {
    canonical: "/",
    languages: {
      "vi-VN": "/",
      "en-US": "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: "Z-Poker",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "vi_VN",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/icon",
        width: 512,
        height: 512,
        alt: "Z-Poker",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Z-Poker",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
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
      lang="vi"
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
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
