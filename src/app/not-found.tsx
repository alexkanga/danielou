import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-lg text-muted-foreground">Page introuvable</p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}