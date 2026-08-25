'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, Bell, ChevronDown, ChevronRight, LogOut, Search, X } from 'lucide-react';
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

interface SearchResult {
  type: string;
  id: string;
  label: string;
  context: string;
  href: string;
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

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (r.ok) {
        const data = await r.json();
        setResults(Array.isArray(data) ? data : []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) return;
    timerRef.current = setTimeout(() => {
      void doSearch(query);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery('');
        setResults([]);
      }
    }
    if (searchOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [searchOpen]);

  function handleResultClick(href: string) {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    router.push(href);
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
        {/* Global search */}
        <div ref={containerRef} className="relative">
          {searchOpen ? (
            <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  if (v.length < 2) {
                    setResults([]);
                    setLoading(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setQuery('');
                    setResults([]);
                  }
                }}
                placeholder="Rechercher..."
                className="h-7 w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-56"
                aria-label="Recherche globale"
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); setResults([]); }}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {results.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-border bg-popover shadow-md sm:w-80">
                  <div className="max-h-72 overflow-y-auto p-1">
                    {results.map((r) => (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => handleResultClick(r.href)}
                        className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {r.type}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.label}</p>
                          {r.context && (
                            <p className="truncate text-xs text-muted-foreground">{r.context}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {loading && query.length >= 2 && results.length === 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-popover p-3 text-center text-sm text-muted-foreground">
                  Recherche en cours...
                </div>
              )}
              {!loading && query.length >= 2 && results.length === 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-popover p-3 text-center text-sm text-muted-foreground">
                  Aucun résultat.
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Recherche globale"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
        </div>

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
