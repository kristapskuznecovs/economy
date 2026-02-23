import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { YearSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui/card';
import { api, type ConstructionOverviewResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

function formatMoney(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return 'n/a';
  return value.toFixed(decimals);
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'n/a';
  return `${value.toFixed(1)}%`;
}

function pctDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function ConstructionInvestmentCard() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<ConstructionOverviewResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (year?: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getConstructionOverview({ since_year: 2010, year });
        setPayload(response);
        setSelectedYear(response.selected_year);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('construction.failed');
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
  const previousPoint = useMemo(() => {
    if (!payload) return null;
    const currentIndex = payload.series.findIndex((item) => item.year === payload.selected_year);
    if (currentIndex <= 0) return null;
    return payload.series[currentIndex - 1];
  }, [payload]);

  const totalYoy = useMemo(
    () =>
      pctDelta(
        payload?.total_fixed_investment_eur_m ?? null,
        previousPoint?.total_fixed_investment_eur_m ?? null
      ),
    [payload, previousPoint]
  );
  const hasPrivateSplit = payload?.private_share_pct !== null && payload?.public_soe_proxy_share_pct !== null;
  const publicProxyAmountText = useMemo(
    () =>
      payload?.public_soe_proxy_investment_eur_m === null || payload?.public_soe_proxy_investment_eur_m === undefined
        ? 'n/a'
        : payload.public_soe_proxy_investment_eur_m.toFixed(1),
    [payload]
  );

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('construction.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('construction.subtitle')}</p>
        </div>
        {payload && (
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">
              {t('construction.selectedYear')}: {payload.selected_year}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('construction.period')}: {payload.since_year} - {payload.to_year}
            </p>
          </div>
        )}
      </div>

      {isLoading && !payload && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('construction.loading')}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {payload && (
        <>
          <div className="rounded border p-3 mb-3">
            <YearSelector
              label={t('construction.year')}
              years={payload.available_years}
              value={selectedYear ?? payload.selected_year}
              onChange={(year) => {
                setSelectedYear(year);
                void load(year);
              }}
              disabled={isLoading || payload.available_years.length <= 1}
            />
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 mb-3">
            <Metric
              label={t('construction.valueAdded')}
              value={`€${formatMoney(payload.construction_value_added_eur_m)}M`}
            />
            <Metric label={t('construction.shareGdp')} value={formatPercent(payload.construction_share_gdp_pct)} />
            <Metric
              label={t('construction.totalInvestment')}
              value={`€${formatMoney(payload.total_fixed_investment_eur_m)}M`}
            />
            <Metric
              label={t('construction.privateInvestment')}
              value={`€${formatMoney(payload.private_fixed_investment_eur_m)}M`}
            />
            <Metric
              label={t('construction.publicSoeProxyInvestment')}
              value={`€${formatMoney(payload.public_soe_proxy_investment_eur_m)}M`}
            />
            <Metric
              label={t('construction.privateShare')}
              value={`${formatPercent(payload.private_share_pct)}${
                payload.private_share_pct === null || totalYoy === null
                  ? ''
                  : ` | ${totalYoy >= 0 ? '+' : ''}${totalYoy.toFixed(1)}% YoY`
              }`}
            />
          </div>

          <div className="rounded border bg-muted/20 p-2.5 mb-3">
            <p className="text-[11px] text-muted-foreground">{t('construction.descriptionTitle')}</p>
            <p className="text-xs mt-1">
              {hasPrivateSplit
                ? t('construction.descriptionLine1', {
                    year: payload.selected_year,
                    privateShare: payload.private_share_pct === null ? 'n/a' : payload.private_share_pct.toFixed(1),
                    publicShare:
                      payload.public_soe_proxy_share_pct === null
                        ? 'n/a'
                        : payload.public_soe_proxy_share_pct.toFixed(1),
                  })
                : t('construction.descriptionLinePublicOnly', {
                    year: payload.selected_year,
                    publicAmount: publicProxyAmountText,
                  })}
            </p>
            <p className="text-xs mt-1">
              {t('construction.descriptionLine2', {
                valueAdded:
                  payload.construction_value_added_eur_m === null
                    ? 'n/a'
                    : payload.construction_value_added_eur_m.toFixed(1),
                gdpShare:
                  payload.construction_share_gdp_pct === null
                    ? 'n/a'
                    : payload.construction_share_gdp_pct.toFixed(1),
              })}
            </p>
            {payload.notes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {payload.notes.map((note, index) => (
                  <li key={`construction-note-${index}`} className="text-[11px] text-muted-foreground">
                    • {note}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="px-3 py-2 bg-muted/40 border-b">
              <p className="text-xs font-semibold">{t('construction.chartTitle')}</p>
              <p className="text-[11px] text-muted-foreground">{t('construction.chartSubtitle')}</p>
            </div>
            <div className="p-2">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(value) => `€${Number(value).toFixed(0)}M`}
                    tick={{ fontSize: 11 }}
                    width={70}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                    tick={{ fontSize: 11 }}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value: number | null, name: string) => {
                      if (value === null || value === undefined) return ['n/a', name];
                      if (name.includes('%')) return [`${Number(value).toFixed(1)}%`, name];
                      return [`€${Number(value).toFixed(1)}M`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="private_fixed_investment_eur_m"
                    fill="#4f7ec7"
                    name={t('construction.legendPrivate')}
                    stackId="inv"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="public_soe_proxy_investment_eur_m"
                    fill="#f08c3b"
                    name={t('construction.legendPublicSoe')}
                    stackId="inv"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="construction_share_gdp_pct"
                    stroke="#26a07a"
                    strokeWidth={2}
                    dot={false}
                    name={t('construction.legendConstructionShare')}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            {t('construction.source')}: {payload.source_world_bank_country} • {payload.source_indicators.join(', ')}
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
