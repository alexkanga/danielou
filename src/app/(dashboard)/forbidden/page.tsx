import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <ShieldX className="h-16 w-16 text-danger" />
      <h1 className="text-4xl font-bold text-foreground">403</h1>
      <h2 className="text-xl font-semibold text-foreground">Accès interdit</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
        Contactez votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
