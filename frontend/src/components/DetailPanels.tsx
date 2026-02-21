import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

export function RevenuePanel() {
  const { t } = useI18n();
  const { revenueSources, toggleRevenueSource } = useAppStore();
  const totalEnabled = revenueSources.filter(r => r.enabled).reduce((s, r) => s + r.amount_eur_m, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{t('details.revenueTitle')}</h3>
        <span className="text-xs font-mono text-muted-foreground">{t('details.total')}: €{(totalEnabled / 1000).toFixed(1)}B</span>
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
  const { t } = useI18n();
  const { expenditures, updateExpenditure } = useAppStore();
  const ordered = [...expenditures].sort((a, b) => b.amount_eur_m - a.amount_eur_m);
  const totalExpenditure = ordered.reduce((s, e) => s + e.amount_eur_m, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{t('details.expenditureTitle')}</h3>
        <span className="text-xs font-mono text-muted-foreground">{t('details.total')}: €{(totalExpenditure / 1000).toFixed(1)}B</span>
      </div>
      <div className="space-y-2">
        {ordered.map(e => (
          <div key={e.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs truncate">{e.label}</p>
              {e.vote_division && (
                <p className="text-[10px] text-muted-foreground truncate">{e.vote_division}</p>
              )}
            </div>
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
