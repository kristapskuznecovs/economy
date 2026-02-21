import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';

export function RevenuePanel() {
  const { revenueSources, toggleRevenueSource } = useAppStore();
  const totalEnabled = revenueSources.filter(r => r.enabled).reduce((s, r) => s + r.amount_eur_m, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Revenue Sources</h3>
        <span className="text-xs font-mono text-muted-foreground">Total: €{(totalEnabled / 1000).toFixed(1)}B</span>
      </div>
      <div className="space-y-2">
        {revenueSources.map(r => (
          <div key={r.id} className="flex items-center gap-3">
            <Checkbox
              checked={r.enabled}
              onCheckedChange={(checked) => toggleRevenueSource(r.id, !!checked)}
            />
            <span className={`text-xs flex-1 ${!r.enabled ? 'text-muted-foreground line-through' : ''}`}>
              {r.label}
            </span>
            <span className="text-xs font-mono">€{r.amount_eur_m}M</span>
            <span className="text-[10px] text-muted-foreground w-10 text-right">
              {totalEnabled > 0 ? Math.round(r.amount_eur_m / totalEnabled * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ExpenditurePanel() {
  const { expenditures, updateExpenditure } = useAppStore();
  const totalExpenditure = expenditures.reduce((s, e) => s + e.amount_eur_m, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Expenditures (COFOG)</h3>
        <span className="text-xs font-mono text-muted-foreground">Total: €{(totalExpenditure / 1000).toFixed(1)}B</span>
      </div>
      <div className="space-y-2">
        {expenditures.map(e => (
          <div key={e.id} className="flex items-center gap-2">
            <span className="text-xs flex-1 truncate">{e.label}</span>
            <Input
              type="number"
              value={e.amount_eur_m}
              onChange={(ev) => updateExpenditure(e.id, Number(ev.target.value))}
              className="w-20 h-7 text-xs font-mono text-right"
              min={0}
            />
            <span className="text-[10px] text-muted-foreground w-10 text-right">
              {totalExpenditure > 0 ? Math.round(e.amount_eur_m / totalExpenditure * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
