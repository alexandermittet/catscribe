import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'catscribe - Audio Transcription Service',
  description: 'Cute cat that transcribes your audio files in almost any language',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
