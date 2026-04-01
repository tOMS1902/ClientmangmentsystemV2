import type { Metadata } from 'next'
import { Playfair_Display, Lato, Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const playfairDisplay = Playfair_Display({
  weight: '700',
  subsets: ['latin'],
  variable: '--font-display',
})

const lato = Lato({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-body',
})

const montserrat = Montserrat({
  weight: '600',
  subsets: ['latin'],
  variable: '--font-label',
})

export const metadata: Metadata = {
  title: 'Legal Edge',
  description: 'Premium coaching platform for legal professionals',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${lato.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
