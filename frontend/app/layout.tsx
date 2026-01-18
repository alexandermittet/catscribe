import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'admitted - Audio Transcription Service',
  description: 'Transcribe audio files using OpenAI Whisper',
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
