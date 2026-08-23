"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared';

type DbStatus = {
  database?: { state: string };
  ghost?: { account: string; authentication: string; authorization: string };
  authenticated: boolean;
};

export default function DbHealthPage() {
  const [status, setStatus] = useState<DbStatus | null>(null);

  useEffect(() => {
    fetch('/api/system/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Santé de la base"
        description="État de la connexion à la base de données."
      />
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">Base de données</p>
            <p className={"text-lg font-semibold " + (status?.database?.state === 'AVAILABLE' ? 'text-green-600' : 'text-red-600')}>
              {status?.database?.state ?? '...'}
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">Fantomas (compte)</p>
            <p className={"text-lg font-semibold " + (status?.ghost?.account === 'AVAILABLE' ? 'text-green-600' : 'text-red-600')}>
              {status?.ghost?.account ?? '...'}
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">Authentification</p>
            <p className={"text-lg font-semibold " + (status?.ghost?.authentication === 'AVAILABLE' ? 'text-green-600' : 'text-red-600')}>
              {status?.ghost?.authentication ?? '...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
