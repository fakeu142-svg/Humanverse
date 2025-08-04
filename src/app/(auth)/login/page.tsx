'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check if user is already authenticated (skip in demo)
    const isDemo = window.location.hostname.includes('fly.dev') ||
                  window.location.hostname.includes('localhost') ||
                  process.env.NODE_ENV === 'development';

    if (!isDemo) {
      checkAuth();
    }
  }, [checkAuth]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      router.push('/explore');
    }
  }, [isAuthenticated, router]);

  const handleLoginSuccess = () => {
    // Redirect to main app
    router.push('/explore');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-desert-900 via-desert-800 to-desert-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNEQUE1MjAiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
      </div>

      <div className="relative z-10 w-full">
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
}
