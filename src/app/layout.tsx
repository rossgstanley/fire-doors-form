import './globals.css'
import { Inter } from 'next/font/google'
import 'leaflet/dist/leaflet.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Fire Door Survey',
  description: 'Fire door survey and inspection application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
} 