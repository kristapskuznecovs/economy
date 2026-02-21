import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function InvestmentPanel() {
  const { activeScenario } = useAppStore();

  if (!activeScenario) return null;

  return (
    <section>
      <h3 className="text-sm font-semibold mb-3">Investment Impact</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {activeScenario.investment_impacts.map(inv => (
          <Card key={inv.year} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-xs">Year {inv.year}</Badge>
              {inv.direction === 'increase' ? (
                <TrendingUp className="h-4 w-4 text-positive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-negative" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Public</span>
                <span className={`font-mono font-semibold ${inv.public_investment_eur_m >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {inv.public_investment_eur_m > 0 ? '+' : ''}€{inv.public_investment_eur_m}M
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Private</span>
                <span className={`font-mono font-semibold ${inv.private_investment_eur_m >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {inv.private_investment_eur_m > 0 ? '+' : ''}€{inv.private_investment_eur_m}M
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">FDI</span>
                <span className={`font-mono font-semibold ${inv.fdi_investment_eur_m >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {inv.fdi_investment_eur_m > 0 ? '+' : ''}€{inv.fdi_investment_eur_m}M
                </span>
              </div>
              <div className="pt-1.5 border-t flex justify-between text-xs">
                <span className="font-medium">Total</span>
                <span className={`font-mono font-bold ${inv.total_investment_eur_m >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {inv.total_investment_eur_m > 0 ? '+' : ''}€{inv.total_investment_eur_m}M
                </span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground mt-2">{inv.explanation}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
