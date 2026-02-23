import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

import { YearSelector } from '@/components/PeriodSelector';
import { Card } from '@/components/ui/card';
import { api, type ExternalDebtOverviewResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { SankeyLinkProps, SankeyNodeProps, SankeyTooltipProps } from '@/lib/types/recharts';

type FlowNode = {
  name: string;
  color: string;
};

type FlowLink = {
  source: number;
  target: number;
  value: number;
  color: string;
};

function formatMoney(value: number | null, decimals = 1): string {
  if (value === null || value === undefined) return 'n/a';
  return value.toFixed(decimals);
}

function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'n/a';
  return `${value.toFixed(1)}%`;
}

export function DebtServiceInterestFlowCard() {
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
        const message = err instanceof Error ? err.message : t('debtFlow.failed');
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

  const flowValues = useMemo(() => {
    const debtService = payload?.debt_service_eur_m ?? null;
    const interestRaw = payload?.interest_payments_eur_m ?? null;
    const debtStock = payload?.external_debt_eur_m ?? null;

    if (debtService === null || interestRaw === null || debtService <= 0) {
      return {
        debtService,
        interest: null as number | null,
        principalAndOther: null as number | null,
        debtServiceRatePct: null as number | null,
        interestSharePct: null as number | null,
        interestWasCapped: false,
      };
    }

    const interest = Math.min(Math.max(interestRaw, 0), debtService);
    const principalAndOther = Math.max(debtService - interest, 0);
    const debtServiceRatePct =
      debtStock !== null && debtStock > 0 ? Number(((debtService / debtStock) * 100).toFixed(2)) : null;
    const interestSharePct = Number(((interest / debtService) * 100).toFixed(2));
    const interestWasCapped = interestRaw > debtService;

    return {
      debtService,
      interest,
      principalAndOther,
      debtServiceRatePct,
      interestSharePct,
      interestWasCapped,
    };
  }, [payload]);

  const sankeyData = useMemo(() => {
    if (
      flowValues.debtService === null ||
      flowValues.interest === null ||
      flowValues.principalAndOther === null
    ) {
      return null;
    }

    const nodes: FlowNode[] = [
      { name: t('debtFlow.node.stock'), color: '#4f7ec7' },
      { name: t('debtFlow.node.service'), color: '#db5b8f' },
      { name: t('debtFlow.node.interest'), color: '#f08c3b' },
      { name: t('debtFlow.node.principalOther'), color: '#26a07a' },
    ];
    const links: FlowLink[] = [
      {
        source: 0,
        target: 1,
        value: Number(flowValues.debtService.toFixed(2)),
        color: '#8b7aa8',
      },
      {
        source: 1,
        target: 2,
        value: Number(flowValues.interest.toFixed(2)),
        color: '#f08c3b',
      },
      {
        source: 1,
        target: 3,
        value: Number(flowValues.principalAndOther.toFixed(2)),
        color: '#26a07a',
      },
    ];

    return { nodes, links };
  }, [flowValues, t]);

  const customNode = (props: SankeyNodeProps) => {
    const { x, y, width, height, payload: nodePayload, containerWidth } = props;
    const nodeColor = (nodePayload.color as string | undefined) ?? '#64748b';
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={nodeColor} fillOpacity={0.85} rx={2} />
        <text
          x={x < containerWidth / 2 ? x + width + 6 : x - 6}
          y={y + height / 2}
          dominantBaseline="middle"
          textAnchor={x < containerWidth / 2 ? 'start' : 'end'}
          fontSize={11}
          fill="#334155"
        >
          {nodePayload.name}
        </text>
      </g>
    );
  };

  const customLink = (props: SankeyLinkProps) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    const linkColor = sankeyData?.links[index]?.color ?? '#94a3b8';
    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={linkColor}
        strokeWidth={linkWidth}
        strokeOpacity={0.35}
      />
    );
  };

  const customTooltip = (props: SankeyTooltipProps) => {
    const { active, payload: tooltipPayload } = props;
    if (!active || !tooltipPayload?.length) {
      return null;
    }
    const item = tooltipPayload[0]?.payload;
    const value = typeof item?.value === 'number' ? item.value : null;
    const name = item?.payload?.name ?? item?.name ?? '';
    if (!name) {
      return null;
    }
    return (
      <div className="rounded border bg-white px-2 py-1 shadow">
        <p className="text-xs font-medium">{name}</p>
        {value !== null && <p className="text-[11px] text-muted-foreground">€{value.toFixed(1)}M</p>}
      </div>
    );
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('debtFlow.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('debtFlow.subtitle')}</p>
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('debtFlow.loading')}
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
            <Metric label={t('debtFlow.serviceEur')} value={`€${formatMoney(flowValues.debtService)}M`} />
            <Metric label={t('debtFlow.interestEur')} value={`€${formatMoney(flowValues.interest)}M`} />
            <Metric
              label={t('debtFlow.principalOtherEur')}
              value={`€${formatMoney(flowValues.principalAndOther)}M`}
            />
            <Metric label={t('debtFlow.serviceToDebtRate')} value={formatPercent(flowValues.debtServiceRatePct)} />
            <Metric label={t('debtFlow.interestShare')} value={formatPercent(flowValues.interestSharePct)} />
            <Metric label={t('debtFlow.stockEur')} value={`€${formatMoney(payload.external_debt_eur_m)}M`} />
          </div>

          {sankeyData ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 border-b">
                <p className="text-xs font-semibold">{t('debtFlow.chartTitle')}</p>
                <p className="text-[11px] text-muted-foreground">{t('debtFlow.chartSubtitle')}</p>
              </div>
              <div className="p-2">
                <ResponsiveContainer width="100%" height={300}>
                  <Sankey
                    data={sankeyData}
                    node={customNode as never}
                    link={customLink as never}
                    nodePadding={35}
                    nodeWidth={14}
                    margin={{ top: 16, right: 150, bottom: 16, left: 150 }}
                  >
                    <Tooltip content={customTooltip as never} />
                  </Sankey>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('debtFlow.noFlowData')}</p>
          )}

          {flowValues.interestWasCapped && (
            <p className="mt-2 text-[11px] text-muted-foreground">{t('debtFlow.cappedNote')}</p>
          )}

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
