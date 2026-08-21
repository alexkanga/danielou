'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldX, Database } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Journaliser l'erreur côté client
    console.error('[App Error]', error);
  }, [error]);

  const message = error.message ?? '';
  const isForbidden = message === 'FORBIDDEN';
  const isUnauthorized = message === 'UNAUTHORIZED';
  const isDbUnavailable = message === 'DATABASE_UNAVAILABLE' || message === 'DB_UNAVAILABLE';

  if (isDbUnavailable) {
    router.replace('/dashboard/db-unavailable');
    return null;
  }

  if (isForbidden) {
    router.replace('/dashboard/forbidden');
    return null;
  }

  if (isUnauthorized) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-bold text-foreground">Une erreur est survenue</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {message || "Une erreur inattendue s'est produite."}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          Réessayer
        </Button>
        <Button onClick={() => router.push('/dashboard')} variant="default">
          Tableau de bord
        </Button>
      </div>
    </div>
  );
}
