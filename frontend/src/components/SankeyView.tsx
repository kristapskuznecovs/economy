import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { api, type BudgetVoteDivision, type BudgetVoteDivisionsResponse } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

const DONUT_COLORS = [
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
];

function DonutMeter({ cents, color }: { cents: number; color: string }) {
  const { t } = useI18n();
  const safe = Math.max(0, Math.min(cents, 100));
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safe / 100);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        transform="rotate(-90 36 36)"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="36" y="34" textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
        {safe.toFixed(1)}
      </text>
      <text x="36" y="46" textAnchor="middle" className="fill-muted-foreground text-[9px] font-medium">
        {t('sankey.cents')}
      </text>
    </svg>
  );
}

function toFallbackDivisions(
  expenditures: ReturnType<typeof useAppStore.getState>['expenditures']
): BudgetVoteDivision[] {
  const total = expenditures.reduce((sum, item) => sum + item.amount_eur_m, 0);
  if (total <= 0) return [];
  return [...expenditures]
    .sort((a, b) => b.amount_eur_m - a.amount_eur_m)
    .map(item => {
      const share = (item.amount_eur_m / total) * 100;
      return {
        id: item.id,
        label: item.label,
        vote_division: item.vote_division || item.label,
        amount_eur_m: item.amount_eur_m,
        share_pct: Number(share.toFixed(2)),
        cents_from_euro: Number(share.toFixed(2)),
      };
    });
}

export function SankeyView() {
  const { t } = useI18n();
  const expenditures = useAppStore(state => state.expenditures);
  const setExpenditures = useAppStore(state => state.setExpenditures);

  const [remoteData, setRemoteData] = useState<BudgetVoteDivisionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const snapshot = await api.getBudgetVoteDivisions({ limit: 200 });
        if (cancelled) return;
        setRemoteData(snapshot);
        setExpenditures(
          snapshot.divisions.map(item => ({
            id: item.id,
            label: item.label,
            vote_division: item.vote_division,
            amount_eur_m: item.amount_eur_m,
            kind: 'category',
          }))
        );
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : t('sankey.loadFail');
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [setExpenditures]);

  const divisions = useMemo(() => {
    if (remoteData && remoteData.divisions.length > 0) {
      return remoteData.divisions;
    }
    return toFallbackDivisions(expenditures);
  }, [remoteData, expenditures]);
  const topDivisions = useMemo(() => divisions.slice(0, 10), [divisions]);
  const chartData = useMemo(
    () =>
      divisions.map(item => ({
        ...item,
        axis_label: item.label.length > 20 ? `${item.label.slice(0, 20)}...` : item.label,
      })),
    [divisions]
  );
  const chartWidth = useMemo(() => Math.max(920, chartData.length * 84), [chartData.length]);

  const totalExpenditure = useMemo(() => {
    if (remoteData) return remoteData.total_expenditure_eur_m;
    return expenditures.reduce((sum, item) => sum + item.amount_eur_m, 0);
  }, [remoteData, expenditures]);

  return (
    <Card className="p-4 h-full">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('sankey.title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('sankey.subtitle')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-muted-foreground">
            {t('sankey.total')}: €{totalExpenditure.toFixed(1)}M
          </p>
          {remoteData && (
            <p className="text-[11px] text-muted-foreground">
              {t('sankey.period')}: {remoteData.year}-{String(remoteData.month).padStart(2, '0')} ({remoteData.month_name})
            </p>
          )}
        </div>
      </div>

      {isLoading && !remoteData && (
        <LoadingIndicator message={t('sankey.loading')} className="mb-3" />
      )}

      {loadError && (
        <ErrorAlert
          message={`${t('sankey.loadFail')}\n${loadError}`}
          className="mb-3"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {topDivisions.map((item, index) => (
          <div key={item.id} className="rounded-lg border bg-muted/20 p-2.5 flex items-center gap-2.5">
            <DonutMeter cents={item.cents_from_euro} color={DONUT_COLORS[index % DONUT_COLORS.length]} />
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight break-words">{item.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                €{item.amount_eur_m.toFixed(1)}M ({item.share_pct.toFixed(1)}%)
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 border-b">
          <p className="text-xs font-semibold">{t('sankey.chartTitle')}</p>
          <p className="text-[11px] text-muted-foreground">
            {t('sankey.chartSubtitle', { count: divisions.length })}
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="px-2 py-2" style={{ width: chartWidth }}>
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
                  formatter={value => [`€${Number(value).toFixed(1)}M`, t('sankey.amountLabel')]}
                  labelFormatter={(_, payload) => {
                    if (!payload?.length) return '';
                    const row = payload[0]?.payload as BudgetVoteDivision | undefined;
                    if (!row) return '';
                    return `${row.label} (${row.share_pct.toFixed(1)}%)`;
                  }}
                />
                <Bar dataKey="amount_eur_m" name="Summa (€M)" fill="#1f9d8b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border overflow-hidden">
        <div className="px-3 py-2 bg-muted/40 border-b">
          <p className="text-xs font-semibold">{t('sankey.tableTitle')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b bg-card">
                <th className="px-3 py-2 font-medium">{t('sankey.colMinistry')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('sankey.colEuro')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('sankey.colAmount')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('sankey.colShare')}</th>
              </tr>
            </thead>
            <tbody>
              {divisions.map(item => (
                <tr key={`table-${item.id}`} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{item.label}</td>
                  <td className="px-3 py-2 text-right font-mono">{item.cents_from_euro.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono">{item.amount_eur_m.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono">{item.share_pct.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {remoteData && (
        <p className="mt-2 text-[11px] text-muted-foreground break-all">
          {t('sankey.source')}: data.gov.lv ({remoteData.source_dataset_id}) • resource {remoteData.source_resource_id}
        </p>
      )}
    </Card>
  );
}
