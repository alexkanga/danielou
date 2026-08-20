import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check will be added later — for now render the shell directly
  return <AppShell>{children}</AppShell>;
}
