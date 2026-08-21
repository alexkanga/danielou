'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { NavigationProvider } from '@/components/providers/navigation-provider';
import type { SessionUserV2, SchoolMembership, SchoolRole } from '@/lib/types/rbac';

interface AppShellProps {
  children: ReactNode;
  user: SessionUserV2;
  schoolMemberships?: SchoolMembership[];
  activeSchoolRole?: SchoolRole | null;
  activeSchoolId?: string | null;
}

export function AppShell({
  children,
  user,
  schoolMemberships = [],
  activeSchoolRole = null,
  activeSchoolId = null,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <NavigationProvider
      user={user}
      schoolMemberships={schoolMemberships}
      activeSchoolRole={activeSchoolRole}
      activeSchoolId={activeSchoolId}
    >
      <div className="flex h-screen overflow-hidden bg-surface-bg">
        {/* Sidebar — RBAC filtered via NavigationProvider context */}
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar onMenuToggle={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}
