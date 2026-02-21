'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.push(isAuthenticated() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-muted)',
    }}>
      Redirecting…
    </div>
  );
}
