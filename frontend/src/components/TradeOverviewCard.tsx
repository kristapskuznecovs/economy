import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { api, type TradeOverviewResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

function shortLabel(label: string): string {
  return label.length > 16 ? `${label.slice(0, 16)}...` : label;
}

export function TradeOverviewCard() {
  const { t, locale } = useI18n();
  const [overview, setOverview] = useState<TradeOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async (year?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await api.getTradeOverview({
        since_year: 2010,
        year,
        top_partners: 15,
      });
      setOverview(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('trade.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const availableYears = overview?.available_years ?? [];
  const selectedYearIndex = useMemo(() => {
    if (!overview || availableYears.length === 0) return 0;
    const index = availableYears.indexOf(overview.selected_year);
    return index >= 0 ? index : availableYears.length - 1;
  }, [overview, availableYears]);

  const chartData = useMemo(
    () =>
      (overview?.partners ?? []).slice(0, 12).map(item => {
        const country = locale === 'lv' ? item.country_name_lv : item.country_name_en;
        return {
          ...item,
          country_label: shortLabel(country || item.country_code),
          country_full: country || item.country_code,
        };
      }),
    [overview, locale]
  );

  const handleYearChange = (index: number) => {
    if (!overview) return;
    const year = overview.available_years[index];
    if (!year || year === overview.selected_year) return;
    void loadOverview(year);
  };

  const balance = overview?.trade_balance_eur_m ?? 0;
  const isDeficit = balance < 0;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('trade.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('trade.subtitle')}</p>
        </div>
        {overview && (
          <p className="text-xs text-muted-foreground">
            {t('trade.period')}: {overview.since_year} - {overview.to_year}
          </p>
        )}
      </div>

      {isLoading && !overview && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('trade.loading')}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {overview && (
        <>
          <div className="rounded border p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium">{t('trade.year')}</p>
              <p className="text-xs font-mono text-muted-foreground">{overview.selected_year}</p>
            </div>
            <Slider
              value={[selectedYearIndex]}
              min={0}
              max={Math.max(0, availableYears.length - 1)}
              step={1}
              onValueChange={(value) => handleYearChange(value[0] ?? 0)}
              disabled={availableYears.length <= 1 || isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <Metric title={t('trade.exports')} value={`€${overview.total_exports_eur_m.toFixed(1)}M`} />
            <Metric title={t('trade.imports')} value={`€${overview.total_imports_eur_m.toFixed(1)}M`} />
            <Metric
              title={isDeficit ? t('trade.deficit') : t('trade.surplus')}
              value={`${balance > 0 ? '+' : ''}€${balance.toFixed(1)}M`}
              valueClass={isDeficit ? 'text-negative' : 'text-positive'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <p className="text-xs font-semibold">{t('trade.chartTitle')}</p>
                <p className="text-[11px] text-muted-foreground">{t('trade.chartSubtitle')}</p>
              </div>
              <div className="p-2">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={value => `€${Number(value).toFixed(0)}M`} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="country_label"
                      width={110}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [`€${Number(value).toFixed(1)}M`, t('trade.balance')]}
                      labelFormatter={(_, payload) => {
                        if (!payload?.length) return '';
                        const row = payload[0]?.payload as { country_full?: string; country_code?: string } | undefined;
                        return row?.country_full || row?.country_code || '';
                      }}
                    />
                    <Bar dataKey="balance_eur_m">
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.country_code}
                          fill={entry.balance_eur_m >= 0 ? '#1f9d8b' : '#c44e4e'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <p className="text-xs font-semibold">{t('trade.tableTitle')}</p>
              </div>
              <div className="max-h-[340px] overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b bg-card sticky top-0">
                      <th className="px-3 py-2 font-medium">{t('trade.country')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('trade.exportsShort')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('trade.importsShort')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('trade.balanceShort')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.partners.map((item) => {
                      const country = locale === 'lv' ? item.country_name_lv : item.country_name_en;
                      return (
                        <tr key={item.country_code} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{country || item.country_code}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.exports_eur_m.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.imports_eur_m.toFixed(1)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${item.balance_eur_m >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {item.balance_eur_m > 0 ? '+' : ''}{item.balance_eur_m.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            {t('sankey.source')}: data.gov.lv ({overview.source_dataset_id})
          </p>
        </>
      )}
    </Card>
  );
}

function Metric({
  title,
  value,
  valueClass,
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded border bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className={`text-sm font-mono font-semibold ${valueClass ?? ''}`}>{value}</p>
    </div>
  );
}
