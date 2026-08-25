'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Download, Printer, Eye } from 'lucide-react';

interface RcRow {
  id: string;
  status: string;
  generalAverageOfficial: string | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  studentName: string;
  classroomName: string;
  periodName: string;
}

export default function ImpressionPage() {
  const [rows, setRows] = useState<RcRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchRows = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/bulletins?limit=100&status=published');
      if (!r.ok) throw new Error();
      const j = await r.json();
      setRows(j.data || []);
    } catch { toast.error('Erreur de chargement.'); } finally { setBusy(false); }
  }, []);

  useEffect(() => { const id = requestAnimationFrame(() => { void fetchRows(); }); return () => cancelAnimationFrame(id); }, [fetchRows]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const downloadPdf = async (id: string, name: string) => {
    try {
      const r = await fetch(`/api/bulletins/print/${id}`);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulletin-${name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur de génération PDF.'); }
  };

  const batchDownload = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    for (const id of selected) {
      const row = rows.find(r => r.id === id);
      if (row) await downloadPdf(id, row.studentName);
    }
    setBusy(false);
    toast.success(`${selected.size} bulletin(s) téléchargé(s).`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Impression / Exports" description="Téléchargez et imprimez les bulletins publiés." />

      {selected.size > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.size} sélectionné(s)</span>
          <Button size="sm" onClick={batchDownload} disabled={busy}>
            <Download className="mr-2 h-4 w-4" /> Télécharger la sélection
          </Button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left"><input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={() => { if (selected.size === rows.length) setSelected(new Set()); else setSelected(new Set(rows.map(r => r.id))); }} /></th>
                <th className="px-4 py-2 text-left font-medium">Élève</th>
                <th className="px-4 py-2 text-left font-medium">Classe</th>
                <th className="px-4 py-2 text-left font-medium">Période</th>
                <th className="px-4 py-2 text-left font-medium">Moy.</th>
                <th className="px-4 py-2 text-left font-medium">Rang</th>
                <th className="px-4 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-4 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                  <td className="px-4 py-2 font-medium">{r.studentName}</td>
                  <td className="px-4 py-2">{r.classroomName}</td>
                  <td className="px-4 py-2">{r.periodName}</td>
                  <td className="px-4 py-2">{r.generalAverageOfficial ?? '-'}/20</td>
                  <td className="px-4 py-2">{r.rank && r.totalStudentsRanked ? `${r.rank}/${r.totalStudentsRanked}` : '-'}</td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="sm" onClick={() => downloadPdf(r.id, r.studentName)}>
                      <Download className="mr-1 h-4 w-4" /> PDF
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Aucun bulletin publié.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
