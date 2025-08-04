'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLogin from '@/components/admin/AdminLogin';
import { useAdminStore } from '@/store/adminStore';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAdminStore();

  useEffect(() => {
    // Admin auth checks completely disabled in demo mode
    console.log('Admin login: Auth checks disabled');
  }, [checkAuth]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push('/admin/soulgate');
    }
  }, [isAuthenticated, router]);

  const handleLoginSuccess = () => {
    // Redirect to admin dashboard
    router.push('/admin/soulgate');
  };

  return <AdminLogin onSuccess={handleLoginSuccess} />;
}
