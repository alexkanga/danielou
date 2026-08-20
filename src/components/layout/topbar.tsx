'use client';

import { useRouter } from 'next/navigation';
import { Menu, Bell, ChevronDown, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin?: boolean;
}

interface TopbarProps {
  onMenuToggle: () => void;
  user: SessionUser;
}

export function Topbar({ onMenuToggle, user }: TopbarProps) {
  const router = useRouter();

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel: Record<string, string> = {
    admin: 'Administrateur',
    direction: 'Direction',
    teacher: 'Enseignant',
    reader: 'Lecteur',
  };

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb placeholder */}
        <nav aria-label="Fil d'Ariane" className="hidden sm:block">
          <ol className="flex items-center gap-1.5 text-sm">
            <li>
              <span className="text-muted-foreground">Accueil</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Année scolaire badge */}
        <span className="hidden rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary sm:inline-block">
          2026-2027
        </span>

        {/* Notification bell */}
        <button
          className="relative inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-xs font-bold">{initials}</span>
              </div>
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {user.isSuperAdmin ? user.name : (roleLabel[user.role] ?? user.name)}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              {user.isSuperAdmin && (
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  Super Admin
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
