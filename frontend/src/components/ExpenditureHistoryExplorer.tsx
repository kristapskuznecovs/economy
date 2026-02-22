import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/components/ui/card';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  api,
  type BudgetVoteDivisionHistoryPoint,
  type BudgetVoteDivisionHistoryResponse,
} from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { formatSignedNumber } from '@/lib/utils';

function formatSigned(value: number | null | undefined, naLabel: string, suffix = ''): string {
  if (value === null || value === undefined) return naLabel;
  return formatSignedNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + suffix;
}

export function ExpenditureHistoryExplorer() {
  const { t } = useI18n();
  const [history, setHistory] = useState<BudgetVoteDivisionHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [singleYearIndex, setSingleYearIndex] = useState<number>(0);
  const [yearsShown, setYearsShown] = useState<number>(1);

  const loadHistory = async (groupId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await api.getBudgetVoteDivisionHistory({
        since_year: 2010,
        group: groupId,
        top_groups: 15,
      });
      setHistory(payload);
      setSelectedGroupId(payload.selected_group_id);
      if (payload.series.length > 0) {
        setSingleYearIndex(payload.series.length - 1);
        setYearsShown(payload.series.length);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('history.failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const series = history?.series ?? [];
  const selectedPoint = series[singleYearIndex] ?? null;

  const displayedSeries = useMemo(() => {
    if (series.length === 0) return [];
    return series.slice(Math.max(0, series.length - yearsShown));
  }, [series, yearsShown]);

  const maxDisplayedAmount = useMemo(() => {
    if (displayedSeries.length === 0) return 1;
    return Math.max(...displayedSeries.map(point => point.amount_eur_m), 1);
  }, [displayedSeries]);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    void loadHistory(groupId);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('history.title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('history.subtitle')}
          </p>
        </div>
        {history && (
          <p className="text-xs text-muted-foreground">
            {t('history.period')}: {history.since_year} - {history.to_year}
          </p>
        )}
      </div>

      {error && (
        <ErrorAlert message={error} className="mb-3" />
      )}

      {isLoading && !history && (
        <LoadingIndicator message={t('history.loading')} className="mb-3" />
      )}

      {history && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <label className="text-xs font-medium">{t('history.group')}:</label>
            <select
              className="h-8 min-w-[260px] rounded border bg-background px-2 text-xs"
              value={selectedGroupId}
              onChange={event => handleGroupChange(event.target.value)}
              disabled={isLoading}
            >
              {history.groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>

          <Tabs defaultValue="single" className="space-y-3">
            <TabsList className="h-8">
              <TabsTrigger value="single" className="text-xs">
                {t('history.tabSingle')}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                {t('history.tabAll')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-3 mt-0">
              <div className="rounded border p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">{t('history.selectedYear')}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {selectedPoint ? `${selectedPoint.year}` : t('history.na')}
                  </p>
                </div>
                <Slider
                  value={[singleYearIndex]}
                  min={0}
                  max={Math.max(0, series.length - 1)}
                  step={1}
                  onValueChange={(value) => setSingleYearIndex(value[0] ?? 0)}
                  disabled={series.length <= 1}
                />
                {selectedPoint && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    <MetricCard label={t('history.metricAmount')} value={selectedPoint.amount_eur_m.toFixed(1)} />
                    <MetricCard
                      label={t('history.metricBaseEur')}
                      value={formatSigned(selectedPoint.change_from_base_eur_m, t('history.na'))}
                    />
                    <MetricCard
                      label={t('history.metricBasePct')}
                      value={formatSigned(selectedPoint.change_from_base_pct, t('history.na'), '%')}
                    />
                    <MetricCard
                      label={t('history.metricYoyPct')}
                      value={formatSigned(selectedPoint.change_yoy_pct, t('history.na'), '%')}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-3 mt-0">
              <div className="rounded border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">{t('history.yearsShown')}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {yearsShown} / {series.length}
                  </p>
                </div>
                <Slider
                  value={[yearsShown]}
                  min={1}
                  max={Math.max(1, series.length)}
                  step={1}
                  onValueChange={(value) => setYearsShown(value[0] ?? 1)}
                />
                <div className="space-y-1.5">
                  {displayedSeries.map((point) => (
                    <YearRow
                      key={point.year}
                      point={point}
                      maxAmount={maxDisplayedAmount}
                      naLabel={t('history.na')}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold">{value}</p>
    </div>
  );
}

function YearRow({
  point,
  maxAmount,
  naLabel,
}: {
  point: BudgetVoteDivisionHistoryPoint;
  maxAmount: number;
  naLabel: string;
}) {
  const widthPct = Math.max(1, Math.round((point.amount_eur_m / maxAmount) * 100));
  return (
    <div className="grid grid-cols-[52px_1fr_90px_80px] items-center gap-2">
      <p className="text-xs font-medium">{point.year}</p>
      <div className="h-4 rounded bg-muted overflow-hidden">
        <div className="h-full bg-primary/70" style={{ width: `${widthPct}%` }} />
      </div>
      <p className="text-xs font-mono text-right">€{point.amount_eur_m.toFixed(1)}M</p>
      <p className="text-xs font-mono text-right">{formatSigned(point.change_yoy_pct, naLabel, '%')}</p>
    </div>
  );
}
