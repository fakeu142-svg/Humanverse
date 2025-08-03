'use client';

import { TruthGame } from '@/components/truth/TruthGame';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function TruthVersePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-orange-900">
        <TruthGame />
      </div>
    </AuthGuard>
  );
}
