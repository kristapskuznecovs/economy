import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import type { LatviaArea } from '@/lib/types';
import { LATVIA_AREAS } from '@/lib/types';

const REGION_COLORS: Record<string, string> = {
  increase: 'bg-positive/20 border-positive/40',
  decrease: 'bg-negative/20 border-negative/40',
  neutral: 'bg-muted border-border',
};

export function RegionalMap() {
  const { activeScenario } = useAppStore();
  const [selectedArea, setSelectedArea] = useState<LatviaArea | null>(null);

  // Default fiscal balance data when no scenario
  const defaultFiscal: Record<LatviaArea, { taxes_paid: number; budget_received: number }> = {
    Riga: { taxes_paid: 4200, budget_received: 3100 },
    Pieriga: { taxes_paid: 1800, budget_received: 1400 },
    Kurzeme: { taxes_paid: 1100, budget_received: 1250 },
    Zemgale: { taxes_paid: 850, budget_received: 980 },
    Vidzeme: { taxes_paid: 780, budget_received: 920 },
    Latgale: { taxes_paid: 620, budget_received: 1050 },
  };

  const year1Impacts = activeScenario
    ? activeScenario.regional_area_impacts.filter(r => r.year === 1)
    : null;

  return (
    <Card className="p-4 h-full">
      <h3 className="text-sm font-semibold mb-3">Latvia Regional Fiscal Balance</h3>

      {/* Map grid visualization */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {LATVIA_AREAS.map(area => {
          const impact = year1Impacts?.find(r => r.area === area);
          const fiscal = defaultFiscal[area];
          const balance = fiscal.budget_received - fiscal.taxes_paid;
          const dir = impact?.direction || (balance > 0 ? 'increase' : balance < 0 ? 'decrease' : 'neutral');
          const isSelected = selectedArea === area;

          return (
            <button
              key={area}
              onClick={() => setSelectedArea(isSelected ? null : area)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${REGION_COLORS[dir]} ${
                isSelected ? 'ring-2 ring-accent ring-offset-2' : ''
              }`}
            >
              <p className="text-xs font-semibold">{area}</p>
              <p className={`text-sm font-bold font-mono ${balance >= 0 ? 'text-positive' : 'text-negative'}`}>
                {balance >= 0 ? '+' : ''}€{balance}M
              </p>
              {impact && (
                <p className={`text-[10px] font-mono ${impact.gdp_real_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                  GDP {impact.gdp_real_pct > 0 ? '+' : ''}{impact.gdp_real_pct}%
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[10px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-positive/20 border border-positive/40" /> Net receiver</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-negative/20 border border-negative/40" /> Net contributor</span>
      </div>

      {/* Detail panel */}
      {selectedArea && (
        <Card className="p-3 bg-muted/50">
          <p className="text-xs font-semibold mb-2">{selectedArea} — Fiscal Detail</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Taxes Paid</p>
              <p className="font-mono font-semibold">€{defaultFiscal[selectedArea].taxes_paid}M</p>
            </div>
            <div>
              <p className="text-muted-foreground">Budget Received</p>
              <p className="font-mono font-semibold">€{defaultFiscal[selectedArea].budget_received}M</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fiscal Balance</p>
              {(() => {
                const b = defaultFiscal[selectedArea].budget_received - defaultFiscal[selectedArea].taxes_paid;
                return <p className={`font-mono font-semibold ${b >= 0 ? 'text-positive' : 'text-negative'}`}>{b >= 0 ? '+' : ''}€{b}M</p>;
              })()}
            </div>
            {year1Impacts && (() => {
              const imp = year1Impacts.find(r => r.area === selectedArea);
              if (!imp) return null;
              return (
                <div>
                  <p className="text-muted-foreground">Scenario Impact (Yr 1)</p>
                  <p className={`font-mono font-semibold ${imp.employment_jobs >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {imp.employment_jobs > 0 ? '+' : ''}{imp.employment_jobs} jobs
                  </p>
                </div>
              );
            })()}
          </div>
        </Card>
      )}
    </Card>
  );
}
