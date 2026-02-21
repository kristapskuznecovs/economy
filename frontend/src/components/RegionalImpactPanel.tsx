import { Fragment } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { LATVIA_AREAS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

export function RegionalImpactPanel() {
  const { activeScenario } = useAppStore();
  const { t } = useI18n();

  if (!activeScenario) return null;

  const years = [1, 5, 15] as const;

  return (
    <section>
      <h3 className="text-sm font-semibold mb-3">{t('regionalImpact.title')}</h3>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('regionalImpact.area')}</TableHead>
                {years.map(y => (
                  <TableHead key={y} className="text-xs text-center" colSpan={2}>{t('regionalImpact.year', { year: y })}</TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="text-[10px]" />
                {years.map(y => (
                  <Fragment key={`hdr-${y}`}>
                    <TableHead className="text-[10px] text-right">{t('regionalImpact.gdp')}</TableHead>
                    <TableHead className="text-[10px] text-right">{t('regionalImpact.jobs')}</TableHead>
                  </Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {LATVIA_AREAS.map(area => (
                <TableRow key={area}>
                  <TableCell className="text-xs font-medium py-1.5">{area}</TableCell>
                  {years.map(y => {
                    const imp = activeScenario.regional_area_impacts.find(
                      r => r.area === area && r.year === y
                    );
                    if (!imp) {
                      return (
                        <Fragment key={y}>
                          <TableCell className="py-1.5 text-right font-mono text-xs">-</TableCell>
                          <TableCell className="py-1.5 text-right font-mono text-xs">-</TableCell>
                        </Fragment>
                      );
                    }
                    return (
                      <Fragment key={y}>
                        <TableCell className={`py-1.5 text-right font-mono text-xs ${imp.gdp_real_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {imp.gdp_real_pct > 0 ? '+' : ''}{imp.gdp_real_pct}%
                        </TableCell>
                        <TableCell className={`py-1.5 text-right font-mono text-xs ${imp.employment_jobs >= 0 ? 'text-positive' : 'text-negative'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {imp.employment_jobs > 0 ? '+' : ''}{imp.employment_jobs.toLocaleString()}
                            <Badge
                              variant="outline"
                              className={`text-[8px] h-4 px-1 ${
                                imp.direction === 'increase' ? 'border-positive/40 text-positive' :
                                imp.direction === 'decrease' ? 'border-negative/40 text-negative' :
                                ''
                              }`}
                            >
                              {imp.direction === 'increase' ? '↑' : imp.direction === 'decrease' ? '↓' : '→'}
                            </Badge>
                          </div>
                        </TableCell>
                      </Fragment>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}
