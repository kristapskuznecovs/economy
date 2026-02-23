import { useCallback, useEffect, useMemo, useState } from 'react';

import { YearSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui/card';
import { api, type BudgetProcurementKpiResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

function formatPct(value: number | null, naLabel: string): string {
  if (value === null || value === undefined) return naLabel;
  return `${value.toFixed(1)}%`;
}

export function ProcurementKpiCard() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<BudgetProcurementKpiResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (year?: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getBudgetProcurementKpi({ year, top_n: 10 });
        setPayload(response);
        setSelectedYear(response.year);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('procurement.failed');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const topPurchasers = useMemo(() => payload?.top_purchasers ?? [], [payload]);
  const topSuppliers = useMemo(() => payload?.top_suppliers ?? [], [payload]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('procurement.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('procurement.subtitle')}</p>
        </div>
        {payload && (
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">
              {t('procurement.procurementLike')}: €{payload.procurement_like_expenditure_eur_m.toFixed(1)}M ({payload.procurement_like_share_pct.toFixed(1)}%)
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('procurement.period')}: {payload.year}-{String(payload.month).padStart(2, '0')} ({payload.month_name})
            </p>
          </div>
        )}
      </div>

      {isLoading && !payload && (
        <p className="text-xs text-muted-foreground mb-3">{t('procurement.loading')}</p>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">{error}</p>
      )}

      {payload && (
        <>
          <div className="rounded border p-3 mb-3">
            <YearSelector
              label={t('procurement.year')}
              years={payload.available_years}
              value={selectedYear ?? payload.year}
              onChange={(year) => {
                setSelectedYear(year);
                void load(year);
              }}
              disabled={isLoading || payload.available_years.length <= 1}
            />
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 mb-3">
            <Metric label={t('procurement.metricTotal')} value={`€${payload.total_expenditure_eur_m.toFixed(1)}M`} />
            <Metric label={t('procurement.metricProxy')} value={`€${payload.procurement_like_expenditure_eur_m.toFixed(1)}M`} />
            <Metric label={t('procurement.metricSingleBid')} value={formatPct(payload.single_bid_share_pct, t('history.na'))} />
            <Metric label={t('procurement.metricAvgBidders')} value={payload.avg_bidder_count === null ? t('history.na') : payload.avg_bidder_count.toFixed(2)} />
            <Metric label={t('procurement.metricDelta')} value={formatPct(payload.initial_vs_actual_contract_delta_pct, t('history.na'))} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <TopEntitiesTable
              title={t('procurement.topPurchasers')}
              rows={topPurchasers}
              colEntity={t('procurement.entity')}
              colAmount={t('procurement.amount')}
              colShare={t('procurement.share')}
            />
            <TopEntitiesTable
              title={t('procurement.topSuppliers')}
              rows={topSuppliers}
              colEntity={t('procurement.entity')}
              colAmount={t('procurement.amount')}
              colShare={t('procurement.share')}
              emptyLabel={t('procurement.noSuppliers')}
            />
          </div>

          {payload.notes.length > 0 && (
            <div className="mt-3 rounded border bg-muted/20 p-3">
              <p className="text-xs font-semibold mb-1">{t('procurement.notes')}</p>
              <ul className="space-y-1">
                {payload.notes.map((note, index) => (
                  <li key={`note-${index}`} className="text-[11px] text-muted-foreground">
                    • {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            {t('procurement.source')}: data.gov.lv ({payload.source_dataset_id}) • resource {payload.source_resource_id}
          </p>
        </>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold">{value}</p>
    </div>
  );
}

function TopEntitiesTable({
  title,
  rows,
  colEntity,
  colAmount,
  colShare,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ id: string; label: string; amount_eur_m: number; share_pct: number }>;
  colEntity: string;
  colAmount: string;
  colShare: string;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b">
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <div className="overflow-auto max-h-[330px]">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left border-b bg-card">
              <th className="px-3 py-2 font-medium">{colEntity}</th>
              <th className="px-3 py-2 font-medium text-right">{colAmount}</th>
              <th className="px-3 py-2 font-medium text-right">{colShare}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={3}>
                  {emptyLabel ?? 'n/a'}
                </td>
              </tr>
            )}
            {rows.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">{item.label}</td>
                <td className="px-3 py-2 text-right font-mono">{item.amount_eur_m.toFixed(1)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.share_pct.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
