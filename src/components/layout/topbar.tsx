'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Menu, Bell, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigation, useBreadcrumbs } from '@/components/providers/navigation-provider';

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(pathname);
  const {
    user,
    isGhost,
    isSuperAdmin,
    schoolRoleLabel,
  } = useNavigation();

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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

        {/* Breadcrumbs dynamiques */}
        <nav aria-label="Fil d'Ariane" className="hidden sm:block">
          <ol className="flex items-center gap-1.5 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                ) : (
                  <a
                    href={crumb.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </a>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notification bell (placeholder) */}
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
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-primary-foreground',
                isGhost ? 'bg-brand-accent' : 'bg-primary',
              )}>
                {isGhost ? (
                  <span className="text-xs font-bold">F</span>
                ) : (
                  <span className="text-xs font-bold">{initials}</span>
                )}
              </div>
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {isGhost ? 'Fantomas' : user.name}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {isGhost && (
                  <span className="inline-block rounded-full bg-brand-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-accent-dark">
                    Ghost
                  </span>
                )}
                {isSuperAdmin && (
                  <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    Super Administrateur
                  </span>
                )}
                {schoolRoleLabel && !isGhost && (
                  <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    {schoolRoleLabel}
                  </span>
                )}
              </div>
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
