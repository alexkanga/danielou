import { Database } from 'lucide-react';

export default function DbUnavailablePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <Database className="h-16 w-16 text-warning" />
      <h1 className="text-2xl font-bold text-foreground">Base de données indisponible</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La connexion à la base de données est actuellement impossible.
        Les fonctionnalités scolaires sont temporairement inaccessibles.
        Si le problème persiste, contactez l&apos;administrateur de la plateforme.
      </p>
      <div className="mt-2 rounded-lg border border-border bg-card px-6 py-4">
        <p className="text-xs font-mono text-muted-foreground">
          Code : DATABASE_UNAVAILABLE
        </p>
      </div>
    </div>
  );
}
