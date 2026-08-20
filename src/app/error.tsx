'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-xl font-bold text-foreground">Une erreur est survenue</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {error.message || 'Une erreur inattendue s\'est produite.'}
      </p>
      <Button onClick={reset} variant="outline">
        Réessayer
      </Button>
    </div>
  );
}
