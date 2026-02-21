import { Card } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { generateSankeyLinks, DEFAULT_REVENUE_SOURCES, DEFAULT_EXPENDITURES } from '@/lib/mockData';

export function SankeyView() {
  const { revenueSources, expenditures } = useAppStore();
  const links = generateSankeyLinks(revenueSources, expenditures);
  const enabledRevenue = revenueSources.filter(r => r.enabled);
  const totalRevenue = enabledRevenue.reduce((s, r) => s + r.amount_eur_m, 0);
  const totalExpenditure = expenditures.reduce((s, e) => s + e.amount_eur_m, 0);

  // Simple horizontal bar-based flow visualization
  const maxAmount = Math.max(...enabledRevenue.map(r => r.amount_eur_m), ...expenditures.map(e => e.amount_eur_m));

  return (
    <Card className="p-4 h-full">
      <h3 className="text-sm font-semibold mb-3">Revenue → Expenditure Flows</h3>
      <div className="flex gap-6 min-h-[300px]">
        {/* Left: Revenue sources */}
        <div className="flex-1 space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Revenue (€{(totalRevenue / 1000).toFixed(1)}B)</p>
          {enabledRevenue.map(r => (
            <div key={r.id} className="flex items-center gap-2">
              <div className="w-20 text-[10px] text-right truncate">{r.label.replace(' Region Taxes', '').replace(' Taxes', '')}</div>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-accent/70 rounded transition-all"
                  style={{ width: `${(r.amount_eur_m / maxAmount) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono w-14 text-right">€{r.amount_eur_m}M</span>
            </div>
          ))}
        </div>

        {/* Right: Expenditure */}
        <div className="flex-1 space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Expenditure (€{(totalExpenditure / 1000).toFixed(1)}B)</p>
          {expenditures.slice(0, 8).map(e => (
            <div key={e.id} className="flex items-center gap-2">
              <div className="w-20 text-[10px] text-right truncate">{e.label.replace('& ', '')}</div>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded transition-all"
                  style={{ width: `${(e.amount_eur_m / maxAmount) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-mono w-14 text-right">€{e.amount_eur_m}M</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
