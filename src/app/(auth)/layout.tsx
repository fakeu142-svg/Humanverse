import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - Humanverse',
  description: 'Access your anonymous identity in the Humanverse',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
