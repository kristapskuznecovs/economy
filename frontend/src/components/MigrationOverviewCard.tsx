import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { api, type CitizenshipSnapshot, type MigrationOverviewResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

// Nationalities that map to a readable short label
const NATIONALITY_LABELS: Record<string, string> = {
  'KRIEVIJAS PILSONIS': 'Krievija',
  'UKRAINAS PILSONIS': 'Ukraina',
  'INDIJAS PILSONIS': 'Indija',
  'LIETUVAS PILSONIS': 'Lietuva',
  'BALTKRIEVIJAS PILSONIS': 'Baltkrievija',
  'UZBEKISTĀNAS PILSONIS': 'Uzbekistāna',
  'VĀCIJAS PILSONIS': 'Vācija',
  'LIELBRITĀNIJAS PILSONIS': 'Lielbritānija',
  'IGAUNIJAS PILSONIS': 'Igaunija',
  'IZRAĒLAS PILSONIS': 'Izraēla',
  'ITĀLIJAS PILSONIS': 'Itālija',
  'FRANCIJAS PILSONIS': 'Francija',
  'AZERBAIDŽĀNAS PILSONIS': 'Azerbaidžāna',
  'TURCIJAS PILSONIS': 'Turcija',
  'ZVIEDRIJAS PILSONIS': 'Zviedrija',
  'AMERIKAS SAVIENOTO VALSTU PILSONIS': 'ASV',
  'POLIJAS PILSONIS': 'Polija',
  'ŠRILANKAS PILSONIS': 'Šrilanka',
  'KAZAHSTĀNAS PILSONIS': 'Kazahstāna',
  'TADŽIKISTĀNAS PILSONIS': 'Tadžikistāna',
};

function shortNationality(raw: string): string {
  return NATIONALITY_LABELS[raw] ?? raw.replace(/ PILSONIS$/, '').replace(/ PILSONE$/, '');
}

function formatDate(snapshot_date: string): string {
  const y = snapshot_date.slice(0, 4);
  const m = snapshot_date.slice(4, 6);
  return `${y}-${m}`;
}

function StatTile({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'blue' | 'muted';
}) {
  const cls =
    accent === 'green' ? 'text-emerald-700' :
    accent === 'red'   ? 'text-rose-600' :
    accent === 'blue'  ? 'text-[#4f7ec7]' :
                         'text-foreground';
  return (
    <div className="rounded border bg-muted/20 p-3 flex flex-col gap-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-mono font-semibold ${cls}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-3 py-2 bg-muted/40 border-b">
      <p className="text-xs font-semibold">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function SnapshotSelector({
  snapshots,
  selected,
  onChange,
}: {
  snapshots: CitizenshipSnapshot[];
  selected: CitizenshipSnapshot;
  onChange: (s: CitizenshipSnapshot) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {snapshots.map((s) => {
        const label = formatDate(s.snapshot_date);
        const active = s.snapshot_date === selected.snapshot_date;
        return (
          <button
            key={s.snapshot_date}
            type="button"
            onClick={() => onChange(s)}
            className={`px-2 py-0.5 text-[11px] rounded border transition-colors ${
              active ? 'bg-muted font-medium border-muted-foreground/40' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function MigrationOverviewCard() {
  const { t } = useI18n();
  const [data, setData] = useState<MigrationOverviewResponse | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<CitizenshipSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.getMigrationOverview()
      .then((res) => {
        setData(res);
        setSelectedSnapshot(res.latest_snapshot);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('migration.failed'));
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Build citizenship time-series: foreign_nationals per snapshot date
  const citizenshipSeries = data?.citizenship_series
    .slice()
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .map((s) => ({
      date: formatDate(s.snapshot_date),
      foreign_nationals: s.foreign_nationals,
      temp_protection: s.temp_protection,
    })) ?? [];

  // WB net migration series (only years with data; migrant_stock omitted — it uses
  // a different definition than PMLP and would be confusing alongside it)
  const wbSeries = (data?.wb_series ?? [])
    .filter((p) => p.net_migration !== null)
    .sort((a, b) => a.year - b.year)
    .map((p) => ({ year: String(p.year), net_migration: p.net_migration }));

  const snap = selectedSnapshot;

  // Temp protection delta: compare two most recent snapshots
  const tempDelta = (() => {
    const series = data?.citizenship_series ?? [];
    if (series.length < 2) return null;
    const newest = series[0];
    const prev = series[1];
    if (newest.temp_protection === 0 && prev.temp_protection === 0) return null;
    return newest.temp_protection - prev.temp_protection;
  })();

  // Top nationalities for bar chart (top 10)
  const topForeign = (snap?.top_foreign ?? []).slice(0, 10).map((e) => ({
    label: shortNationality(e.citizenship),
    count: e.count,
  }));

  const BAR_COLORS = [
    '#4f7ec7', '#26a07a', '#f08c3b', '#8b7aa8',
    '#e05a5a', '#4fb0c7', '#a0c74f', '#c74f7e',
    '#7ac74f', '#c7a04f',
  ];

  return (
    <Card className="p-4 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t('migration.title')}</h3>
          <p className="text-xs text-muted-foreground">{t('migration.subtitle')}</p>
        </div>
        {snap && (
          <p className="text-[11px] text-muted-foreground font-mono">
            {t('migration.snapshotDate')}: {formatDate(snap.snapshot_date)}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('migration.loading')}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {snap && (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatTile
              label={t('migration.totalResidents')}
              value={snap.total_residents.toLocaleString()}
              sub={t('migration.registered')}
            />
            <StatTile
              label={t('migration.foreignNationals')}
              value={snap.foreign_nationals.toLocaleString()}
              sub={`${((snap.foreign_nationals / snap.total_residents) * 100).toFixed(1)}% ${t('migration.ofTotal')}`}
              accent="blue"
            />
            <StatTile
              label={t('migration.tempProtection')}
              value={snap.temp_protection.toLocaleString()}
              sub={
                tempDelta !== null
                  ? `${tempDelta > 0 ? '+' : ''}${tempDelta.toLocaleString()} ${t('migration.vsPrevSnapshot')}`
                  : t('migration.warRefugees')
              }
              accent="red"
            />
            <StatTile
              label={t('migration.nonCitizens')}
              value={snap.non_citizens_latvian.toLocaleString()}
              sub={t('migration.latvianNonCitizens')}
              accent="muted"
            />
          </div>

          {/* Snapshot selector */}
          {data && data.citizenship_series.length > 1 && (
            <div className="rounded border p-3 space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground">{t('migration.selectSnapshot')}</p>
              <SnapshotSelector
                snapshots={data.citizenship_series}
                selected={snap}
                onChange={setSelectedSnapshot}
              />
            </div>
          )}

          {/* Two charts side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

            {/* Top nationalities bar chart */}
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader
                title={t('migration.topNationalities.title')}
                subtitle={t('migration.topNationalities.subtitle')}
              />
              <div className="p-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={topForeign}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString()} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), t('migration.persons')]} />
                    <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                      {topForeign.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Foreign nationals over time */}
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader
                title={t('migration.foreignTrend.title')}
                subtitle={t('migration.foreignTrend.subtitle')}
              />
              <div className="p-2">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={citizenshipSeries}
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} angle={-30} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={38} />
                    <Tooltip
                      formatter={(v: number, name: string) => [
                        v.toLocaleString(),
                        name === 'foreign_nationals' ? t('migration.foreignNationals') : t('migration.tempProtection'),
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="foreign_nationals"
                      stroke="#4f7ec7"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="temp_protection"
                      stroke="#e05a5a"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex gap-3 px-2 mt-1">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="inline-block w-4 h-0.5 bg-[#4f7ec7]" />
                    {t('migration.foreignNationals')}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="inline-block w-4 h-0.5 bg-[#e05a5a]" style={{ borderTop: '2px dashed #e05a5a', background: 'none' }} />
                    {t('migration.tempProtection')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* World Bank net migration */}
          {wbSeries.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <SectionHeader
                title={t('migration.netMigration.title')}
                subtitle={t('migration.netMigration.subtitle')}
              />
              <div className="p-2">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={wbSeries} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={38} />
                    <Tooltip formatter={(v: number) => [v.toLocaleString(), t('migration.netMigration.label')]} />
                    <Bar dataKey="net_migration" radius={[2, 2, 0, 0]}>
                      {wbSeries.map((p, i) => (
                        <Cell
                          key={i}
                          fill={(p.net_migration ?? 0) >= 0 ? '#26a07a' : '#e05a5a'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-muted-foreground px-2 mt-1">{t('migration.netMigration.note')}</p>
              </div>
            </div>
          )}

          {/* What we cannot show — honest caveat */}
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
              <Users className="h-3.5 w-3.5" />
              {t('migration.caveat.title')}
            </div>
            <p className="text-[11px] text-amber-700">{t('migration.caveat.body')}</p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t('migration.source', {
              pmlp: data?.source_pmlp_dataset_id ?? '',
              wb: data?.source_wb_country ?? '',
            })}
          </p>
        </>
      )}
    </Card>
  );
}
