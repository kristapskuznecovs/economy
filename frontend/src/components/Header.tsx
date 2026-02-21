import { Flag, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';

export function Header() {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
            <Flag className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">{t('header.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('header.subtitle')}</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm">{t('header.home')}</Button>
          <Button variant="ghost" size="sm">{t('header.savedViews')}</Button>
          <Button variant="ghost" size="sm">{t('header.docs')}</Button>
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border px-2 py-1">
            <span className={`text-[10px] font-semibold ${locale === 'lv' ? 'text-foreground' : 'text-muted-foreground'}`}>
              LV
            </span>
            <Switch
              checked={locale === 'en'}
              onCheckedChange={(checked) => setLocale(checked ? 'en' : 'lv')}
              aria-label={t('header.langLabel')}
              className="h-5 w-9"
            />
            <span className={`text-[10px] font-semibold ${locale === 'en' ? 'text-foreground' : 'text-muted-foreground'}`}>
              EN
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="border-positive/30 text-positive text-xs">
                {t('header.data')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="p-1">
                <p className="font-semibold text-xs mb-1">{t('header.dataFreshness')}</p>
                <p className="text-xs">{t('header.dataFreshness.stateBudget')}</p>
                <p className="text-xs">{t('header.dataFreshness.csb')}</p>
                <p className="text-xs">{t('header.dataFreshness.ioTables')}</p>
              </div>
            </TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
