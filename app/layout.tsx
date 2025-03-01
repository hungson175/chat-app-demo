import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SonPH - Tư vấn đầu tư chứng khoán dài hạn',
  description: 'Tư vấn đầu tư chứng khoán dài hạn',
  generator: 'v0.dev & Cursor IDE',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
