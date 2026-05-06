"use client";

import { Button } from "@/components/ui/button";
import { IconDownload } from "@tabler/icons-react";

type Props = {
  kpi: {
    mrr: { current: number; previous: number };
    churned: { current: number; previous: number };
    activeOrgs: { current: number; previous: number };
    payingOrgs: { current: number; previous: number };
  };
  monthly: { month: string; thisYear: number; lastYear: number }[];
  byPlan: { items: { name: string; value: number }[]; totalOrgs: number };
};

export function ExportButton({ kpi, monthly, byPlan }: Props) {
  function handleExport() {
    const lines = [
      "REACHDEM ADMIN — Export métriques financières",
      `Généré le: ${new Date().toLocaleString("fr-FR")}`,
      "",
      "=== KPIs CE MOIS ===",
      `MRR: ${kpi.mrr.current} FCFA (précédent: ${kpi.mrr.previous} FCFA)`,
      `MRR perdu: ${kpi.churned.current} FCFA (précédent: ${kpi.churned.previous} FCFA)`,
      `Organisations actives: ${kpi.activeOrgs.current} (précédent: ${kpi.activeOrgs.previous})`,
      `Clients payants: ${kpi.payingOrgs.current} (précédent: ${kpi.payingOrgs.previous})`,
      "",
      "=== REVENUS MENSUELS (cette année vs précédente) ===",
      "Mois,Cette année (FCFA),Année précédente (FCFA)",
      ...monthly.map((r) => `${r.month},${r.thisYear},${r.lastYear}`),
      "",
      "=== DISTRIBUTION PAR PLAN ===",
      "Plan,Organisations",
      ...byPlan.items.map((i) => `${i.name},${i.value}`),
      `TOTAL,${byPlan.totalOrgs}`,
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reachdem-finances-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-1.5"
    >
      <IconDownload size={14} />
      Exporter
    </Button>
  );
}
