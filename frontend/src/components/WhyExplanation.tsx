import { Card } from '@/components/ui/card';
import { ArrowRight, Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';

export function WhyExplanation() {
  const { activeScenario } = useAppStore();
  const { t } = useI18n();

  if (!activeScenario) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold">{t('why.title')}</h3>
      </div>

      {/* Causal Chain */}
      <Card className="p-4 mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('why.causalChain')}</p>
        <div className="flex flex-wrap items-center gap-1">
          {activeScenario.causal_chain.map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-xs bg-muted px-2 py-1 rounded">{step}</span>
              {i < activeScenario.causal_chain.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Key Drivers */}
        <Card className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('why.keyDrivers')}</p>
          <ul className="space-y-1">
            {activeScenario.key_drivers.map((d, i) => (
              <li key={i} className="text-xs flex gap-1.5">
                <span className="text-accent">•</span> {d}
              </li>
            ))}
          </ul>
        </Card>

        {/* Winners */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp className="h-3 w-3 text-positive" />
            <p className="text-xs font-medium text-muted-foreground">{t('why.winners')}</p>
          </div>
          <ul className="space-y-1">
            {activeScenario.winners.map((w, i) => (
              <li key={i} className="text-xs flex gap-1.5">
                <span className="text-positive">+</span> {w}
              </li>
            ))}
          </ul>
        </Card>

        {/* Losers */}
        <Card className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsDown className="h-3 w-3 text-negative" />
            <p className="text-xs font-medium text-muted-foreground">{t('why.losers')}</p>
          </div>
          <ul className="space-y-1">
            {activeScenario.losers.map((l, i) => (
              <li key={i} className="text-xs flex gap-1.5">
                <span className="text-negative">−</span> {l}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
