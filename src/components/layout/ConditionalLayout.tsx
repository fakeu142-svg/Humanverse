'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import AppNavigation from '@/components/navigation/AppNavigation';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  // Pages that should NOT show navigation
  const pagesWithoutNav = [
    '/',
    '/login',
    '/register',
    '/admin/login',
    '/admin/soulgate'
  ];

  // Check if current page should show navigation
  const shouldShowNav = isAuthenticated && !pagesWithoutNav.includes(pathname) && !pathname.startsWith('/admin/');

  return (
    <>
      {shouldShowNav && <AppNavigation />}
      <main className={shouldShowNav ? 'flex-1' : ''}>
        {children}
      </main>
    </>
  );
}
