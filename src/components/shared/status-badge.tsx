import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusConfig = {
  label: string;
  className: string;
};

const statusMap: Record<string, StatusConfig> = {
  // Academic year
  preparation: { label: 'Préparation', className: 'bg-info-light text-info' },
  active: { label: 'Active', className: 'bg-success-light text-success' },
  closed: { label: 'Clôturée', className: 'bg-muted text-muted-foreground' },
  // Period
  draft: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  open: { label: 'Ouverte', className: 'bg-success-light text-success' },
  // Enrollment
  transferred: { label: 'Transféré', className: 'bg-warning-light text-warning' },
  withdrawn: { label: 'Retiré', className: 'bg-danger-light text-danger' },
  // Grade
  graded: { label: 'Noté', className: 'bg-success-light text-success' },
  absent_excused: { label: 'Absent justifié', className: 'bg-warning-light text-warning' },
  absent_unexcused: { label: 'Absent injustifié', className: 'bg-danger-light text-danger' },
  exempt: { label: 'Exempté', className: 'bg-info-light text-info' },
  not_evaluated: { label: 'Non évalué', className: 'bg-muted text-muted-foreground' },
  pending: { label: 'En attente', className: 'bg-warning-light text-warning' },
  // Report card
  ready: { label: 'Prêt', className: 'bg-info-light text-info' },
  validated: { label: 'Validé', className: 'bg-success-light text-success' },
  published: { label: 'Publié', className: 'bg-success-light text-success' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusMap[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('border-0 font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}
