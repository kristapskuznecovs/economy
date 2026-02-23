import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { YearSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui/card';
import {
  api,
  type BudgetExpenditurePositionsResponse,
  type ExpenditurePositionsGroupBy,
} from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const COLORS = [
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
  '#6b7280',
];

const GROUP_OPTIONS: ExpenditurePositionsGroupBy[] = ['ekk', 'program', 'institution', 'ministry'];

function shortenLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 22)}...` : label;
}

export function ExpenditurePositionsCard() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<BudgetExpenditurePositionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ExpenditurePositionsGroupBy>('ekk');

  const load = useCallback(
    async (year?: number, groupBy?: ExpenditurePositionsGroupBy) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.getBudgetExpenditurePositions({
          year,
          group_by: groupBy ?? selectedGroup,
          limit: 15,
        });
        setPayload(response);
        setSelectedYear(response.year);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('expenditurePositions.failed');
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedGroup, t]
  );

  useEffect(() => {
    void load(undefined, selectedGroup);
  }, [load, selectedGroup]);

  const chartData = useMemo(
    () =>
      (payload?.positions ?? []).map((item) => ({
        ...item,
        axis_label: shortenLabel(item.label),
      })),
    [payload]
  );

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    void load(year, selectedGroup);
  };

  const handleGroupChange = (groupBy: ExpenditurePositionsGroupBy) => {
    setSelectedGroup(groupBy);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('expenditurePositions.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('expenditurePositions.subtitle')}</p>
        </div>
        {payload && (
          <div className="text-right">
            <p className="text-xs font-mono text-muted-foreground">
              {t('expenditurePositions.total')}: €{payload.total_expenditure_eur_m.toFixed(1)}M
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('expenditurePositions.period')}: {payload.year}-{String(payload.month).padStart(2, '0')} ({payload.month_name})
            </p>
          </div>
        )}
      </div>

      {isLoading && !payload && (
        <p className="text-xs text-muted-foreground mb-3">{t('expenditurePositions.loading')}</p>
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">{error}</p>
      )}

      {payload && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 mb-3">
            <YearSelector
              label={t('expenditurePositions.year')}
              years={payload.available_years}
              value={selectedYear ?? payload.year}
              onChange={handleYearChange}
              disabled={payload.available_years.length <= 1 || isLoading}
            />

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">{t('expenditurePositions.group')}</label>
              <select
                className="h-8 min-w-[180px] rounded border bg-background px-2 text-xs"
                value={selectedGroup}
                onChange={(event) => handleGroupChange(event.target.value as ExpenditurePositionsGroupBy)}
                disabled={isLoading}
              >
                {GROUP_OPTIONS.map((groupBy) => (
                  <option key={groupBy} value={groupBy}>
                    {t(`expenditurePositions.group.${groupBy}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-3">
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <p className="text-xs font-semibold">{t('expenditurePositions.chartTitle')}</p>
                <p className="text-[11px] text-muted-foreground">{payload.group_label}</p>
              </div>
              <div className="p-2">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="axis_label"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={90}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickFormatter={(value) => `€${Number(value).toFixed(0)}M`}
                      tick={{ fontSize: 11 }}
                      width={70}
                    />
                    <Tooltip
                      formatter={(value: number) => [`€${Number(value).toFixed(1)}M`, t('expenditurePositions.amount')]}
                      labelFormatter={(_, row) => {
                        const point = row?.[0]?.payload as { label?: string; share_pct?: number } | undefined;
                        if (!point) return '';
                        return `${point.label ?? ''} (${(point.share_pct ?? 0).toFixed(1)}%)`;
                      }}
                    />
                    <Bar dataKey="amount_eur_m" name={t('expenditurePositions.amount')}>
                      {chartData.map((row, index) => (
                        <Cell key={`${row.id}-bar`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <p className="text-xs font-semibold">{t('expenditurePositions.tableTitle')}</p>
              </div>
              <div className="overflow-auto max-h-[372px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left border-b bg-card">
                      <th className="px-3 py-2 font-medium">{t('expenditurePositions.colPosition')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('expenditurePositions.colAmount')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('expenditurePositions.colShare')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.positions.map((item) => (
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
          </div>

          <p className="mt-2 text-[11px] text-muted-foreground break-all">
            {t('expenditurePositions.source')}: data.gov.lv ({payload.source_dataset_id}) • resource {payload.source_resource_id}
          </p>
        </>
      )}
    </Card>
  );
}
