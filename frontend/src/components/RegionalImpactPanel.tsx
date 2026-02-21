import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { LATVIA_AREAS } from '@/lib/types';

export function RegionalImpactPanel() {
  const { activeScenario } = useAppStore();

  if (!activeScenario) return null;

  const years = [1, 5, 15] as const;

  return (
    <section>
      <h3 className="text-sm font-semibold mb-3">Regional Impact by Area</h3>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Area</TableHead>
                {years.map(y => (
                  <TableHead key={y} className="text-xs text-center" colSpan={2}>Year {y}</TableHead>
                ))}
              </TableRow>
              <TableRow>
                <TableHead className="text-[10px]" />
                {years.map(y => (
                  <>
                    <TableHead key={`${y}-gdp`} className="text-[10px] text-right">GDP %</TableHead>
                    <TableHead key={`${y}-jobs`} className="text-[10px] text-right">Jobs</TableHead>
                  </>
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
                    if (!imp) return <><TableCell key={`${y}-g`} /><TableCell key={`${y}-j`} /></>;
                    return (
                      <>
                        <TableCell key={`${y}-g`} className={`py-1.5 text-right font-mono text-xs ${imp.gdp_real_pct >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {imp.gdp_real_pct > 0 ? '+' : ''}{imp.gdp_real_pct}%
                        </TableCell>
                        <TableCell key={`${y}-j`} className={`py-1.5 text-right font-mono text-xs ${imp.employment_jobs >= 0 ? 'text-positive' : 'text-negative'}`}>
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
                      </>
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
