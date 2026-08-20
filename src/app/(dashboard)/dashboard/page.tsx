import { Users, School, FileText, AlertCircle } from 'lucide-react';

const statCards = [
  {
    label: 'Élèves inscrits',
    value: '—',
    icon: Users,
  },
  {
    label: 'Classes actives',
    value: '—',
    icon: School,
  },
  {
    label: 'Évaluations en cours',
    value: '—',
    icon: FileText,
  },
  {
    label: 'Notes restant à saisir',
    value: '—',
    icon: AlertCircle,
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Tableau de bord
        </h1>
      </div>

      {/* Stat cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-radius-lg border border-border bg-surface p-6 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
                <card.icon className="h-5 w-5 text-brand-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-primary">
                  {card.value}
                </p>
                <p className="text-sm text-text-secondary">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-radius-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
        <p className="text-text-secondary">
          Configurez votre année scolaire pour commencer.
        </p>
      </div>
    </div>
  );
}
