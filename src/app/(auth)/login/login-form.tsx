'use client';

import { useState, useActionState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [result, formAction, isPending] = useActionState(loginAction, null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Rediriger après succès
  if (result?.success) {
    const redirect = searchParams.get('redirect') || '/dashboard';
    router.push(redirect);
    router.refresh();
    return null;
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Erreur globale */}
      {result && !result.success && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}

      {/* Champ identifiant */}
      <div className="space-y-2">
        <Label htmlFor="login">Identifiant ou e-mail</Label>
        <Input
          id="login"
          name="login"
          type="text"
          autoComplete="email username"
          placeholder="admin@danielou.ci ou fantomas"
          required
        />
      </div>

      {/* Champ mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Bouton de connexion */}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  );
}