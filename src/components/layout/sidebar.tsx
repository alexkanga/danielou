'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  School,
  Users,
  BookOpen,
  Puzzle,
  ClipboardList,
  Calculator,
  FileText,
  PenTool,
  BarChart3,
  ScrollText,
  CheckCircle,
  Send,
  History,
  TrendingUp,
  UserCog,
  Shield,
  Settings,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Database,
  Clock,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/components/providers/navigation-provider';

// Map nom d'icône → composant Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  School,
  Users,
  BookOpen,
  Puzzle,
  ClipboardList,
  Calculator,
  FileText,
  PenTool,
  BarChart3,
  ScrollText,
  CheckCircle,
  Send,
  History,
  TrendingUp,
  UserCog,
  Shield,
  Settings,
  FileSearch,
  Database,
  Clock,
  Award,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? FileText;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { navSections, user, schoolRoleLabel, platformRoleLabel, isGhost } = useNavigation();

  // Initiales pour l'avatar
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Label d'affichage dans la section utilisateur
  const displayLabel = isGhost
    ? 'Fantomas'
    : schoolRoleLabel ?? platformRoleLabel;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-4">
        <Link href="/" className="flex items-center gap-3" onClick={onMobileClose}>
          <Image
            src="/branding/danielou-abidjan-logo.png"
            alt="Daniélou Abidjan"
            width={36}
            height={36}
            className="shrink-0 object-contain"
          />
          {!collapsed && (
            <span className="truncate text-sm font-bold text-sidebar-text">
              Daniélou Abidjan
            </span>
          )}
        </Link>
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute top-5 right-0 translate-x-1/2 z-10 h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-text-secondary shadow-sm transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
        aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Navigation — filtrée par RBAC */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-4' : ''}>
            {section.title && !collapsed && (
              <h3 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-text/60">
                {section.title}
              </h3>
            )}
            {section.title && collapsed && sectionIndex > 0 && (
              <div className="mx-auto my-2 h-px w-6 bg-sidebar-text/20" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = getIcon(item.icon);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        'flex items-center gap-3 rounded-radius-md px-3 py-2 text-sm transition-colors',
                        'text-sidebar-text hover:bg-sidebar-hover',
                        isActive && 'bg-sidebar-active font-semibold',
                        collapsed && 'justify-center px-0'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom user section — dynamique selon le rôle */}
      <div className="shrink-0 border-t border-white/10 px-3 py-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sidebar-text',
            isGhost ? 'bg-brand-accent' : 'bg-sidebar-active'
          )}>
            {isGhost ? (
              <Database className="h-4 w-4" />
            ) : (
              <span className="text-xs font-bold">{initials}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="truncate text-sm text-sidebar-text">{user.name}</span>
                <span className="truncate text-[11px] text-sidebar-text/60">
                  {displayLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex relative flex-col bg-sidebar-bg text-sidebar-text transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-bg text-sidebar-text shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
