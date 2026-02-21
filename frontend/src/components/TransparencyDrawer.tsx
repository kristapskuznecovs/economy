import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Shield, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';

export function TransparencyDrawer() {
  const { activeScenario } = useAppStore();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  if (!activeScenario) return null;

  const confidenceColor = {
    high: 'text-positive border-positive/40',
    medium: 'text-warning border-warning/40',
    low: 'text-negative border-negative/40',
  }[activeScenario.confidence];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('transparency.title')}</span>
            <Badge variant="outline" className={`text-[10px] ${confidenceColor}`}>
              {t('transparency.confidence', { confidence: activeScenario.confidence })}
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('transparency.model')}</p>
            <p className="text-xs font-semibold">{activeScenario.model_name}</p>
            <p className="text-[10px] text-muted-foreground">v{activeScenario.model_version}</p>
          </Card>

          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('transparency.assumptions')}</p>
            <ul className="space-y-0.5">
              {activeScenario.assumptions.map((a, i) => (
                <li key={i} className="text-[10px] flex gap-1">
                  <span className="text-muted-foreground">•</span> {a}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3 w-3 text-warning" />
              <p className="text-xs font-medium text-muted-foreground">{t('transparency.caveats')}</p>
            </div>
            <ul className="space-y-0.5">
              {activeScenario.caveats.map((c, i) => (
                <li key={i} className="text-[10px] flex gap-1">
                  <span className="text-warning">⚠</span> {c}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
