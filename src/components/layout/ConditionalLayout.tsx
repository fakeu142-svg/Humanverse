'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import AppNavigation from '@/components/navigation/AppNavigation';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pages that should NOT show navigation
  const pagesWithoutNav = [
    '/',
    '/login',
    '/register',
    '/admin/login',
    '/admin/soulgate'
  ];

  // Pages that should show navigation even in demo mode (only after mounting)
  const demoPages = ['/explore', '/truth', '/chat', '/dropzone', '/mask-selection'];
  const isDemoPage = mounted ? demoPages.some(page => pathname.startsWith(page)) : false;

  // Check if current page should show navigation (conservative approach until mounted)
  const shouldShowNav = mounted ?
    (isAuthenticated || isDemoPage) && !pagesWithoutNav.includes(pathname) && !pathname.startsWith('/admin/') :
    false;

  return (
    <>
      {shouldShowNav && <AppNavigation />}
      <main className={shouldShowNav ? 'flex-1' : ''}>
        {children}
      </main>
    </>
  );
}
