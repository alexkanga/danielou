import Image from 'next/image';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-radius-lg border border-border bg-surface p-8 shadow-sm">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/branding/danielou-abidjan-logo.png"
              alt="Daniélou Abidjan"
              width={64}
              height={64}
              className="max-h-16 w-auto object-contain"
              priority
            />
          </div>

          {/* Title */}
          <div className="mb-8 text-center">
            <h1 className="text-xl font-bold text-text-primary">
              Daniélou Abidjan
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Gestion scolaire
            </p>
          </div>

          {/* Login form */}
          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-text-secondary">
          © 2026 Daniélou Abidjan. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
