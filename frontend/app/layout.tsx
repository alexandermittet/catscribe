import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from './contexts/LanguageContext'
import { FontProvider } from './contexts/FontContext'

export const metadata: Metadata = {
  title: 'catscribe - Lydtransskriptionstjeneste',
  description: 'Sød kat der transskriberer dine lydfiler på næsten alle sprog',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <body>
        <LanguageProvider>
          <FontProvider>
            {children}
          </FontProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
