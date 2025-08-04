import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import '@/lib/fetch-protection'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Humanverse - Anonymous Social Platform',
  description: 'Connect anonymously through masks in the Humanverse',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scrollbar-desert">
      <body className={`${inter.className} min-h-screen bg-desert-900 text-desert-100`}>
        <div className="min-h-screen flex flex-col">
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#2F1B14',
              color: '#DAA520',
              border: '1px solid #8B4513',
            },
            success: {
              iconTheme: {
                primary: '#059669',
                secondary: '#2F1B14',
              },
            },
            error: {
              iconTheme: {
                primary: '#DC2626',
                secondary: '#2F1B14',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
