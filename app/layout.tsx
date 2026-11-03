import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist_Mono, Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { SkipLink } from '@/components/a11y/skip-link'
import { ThemeProvider } from '@/components/theme/theme-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-fraunces',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mathz | Quiz Toán AI và báo cáo lớp tức thì',
  description:
    'Mathz giúp giáo viên soạn quiz Toán nhanh, chấm tự động, và đọc báo cáo AI về chỗ lớp còn hổng.',
  keywords: [
    'AI quiz platform',
    'formative assessment',
    'classroom analytics',
    'auto grading',
    'school software',
    'teacher tools',
  ],
  openGraph: {
    title: 'Mathz | Quiz Toán AI và báo cáo lớp tức thì',
    description:
      'Soạn quiz Toán nhanh, chấm tự động, nhận báo cáo AI về lớp học.',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} bg-background`}
    >
      <body className="bg-background font-sans antialiased">
        <ThemeProvider>
          <SkipLink />
          {children}
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
