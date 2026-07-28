import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/theme/theme-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mathz — Bài kiểm tra AI và phân tích lớp học tức thì',
  description:
    'Mathz giúp giáo viên soạn bài kiểm tra Toán trong vài phút, chấm điểm tự động, và tạo báo cáo AI về những gì lớp thực sự hiểu.',
  keywords: [
    'AI quiz platform',
    'formative assessment',
    'classroom analytics',
    'auto grading',
    'school software',
    'teacher tools',
  ],
  generator: 'v0.app',
  openGraph: {
    title: 'Mathz — Bài kiểm tra AI và phân tích lớp học tức thì',
    description:
      'Soạn bài kiểm tra Toán trong vài phút, chấm điểm tự động, và nhận báo cáo AI về lớp học.',
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
    { media: '(prefers-color-scheme: light)', color: '#fbfcfd' },
    { media: '(prefers-color-scheme: dark)', color: '#101318' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} bg-background`}
    >
      <body className="bg-background font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
