import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { api, type BudgetVoteDivisionsResponse } from '@/lib/api';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';
import { useI18n } from '@/lib/i18n';

const REVENUE_COLORS: Record<string, string> = {
  iin: '#10b981',
  pvn: '#3b82f6',
  akcizes: '#f59e0b',
  uzn_ien: '#8b5cf6',
  soc_apdr: '#ec4899',
  nekust_ipas: '#14b8a6',
  customs: '#6366f1',
  dab_resursi: '#84cc16',
  eu_funds: '#06b6d4',
  borrowing: '#f97316',
  other_rev: '#64748b',
};

export function InteractiveSankeyFlow() {
  const { t } = useI18n();
  const revenueSources = useAppStore(state => state.revenueSources);
  const expenditures = useAppStore(state => state.expenditures);
  const setExpenditures = useAppStore(state => state.setExpenditures);

  const [remoteData, setRemoteData] = useState<BudgetVoteDivisionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load budget data from API
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
        const message = error instanceof Error ? error.message : t('interactive.loadFail');
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

  // Prepare Sankey data in Recharts format
  const sankeyData = useMemo(() => {
    const enabledRevenues = revenueSources.filter(r => r.enabled);
    const totalExpenditure = expenditures.reduce((sum, e) => sum + e.amount_eur_m, 0);

    // Create nodes
    const nodes = [
      ...enabledRevenues.map(r => ({ name: r.label })),
      ...expenditures.map(e => ({ name: e.label })),
    ];

    // Create links
    const links: Array<{ source: number; target: number; value: number }> = [];
    enabledRevenues.forEach((rev, revIndex) => {
      expenditures.forEach((exp, expIndex) => {
        const expShare = exp.amount_eur_m / totalExpenditure;
        const value = rev.amount_eur_m * expShare;
        if (value > 0) {
          links.push({
            source: revIndex,
            target: enabledRevenues.length + expIndex,
            value: Math.round(value * 10) / 10,
          });
        }
      });
    });

    return { nodes, links };
  }, [revenueSources, expenditures]);

  const totalRevenue = useMemo(
    () => revenueSources.filter(r => r.enabled).reduce((sum, r) => sum + r.amount_eur_m, 0),
    [revenueSources]
  );

  const totalExpenditure = useMemo(
    () => expenditures.reduce((sum, e) => sum + e.amount_eur_m, 0),
    [expenditures]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomNode = (props: any) => {
    const { x, y, width, height, index, payload, containerWidth } = props;
    const isRevenue = index < revenueSources.filter(r => r.enabled).length;
    const fillColor = isRevenue
      ? REVENUE_COLORS[revenueSources.filter(r => r.enabled)[index]?.id] || '#94a3b8'
      : '#1e293b';

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fillColor}
          fillOpacity={0.8}
          stroke="#fff"
          strokeWidth={2}
        />
        <text
          x={x < containerWidth / 2 ? x + width + 4 : x - 4}
          y={y + height / 2}
          textAnchor={x < containerWidth / 2 ? 'start' : 'end'}
          fill="#334155"
          fontSize="9"
          fontWeight="500"
        >
          {payload.name.length > 25 ? payload.name.slice(0, 22) + '...' : payload.name}
        </text>
      </g>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomLink = (props: any) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index } = props;
    const enabledRevenues = revenueSources.filter(r => r.enabled);
    const sourceIndex = sankeyData.links[index]?.source || 0;
    const revenue = enabledRevenues[sourceIndex];
    const linkColor = revenue ? REVENUE_COLORS[revenue.id] || '#94a3b8' : '#94a3b8';

    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={linkColor}
        strokeWidth={linkWidth}
        strokeOpacity={0.3}
        className="hover:stroke-opacity-70 transition-all cursor-pointer"
      />
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-lg">
          <p className="text-xs font-semibold">{data.payload?.name || 'N/A'}</p>
          {data.value && (
            <p className="text-xs text-muted-foreground">€{data.value.toFixed(1)}M</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{t('interactive.title')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('interactive.subtitle')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-muted-foreground">
            {t('interactive.revenue')}: €{totalRevenue.toFixed(0)}M | {t('interactive.expenditure')}: €{totalExpenditure.toFixed(0)}M
          </p>
          {remoteData && (
            <p className="text-[11px] text-muted-foreground">
              {t('interactive.period')}: {remoteData.year}-{String(remoteData.month).padStart(2, '0')} ({remoteData.month_name})
            </p>
          )}
        </div>
      </div>

      {isLoading && !remoteData && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('interactive.loading')}
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            {t('interactive.loadFail')}
            <br />
            <span className="font-mono">{loadError}</span>
          </p>
        </div>
      )}

      <div className="border rounded-lg bg-white overflow-hidden">
        <ResponsiveContainer width="100%" height={450}>
          <Sankey
            data={sankeyData}
            node={<CustomNode />}
            link={<CustomLink />}
            nodePadding={4}
            nodeWidth={8}
            margin={{ top: 10, right: 150, bottom: 10, left: 150 }}
          >
            <Tooltip content={<CustomTooltip />} />
          </Sankey>
        </ResponsiveContainer>
      </div>

      {remoteData && (
        <p className="mt-3 text-[11px] text-muted-foreground break-all">
          {t('interactive.source')}: data.gov.lv ({remoteData.source_dataset_id}) • resource {remoteData.source_resource_id}
        </p>
      )}
    </Card>
  );
}
