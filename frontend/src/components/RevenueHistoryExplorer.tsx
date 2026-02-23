import { Fragment, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { YearRangeSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui/card';
import { api, type BudgetRevenueSource, type BudgetRevenueSourcesHistoryResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const BAR_COLORS = [
  '#1f9d8b',
  '#db5b8f',
  '#5f63d9',
  '#f08c3b',
  '#3ca2d4',
  '#849651',
  '#8f67c9',
  '#24a0a6',
  '#c44e4e',
  '#5d7ca4',
  '#a6794f',
];

function formatSigned(value: number | null | undefined, naLabel: string, suffix = ''): string {
  if (value === null || value === undefined) return naLabel;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${suffix}`;
}

function toAxisLabel(label: string): string {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

export function RevenueHistoryExplorer() {
  const { t } = useI18n();
  const [history, setHistory] = useState<BudgetRevenueSourcesHistoryResponse | null>(null);
  const [historyByYear, setHistoryByYear] = useState<Record<number, BudgetRevenueSourcesHistoryResponse>>({});
  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2010]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const latestPayload = await api.getBudgetRevenueSourcesHistory({
        since_year: 2010,
      });
      const years = latestPayload.available_years;
      const byYearEntries = await Promise.all(
        years.map(async (year) => {
          const payload = await api.getBudgetRevenueSourcesHistory({
            since_year: 2010,
            year,
          });
          return [year, payload] as const;
        })
      );
      const byYear: Record<number, BudgetRevenueSourcesHistoryResponse> = {};
      byYearEntries.forEach(([year, payload]) => {
        byYear[year] = payload;
      });

      setHistory(latestPayload);
      setHistoryByYear(byYear);
      if (years.length > 0) {
        setYearRange([years[0], years[years.length - 1]]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('revenueHistory.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const availableYears = history?.available_years ?? [];
  const safeRange = useMemo<[number, number]>(() => {
    if (availableYears.length === 0) return [0, 0];
    const minYear = availableYears[0];
    const maxYear = availableYears[availableYears.length - 1];
    const rawStart = Math.min(yearRange[0], yearRange[1]);
    const rawEnd = Math.max(yearRange[0], yearRange[1]);
    return [Math.max(minYear, Math.min(rawStart, maxYear)), Math.max(minYear, Math.min(rawEnd, maxYear))];
  }, [yearRange, availableYears]);
  const yearsInRange = useMemo(
    () => availableYears.filter((year) => year >= safeRange[0] && year <= safeRange[1]),
    [availableYears, safeRange]
  );
  const endYearInRange = yearsInRange[yearsInRange.length - 1] ?? null;

  const aggregatedCategories = useMemo<BudgetRevenueSource[]>(() => {
    if (!history || yearsInRange.length === 0) return [];
    const labels = history.categories.map(item => ({ id: item.id, label: item.label }));
    const totalsById: Record<string, number> = {};
    const detailTotalsByCategory: Record<string, Record<string, number>> = {};
    labels.forEach(({ id }) => {
      totalsById[id] = 0;
      detailTotalsByCategory[id] = {};
    });

    yearsInRange.forEach((year) => {
      const yearData = historyByYear[year];
      if (!yearData) return;
      yearData.categories.forEach((item) => {
        totalsById[item.id] = (totalsById[item.id] ?? 0) + item.amount_eur_m;
        item.details.forEach((detail) => {
          const categoryDetails = detailTotalsByCategory[item.id] ?? {};
          categoryDetails[detail.label] = (categoryDetails[detail.label] ?? 0) + detail.amount_eur_m;
          detailTotalsByCategory[item.id] = categoryDetails;
        });
      });
    });

    const rangeTotal = Object.values(totalsById).reduce((sum, value) => sum + value, 0);
    const endYearData = endYearInRange !== null ? historyByYear[endYearInRange] : null;
    const endYearYoyById: Record<string, { eur: number | null; pct: number | null }> = {};
    endYearData?.categories.forEach((item) => {
      endYearYoyById[item.id] = {
        eur: item.change_yoy_eur_m,
        pct: item.change_yoy_pct,
      };
    });

    return labels.map(({ id, label }) => {
      const amount = Number((totalsById[id] ?? 0).toFixed(2));
      const share = rangeTotal > 0 ? Number(((amount / rangeTotal) * 100).toFixed(2)) : 0;
      const details = Object.entries(detailTotalsByCategory[id] ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([detailLabel, detailAmount]) => ({
          label: detailLabel,
          amount_eur_m: Number(detailAmount.toFixed(2)),
          share_of_category_pct: amount > 0 ? Number(((detailAmount / amount) * 100).toFixed(2)) : 0,
        }));
      return {
        id,
        label,
        amount_eur_m: amount,
        share_pct: share,
        change_yoy_eur_m: endYearYoyById[id]?.eur ?? null,
        change_yoy_pct: endYearYoyById[id]?.pct ?? null,
        details,
      };
    });
  }, [history, historyByYear, yearsInRange, endYearInRange]);

  const rangeTotalRevenue = useMemo(
    () => aggregatedCategories.reduce((sum, item) => sum + item.amount_eur_m, 0),
    [aggregatedCategories]
  );
  const chartData = useMemo(
    () =>
      aggregatedCategories.map(item => ({
        ...item,
        axis_label: toAxisLabel(item.label),
      })),
    [aggregatedCategories]
  );
  const endYearMeta = endYearInRange !== null ? historyByYear[endYearInRange] : null;
  const rangeStartYear = yearsInRange[0] ?? null;
  const rangeEndYear = yearsInRange[yearsInRange.length - 1] ?? null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('revenueHistory.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('revenueHistory.subtitle')}</p>
        </div>
        {history && (
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">
              {t('revenueHistory.total')}: €{rangeTotalRevenue.toFixed(1)}M
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('revenueHistory.period')}: {history.since_year} - {history.to_year}
            </p>
          </div>
        )}
      </div>

      {isLoading && !history && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('revenueHistory.loading')}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {history && (
        <>
          <div className="rounded border p-3 mb-3">
            <YearRangeSelector
              label={t('revenueHistory.range')}
              fromLabel={t('period.from')}
              toLabel={t('period.to')}
              years={availableYears}
              fromYear={safeRange[0]}
              toYear={safeRange[1]}
              onChange={(fromYear, toYear) => setYearRange([fromYear, toYear])}
              disabled={availableYears.length <= 1 || isLoading}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t('revenueHistory.yoyBasis')}: {rangeEndYear ?? t('history.na')}
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <p className="text-xs font-semibold">{t('revenueHistory.chartTitle')}</p>
                <p className="text-[11px] text-muted-foreground">{t('revenueHistory.chartSubtitle')}</p>
              </div>
              <div className="p-2">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 110 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="axis_label"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={100}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={value => `€${Number(value).toFixed(0)}M`}
                      tick={{ fontSize: 11 }}
                      width={70}
                    />
                    <Tooltip
                      formatter={(value: number) => [`€${Number(value).toFixed(1)}M`, t('revenueHistory.amount')]}
                      labelFormatter={(_, payload) => {
                        if (!payload?.length) return '';
                        const row = payload[0]?.payload as BudgetRevenueSource | undefined;
                        if (!row) return '';
                        const yoy = formatSigned(row.change_yoy_pct, t('history.na'), '%');
                        return `${row.label} (${t('revenueHistory.yoy')}: ${yoy})`;
                      }}
                    />
                    <Bar dataKey="amount_eur_m" name={t('revenueHistory.amount')}>
                      {chartData.map((item, index) => (
                        <Cell key={`rev-cell-${item.id}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <p className="text-xs font-semibold">{t('revenueHistory.tableTitle')}</p>
                {endYearMeta && (
                  <p className="text-[11px] text-muted-foreground">
                    {t('revenueHistory.selectedYear')}: {endYearMeta.selected_year}
                  </p>
                )}
              </div>
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b bg-card sticky top-0">
                      <th className="px-3 py-2 font-medium">{t('revenueHistory.colSource')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('revenueHistory.colAmount')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('revenueHistory.colShare')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('revenueHistory.colYoy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedCategories.map(item => (
                      <Fragment key={item.id}>
                        <tr className="border-b">
                          <td className="px-3 py-2">{item.label}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.amount_eur_m.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.share_pct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatSigned(item.change_yoy_pct, t('history.na'), '%')}
                          </td>
                        </tr>
                        {item.id === 'other_rev' && item.details.length > 0 && (
                          <tr className="border-b last:border-b-0 bg-muted/20">
                            <td className="px-3 py-2" colSpan={4}>
                              <p className="text-[11px] font-medium mb-1">{t('revenueHistory.otherBreakdown')}</p>
                              <div className="space-y-0.5">
                                {item.details.map((detail) => (
                                  <p key={detail.label} className="text-[11px] text-muted-foreground">
                                    {detail.label}: €{detail.amount_eur_m.toFixed(1)}M ({detail.share_of_category_pct.toFixed(1)}%)
                                  </p>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            {t('sankey.source')}: data.gov.lv ({history.source_dataset_id})
          </p>
          {rangeStartYear !== null && rangeEndYear !== null && (
            <p className="text-[11px] text-muted-foreground">
              {t('revenueHistory.rangeApplied')}: {rangeStartYear}-{rangeEndYear}
            </p>
          )}
          {endYearMeta && (
            <p className="text-[11px] text-muted-foreground">
              {t('revenueHistory.yoyBasis')}: {endYearMeta.selected_year}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
