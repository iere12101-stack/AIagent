import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'

const fontVariables: CSSProperties = {
  '--font-geist-sans':
    '"Avenir Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  '--font-geist-mono':
    '"IBM Plex Mono", "SFMono-Regular", "SF Mono", Menlo, Consolas, monospace',
} as CSSProperties

export const metadata: Metadata = {
  title: 'IERE AI Chatbot Dashboard',
  description: 'Investment Experts Real Estate — AI-Powered WhatsApp Chatbot',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body style={fontVariables} className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
