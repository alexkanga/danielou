"use client";

import { PageHeader } from '@/components/shared';

export default function RecoveryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recuperation"
        description="Outils de recuperation systeme (Fantomas)."
      />
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Etat du systeme</h3>
        <p className="text-sm text-muted-foreground">
          Cette page est reservee aux operations de recuperation.
          Toutes les actions sont journalisees dans le journal d&apos;audit.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Fantomas</p>
            <p className="text-xs text-muted-foreground">Compte systeme toujours disponible</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Journal d&apos;audit</p>
            <p className="text-xs text-muted-foreground">Consultez le journal pour toute activite</p>
          </div>
        </div>
      </div>
    </div>
  );
}
