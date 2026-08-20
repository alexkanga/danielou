'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin?: boolean;
}

interface AppShellProps {
  children: ReactNode;
  user: SessionUser;
}

export function AppShell({ children, user }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-bg">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          user={user}
          onMenuToggle={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
