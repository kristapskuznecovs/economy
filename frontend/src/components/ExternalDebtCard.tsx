import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { YearSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui/card';
import { api, type ExternalDebtOverviewResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

function formatMoney(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return 'n/a';
  return value.toFixed(decimals);
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'n/a';
  return `${value.toFixed(1)}%`;
}

export function ExternalDebtCard() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<ExternalDebtOverviewResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (year?: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getDebtOverview({ since_year: 2010, year });
        setPayload(response);
        setSelectedYear(response.selected_year);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('debt.failed');
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

  const chartData = useMemo(() => payload?.series ?? [], [payload]);
  const basisKey = useMemo(() => {
    if (!payload) return 'debt.basis.unknown';
    if (payload.debt_basis === 'external_debt_world_bank') return 'debt.basis.external_debt_world_bank';
    if (payload.debt_basis === 'central_government_debt_proxy') return 'debt.basis.central_government_debt_proxy';
    if (payload.debt_basis === 'government_debt_pct_proxy') return 'debt.basis.government_debt_pct_proxy';
    if (payload.debt_basis === 'model_debt_ratio_proxy') return 'debt.basis.model_debt_ratio_proxy';
    return 'debt.basis.unknown';
  }, [payload]);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('debt.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('debt.subtitle')}</p>
        </div>
        {payload && (
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">
              {t('debt.selectedYear')}: {payload.selected_year}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('debt.period')}: {payload.since_year} - {payload.to_year}
            </p>
          </div>
        )}
      </div>

      {isLoading && !payload && (
        <p className="text-xs text-muted-foreground mb-3">{t('debt.loading')}</p>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">{error}</p>
      )}

      {payload && (
        <>
          <div className="rounded border p-3 mb-3">
            <YearSelector
              label={t('debt.year')}
              years={payload.available_years}
              value={selectedYear ?? payload.selected_year}
              onChange={(year) => {
                setSelectedYear(year);
                void load(year);
              }}
              disabled={isLoading || payload.available_years.length <= 1}
            />
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
            <Metric label={t('debt.externalDebtEur')} value={`€${formatMoney(payload.external_debt_eur_m)}M`} />
            <Metric label={t('debt.perCapitaEur')} value={`€${formatMoney(payload.external_debt_per_capita_eur, 0)}`} />
            <Metric label={t('debt.debtPctGdp')} value={formatPercent(payload.external_debt_pct_gdp)} />
            <Metric label={t('debt.population')} value={payload.population_m === null ? 'n/a' : `${payload.population_m.toFixed(2)}M`} />
            <Metric label={t('debt.serviceCostEur')} value={`€${formatMoney(payload.debt_service_eur_m)}M`} />
            <Metric label={t('debt.interestCostEur')} value={`€${formatMoney(payload.interest_payments_eur_m)}M`} />
            <Metric label={t('debt.serviceExports')} value={formatPercent(payload.debt_service_pct_exports)} />
            <Metric label={t('debt.externalDebtUsd')} value={`$${formatMoney(payload.external_debt_usd_m)}M`} />
          </div>

          <div className="rounded border bg-muted/20 p-2.5 mb-3">
            <p className="text-[11px] text-muted-foreground">
              {t('debt.basis')}: {t(basisKey)}
            </p>
            {payload.notes.length > 0 && (
              <ul className="mt-1 space-y-1">
                {payload.notes.map((note, index) => (
                  <li key={`debt-note-${index}`} className="text-[11px] text-muted-foreground">
                    • {note}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 border-b">
              <p className="text-xs font-semibold">{t('debt.chartTitle')}</p>
              <p className="text-[11px] text-muted-foreground">{t('debt.chartSubtitle')}</p>
            </div>
            <div className="p-2">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${Number(value).toFixed(0)}M`} width={65} />
                  <Tooltip
                    formatter={(value: number | null, name: string) => {
                      if (value === null || value === undefined) return ['n/a', name];
                      return [`${Number(value).toFixed(1)}M`, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="external_debt_usd_m"
                    stroke="#1f9d8b"
                    strokeWidth={2}
                    dot={false}
                    name={t('debt.lineDebt')}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="debt_service_usd_m"
                    stroke="#db5b8f"
                    strokeWidth={2}
                    dot={false}
                    name={t('debt.lineService')}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            {t('debt.source')}: World Bank ({payload.source_world_bank_country}) • {payload.source_indicators.join(', ')}
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
