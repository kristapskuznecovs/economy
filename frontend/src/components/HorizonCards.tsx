import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { HorizonImpact } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

function HorizonCard({ impact, label }: { impact: HorizonImpact; label: string }) {
  const { t } = useI18n();
  const gdpPos = impact.gdp_real_pct >= 0;
  const jobsPos = impact.employment_jobs >= 0;

  return (
    <Card className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs font-semibold">{label}</Badge>
        {gdpPos ? (
          <TrendingUp className="h-4 w-4 text-positive" />
        ) : (
          <TrendingDown className="h-4 w-4 text-negative" />
        )}
      </div>

      <div className="space-y-1.5">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('horizon.gdp')}</p>
          <p className={`text-lg font-bold font-mono ${gdpPos ? 'text-positive' : 'text-negative'}`}>
            {gdpPos ? '+' : ''}{impact.gdp_real_pct}%
          </p>
        </div>
        <div className="flex gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground">{t('horizon.jobs')}</p>
            <p className={`text-sm font-semibold font-mono ${jobsPos ? 'text-positive' : 'text-negative'}`}>
              {jobsPos ? '+' : ''}{impact.employment_jobs.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t('horizon.budget')}</p>
            <p className={`text-sm font-semibold font-mono ${impact.budget_balance_eur_m >= 0 ? 'text-positive' : 'text-negative'}`}>
              {impact.budget_balance_eur_m > 0 ? '+' : ''}€{impact.budget_balance_eur_m}M
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">{t('horizon.inflation')}</p>
            <p className="text-sm font-semibold font-mono">
              {impact.inflation_pp > 0 ? '+' : ''}{impact.inflation_pp}pp
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function HorizonCards() {
  const { activeScenario } = useAppStore();
  const { t } = useI18n();

  if (!activeScenario) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 5, 15].map(year => (
          <Card key={year} className="p-4 flex items-center justify-center h-32">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">{t('horizon.yearImpact', { year })}</p>
              <p className="text-[10px] text-muted-foreground">{t('horizon.askAbove')}</p>
            </div>
          </Card>
        ))}
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {activeScenario.horizon_impacts.map(h => (
        <HorizonCard
          key={h.year}
          impact={h}
          label={t('horizon.year', { year: h.year })}
        />
      ))}
    </section>
  );
}
