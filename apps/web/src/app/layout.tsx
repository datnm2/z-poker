import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/providers/auth-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { AppTopBar } from "@/components/app-top-bar";
import { PoweredByBadge } from "@/components/powered-by-badge";
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
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
    { media: "(prefers-color-scheme: light)", color: "#faf5ff" },
  ],
};

const THEME_INIT_SCRIPT = `
(function(){try{var t=localStorage.getItem('z-poker-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body suppressHydrationWarning className="flex min-h-dvh flex-col bg-background text-foreground antialiased">
        <ClerkProvider>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <AppTopBar />
                <main className="flex flex-1 flex-col">{children}</main>
                <footer className="flex justify-center pb-24 pt-6">
                  <PoweredByBadge />
                </footer>
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
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
