import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { YearRangeSelector, YearSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui/card';
import { api, type EconomyStructureResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const GROUP_COLORS = ['#4f7ec7', '#26a07a', '#f08c3b', '#8b7aa8'];

function shortLabel(label: string): string {
  return label.length > 20 ? `${label.slice(0, 20)}...` : label;
}

function formatPct(value: number | null | undefined, naLabel: string): string {
  if (value === null || value === undefined) return naLabel;
  return `${value.toFixed(1)}%`;
}

function formatMoney(value: number | null | undefined, currency: string, suffix: string, naLabel: string): string {
  if (value === null || value === undefined) return naLabel;
  return `${currency}${value.toFixed(1)}${suffix}`;
}

export function EconomyStructureCard() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<EconomyStructureResponse | null>(null);
  const [snapshotByYear, setSnapshotByYear] = useState<Record<number, EconomyStructureResponse>>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2010]);
  const [mode, setMode] = useState<'year' | 'range'>('year');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const mergeYearSnapshot = (payload: EconomyStructureResponse) => {
    setSnapshotByYear(prev => ({ ...prev, [payload.selected_year]: payload }));
  };

  const fetchYearSnapshot = async (year: number): Promise<EconomyStructureResponse> => {
    const cached = snapshotByYear[year];
    if (cached) return cached;
    const payload = await api.getEconomyStructure({
      since_year: 2010,
      year,
    });
    mergeYearSnapshot(payload);
    return payload;
  };

  const averageNullable = (values: Array<number | null>): number | null => {
    const filtered = values.filter((value): value is number => value !== null);
    if (filtered.length === 0) return null;
    const avg = filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
    return Number(avg.toFixed(2));
  };

  const aggregateRange = (records: EconomyStructureResponse[]): EconomyStructureResponse => {
    const years = records
      .map(item => item.selected_year)
      .sort((a, b) => a - b);
    const exportAmountByGroup = new Map<string, number>();
    let totalExports = 0;
    let remittancesSum = 0;
    let hasRemittances = false;

    records.forEach((record) => {
      totalExports += record.total_exports_eur_m;
      record.export_groups.forEach((group) => {
        exportAmountByGroup.set(group.id, (exportAmountByGroup.get(group.id) ?? 0) + group.amount_eur_m);
      });
      if (record.remittances_usd_m !== null) {
        remittancesSum += record.remittances_usd_m;
        hasRemittances = true;
      }
    });

    const exportGroups = (records[0]?.export_groups ?? [])
      .map((group) => {
        const amount = Number((exportAmountByGroup.get(group.id) ?? 0).toFixed(2));
        const share = totalExports > 0 ? Number(((amount / totalExports) * 100).toFixed(2)) : 0;
        return {
          id: group.id,
          amount_eur_m: amount,
          share_pct: share,
        };
      });

    const manufacturingAmount =
      (exportAmountByGroup.get('manufacturing_other') ?? 0) +
      (exportAmountByGroup.get('lumber_wood') ?? 0);
    const manufacturingShare = totalExports > 0 ? Number(((manufacturingAmount / totalExports) * 100).toFixed(2)) : null;

    const first = records[0];
    return {
      since_year: years[0],
      to_year: years[years.length - 1],
      selected_year: years[years.length - 1],
      available_years: first.available_years,
      production_share_pct: averageNullable(records.map(item => item.production_share_pct)),
      services_share_pct: averageNullable(records.map(item => item.services_share_pct)),
      agriculture_share_pct: averageNullable(records.map(item => item.agriculture_share_pct)),
      industry_share_pct: averageNullable(records.map(item => item.industry_share_pct)),
      manufacturing_exports_share_pct: manufacturingShare,
      ict_services_exports_share_pct: averageNullable(records.map(item => item.ict_services_exports_share_pct)),
      remittances_usd_m: hasRemittances ? Number(remittancesSum.toFixed(2)) : null,
      remittances_share_gdp_pct: averageNullable(records.map(item => item.remittances_share_gdp_pct)),
      total_exports_eur_m: Number(totalExports.toFixed(2)),
      export_groups: exportGroups,
      source_trade_dataset_id: first.source_trade_dataset_id,
      source_trade_resource_id: first.source_trade_resource_id,
      source_world_bank_country: first.source_world_bank_country,
    };
  };

  const loadInitial = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await api.getEconomyStructure({
        since_year: 2010,
      });
      mergeYearSnapshot(payload);
      setAvailableYears(payload.available_years);
      setSelectedYear(payload.selected_year);
      if (payload.available_years.length > 0) {
        setYearRange([payload.available_years[0], payload.selected_year]);
      }
      setSnapshot(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('economyStructure.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInitial();
  }, []);

  const applyYear = async (year: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await fetchYearSnapshot(year);
      setSnapshot(payload);
      setSelectedYear(year);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('economyStructure.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const applyRange = async (fromYear: number, toYear: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const from = Math.min(fromYear, toYear);
      const to = Math.max(fromYear, toYear);
      const years = availableYears.filter((year) => year >= from && year <= to);
      if (years.length === 0) return;
      const records = await Promise.all(years.map((year) => fetchYearSnapshot(year)));
      setSnapshot(aggregateRange(records));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('economyStructure.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportGroups = useMemo(
    () =>
      (snapshot?.export_groups ?? []).map((item) => ({
        ...item,
        label: t(`economyStructure.group.${item.id}`),
        axis_label: shortLabel(t(`economyStructure.group.${item.id}`)),
      })),
    [snapshot, t]
  );

  const handleYearChange = (year: number) => {
    if (selectedYear === year) return;
    setMode('year');
    void applyYear(year);
  };

  const handleRangeChange = (fromYear: number, toYear: number) => {
    setYearRange([fromYear, toYear]);
    if (mode !== 'range') {
      setMode('range');
    }
    void applyRange(fromYear, toYear);
  };

  const productionPct = snapshot?.production_share_pct ?? null;
  const servicesPct = snapshot?.services_share_pct ?? null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('economyStructure.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('economyStructure.subtitle')}</p>
        </div>
        {snapshot && (
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">
              {t('economyStructure.totalExports')}: €{snapshot.total_exports_eur_m.toFixed(1)}M
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('economyStructure.period')}: {snapshot.since_year} - {snapshot.to_year}
            </p>
          </div>
        )}
      </div>

      {isLoading && !snapshot && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('economyStructure.loading')}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {snapshot && (
        <>
          <div className="rounded border p-3 mb-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium">{t('economyStructure.selectorMode')}</p>
              <div className="inline-flex rounded border bg-card p-0.5">
                <button
                  type="button"
                  className={`px-2 py-1 text-[11px] rounded ${mode === 'year' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                  onClick={() => {
                    setMode('year');
                    if (selectedYear !== null) void applyYear(selectedYear);
                  }}
                >
                  {t('period.modeYear')}
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 text-[11px] rounded ${mode === 'range' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                  onClick={() => {
                    setMode('range');
                    void applyRange(yearRange[0], yearRange[1]);
                  }}
                >
                  {t('period.modeRange')}
                </button>
              </div>
            </div>
            {mode === 'year' ? (
              <YearSelector
                label={t('economyStructure.year')}
                years={availableYears}
                value={selectedYear ?? snapshot.selected_year}
                onChange={handleYearChange}
                disabled={availableYears.length <= 1 || isLoading}
              />
            ) : (
              <>
                <YearRangeSelector
                  label={t('revenueHistory.range')}
                  fromLabel={t('period.from')}
                  toLabel={t('period.to')}
                  years={availableYears}
                  fromYear={yearRange[0]}
                  toYear={yearRange[1]}
                  onChange={handleRangeChange}
                  disabled={availableYears.length <= 1 || isLoading}
                />
                <p className="mt-2 text-[11px] text-muted-foreground">{t('economyStructure.rangeNote')}</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">
                    {viewMode === 'table' ? t('economyStructure.tableTitle') : t('economyStructure.chartTitle')}
                  </p>
                  {viewMode === 'chart' && (
                    <p className="text-[11px] text-muted-foreground">{t('economyStructure.chartSubtitle')}</p>
                  )}
                </div>
                <div className="inline-flex rounded border bg-card p-0.5">
                  <button
                    type="button"
                    className={`px-2 py-1 text-[11px] rounded ${viewMode === 'table' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                    onClick={() => setViewMode('table')}
                  >
                    {t('economyStructure.viewTable')}
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 text-[11px] rounded ${viewMode === 'chart' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}
                    onClick={() => setViewMode('chart')}
                  >
                    {t('economyStructure.viewChart')}
                  </button>
                </div>
              </div>

              {viewMode === 'table' ? (
                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left border-b bg-card sticky top-0">
                        <th className="px-3 py-2 font-medium">{t('economyStructure.groupCol')}</th>
                        <th className="px-3 py-2 font-medium text-right">{t('economyStructure.amountCol')}</th>
                        <th className="px-3 py-2 font-medium text-right">{t('economyStructure.shareCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportGroups.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{item.label}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.amount_eur_m.toFixed(1)}</td>
                          <td className="px-3 py-2 text-right font-mono">{item.share_pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-2">
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={exportGroups} margin={{ top: 8, right: 8, left: 8, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="axis_label"
                        interval={0}
                        angle={-22}
                        textAnchor="end"
                        height={65}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tickFormatter={value => `€${Number(value).toFixed(0)}M`}
                        tick={{ fontSize: 11 }}
                        width={70}
                      />
                      <Tooltip
                        formatter={(value: number) => [`€${Number(value).toFixed(1)}M`, t('economyStructure.amount')]}
                        labelFormatter={(_, payload) => {
                          if (!payload?.length) return '';
                          const row = payload[0]?.payload as { label?: string; share_pct?: number } | undefined;
                          if (!row) return '';
                          return `${row.label ?? ''} (${(row.share_pct ?? 0).toFixed(1)}%)`;
                        }}
                      />
                      <Bar dataKey="amount_eur_m" name={t('economyStructure.amount')}>
                        {exportGroups.map((item, index) => (
                          <Cell key={`eco-cell-${item.id}`} fill={GROUP_COLORS[index % GROUP_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <SplitMeter
                  label={t('economyStructure.servicesEconomy')}
                  valuePct={servicesPct}
                  colorClass="bg-[#4f7ec7]"
                  naLabel={t('history.na')}
                />
                <SplitMeter
                  label={t('economyStructure.productionEconomy')}
                  valuePct={productionPct}
                  colorClass="bg-[#26a07a]"
                  naLabel={t('history.na')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Metric
                  title={t('economyStructure.agriculture')}
                  value={formatPct(snapshot.agriculture_share_pct, t('history.na'))}
                />
                <Metric
                  title={t('economyStructure.industry')}
                  value={formatPct(snapshot.industry_share_pct, t('history.na'))}
                />
                <Metric
                  title={t('economyStructure.manufacturingExports')}
                  value={formatPct(snapshot.manufacturing_exports_share_pct, t('history.na'))}
                />
                <Metric
                  title={t('economyStructure.itExports')}
                  value={formatPct(snapshot.ict_services_exports_share_pct, t('history.na'))}
                />
                <Metric
                  title={t('economyStructure.remittancesValue')}
                  value={formatMoney(snapshot.remittances_usd_m, '$', 'M', t('history.na'))}
                />
                <Metric
                  title={t('economyStructure.remittancesShare')}
                  value={formatPct(snapshot.remittances_share_gdp_pct, t('history.na'))}
                />
              </div>

              <div className="rounded border bg-muted/20 p-2">
                <p className="text-[11px] font-medium mb-1">{t('economyStructure.shareMiniTitle')}</p>
                <p className="text-[11px] text-muted-foreground">{t('economyStructure.denominatorNote')}</p>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            {t('sankey.source')}: data.gov.lv ({snapshot.source_trade_dataset_id}), World Bank ({snapshot.source_world_bank_country})
          </p>
        </>
      )}
    </Card>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded border bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-sm font-mono font-semibold">{value}</p>
    </div>
  );
}

function SplitMeter({
  label,
  valuePct,
  colorClass,
  naLabel,
}: {
  label: string;
  valuePct: number | null;
  colorClass: string;
  naLabel: string;
}) {
  const pct = valuePct === null ? null : Math.max(0, Math.min(valuePct, 100));

  return (
    <div className="rounded border p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs font-mono text-muted-foreground">
          {pct === null ? naLabel : `${pct.toFixed(1)}%`}
        </p>
      </div>
      <div className="h-2 rounded bg-muted overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}
