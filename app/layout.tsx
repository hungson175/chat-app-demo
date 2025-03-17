import type { Metadata } from 'next'
import './globals.css'
import PlausibleProvider from 'next-plausible'
import ClientLayout from './layout-client'

export const metadata: Metadata = {
  title: 'Tư vấn đầu tư chứng khoán dài hạn',
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
      <head>
        <PlausibleProvider domain="chat-app-demo-sp7a.onrender.com" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
