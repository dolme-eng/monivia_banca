import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Monivia Banca | Gestione Finanziaria Sicura',
  description: 'Gestione sicura dei fondi Monivia — conto, carte, pagamenti e trasferimenti sotto il tuo controllo.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Monivia Banca',
    description: 'Gestione sicura dei fondi Monivia — conto, carte, pagamenti e trasferimenti.',
    url: 'https://monivia-banca.vercel.app',
    siteName: 'Monivia Banca',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Monivia Banca',
    description: 'Gestione sicura dei fondi Monivia.',
    images: ['/og-default.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={inter.variable}>
      <head>
        <meta name="msapplication-TileColor" content="#0a1628" />
        <meta name="theme-color" content="#0a1628" />
      </head>
      <body className="bg-white text-slate-900 antialiased" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
