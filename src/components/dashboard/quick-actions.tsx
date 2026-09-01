'use client';

import Link from 'next/link';
import {
  UserPlus, BookOpen, FileText, PenTool, BarChart3, ClipboardCheck, ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { SchoolRole } from '@/lib/types/rbac';

type QuickAction = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: SchoolRole[];
};

const ACTIONS: QuickAction[] = [
  { label: 'Élève', href: '/dashboard/eleves', icon: UserPlus, allowedRoles: ['admin'] },
  { label: 'Inscription', href: '/dashboard/inscriptions', icon: UserPlus, allowedRoles: ['admin'] },
  { label: 'Évaluation', href: '/dashboard/evaluations', icon: FileText, allowedRoles: ['admin', 'direction', 'teacher'] },
  { label: 'Saisir notes', href: '/dashboard/saisie-notes', icon: PenTool, allowedRoles: ['admin', 'teacher'] },
  { label: 'Résultats par période', href: '/dashboard/resultats', icon: BarChart3, allowedRoles: ['admin', 'direction', 'teacher', 'reader'] },
  { label: 'Préparer bulletins', href: '/dashboard/bulletins/preparation', icon: ScrollText, allowedRoles: ['admin', 'teacher'] },
  { label: 'Valider bulletins', href: '/dashboard/bulletins/validation', icon: ClipboardCheck, allowedRoles: ['admin', 'direction'] },
  { label: 'Statistiques', href: '/dashboard/statistiques', icon: BarChart3, allowedRoles: ['admin', 'direction', 'reader'] },
];

export function QuickActions({ role }: { role: SchoolRole | null }) {
  const allowed = ACTIONS.filter(a => !role || a.allowedRoles.includes(role));

  if (allowed.length === 0) return null;

  return (
    <Card>
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold text-foreground">Actions rapides</h2>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-5">
        {allowed.map(action => (
          <Link key={action.href + action.label} href={action.href}>
            <Button variant="outline" size="sm" className="gap-2">
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}
