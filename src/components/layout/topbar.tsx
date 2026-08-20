'use client';

import { Menu, Bell, ChevronDown } from 'lucide-react';

interface TopbarProps {
  onMenuToggle: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="inline-flex items-center justify-center rounded-radius-md p-2 text-text-secondary transition-colors hover:bg-surface-bg hover:text-text-primary lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb placeholder */}
        <nav aria-label="Fil d'Ariane" className="hidden sm:block">
          <ol className="flex items-center gap-1.5 text-sm">
            <li>
              <span className="text-text-secondary">Accueil</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Année scolaire badge */}
        <span className="hidden rounded-full border border-brand-primary/20 bg-brand-primary/5 px-3 py-1 text-xs font-semibold text-brand-primary sm:inline-block">
          2026-2027
        </span>

        {/* Notification bell */}
        <button
          className="relative inline-flex items-center justify-center rounded-radius-md p-2 text-text-secondary transition-colors hover:bg-surface-bg hover:text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User menu */}
        <button className="inline-flex items-center gap-2 rounded-radius-md px-2 py-1.5 text-sm transition-colors hover:bg-surface-bg">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white">
            <span className="text-xs font-bold">AD</span>
          </div>
          <span className="hidden text-sm font-medium text-text-primary sm:inline">
            Administrateur
          </span>
          <ChevronDown className="hidden h-4 w-4 text-text-secondary sm:block" />
        </button>
      </div>
    </header>
  );
}
