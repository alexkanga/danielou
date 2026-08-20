'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsSubmitting(true);
    // Auth will be connected later
    console.log('Login submitted:', data);
    // Simulate a network request
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Email field */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-primary"
        >
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@danielou.ci"
          {...register('email')}
          className={cn(
            'block w-full rounded-radius-md border px-3 py-2.5 text-sm transition-colors',
            'placeholder:text-text-secondary/60',
            'focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20',
            errors.email
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-border'
          )}
        />
        {errors.email && (
          <p className="text-sm text-danger">{errors.email.message}</p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-text-primary"
        >
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register('password')}
            className={cn(
              'block w-full rounded-radius-md border px-3 py-2.5 pr-10 text-sm transition-colors',
              'placeholder:text-text-secondary/60',
              'focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20',
              errors.password
                ? 'border-danger focus:border-danger focus:ring-danger/20'
                : 'border-border'
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary transition-colors hover:text-text-primary"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-danger">{errors.password.message}</p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-radius-md bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors',
          'hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-70'
        )}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
