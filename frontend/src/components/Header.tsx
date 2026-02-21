import { Flag, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function Header() {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
            <Flag className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Latvia Government Budget Flow Dashboard</h1>
            <p className="text-xs text-muted-foreground">Fiscal Transparency & Policy Simulation</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm">Home</Button>
          <Button variant="ghost" size="sm">Saved Views</Button>
          <Button variant="ghost" size="sm">Docs</Button>
        </nav>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="border-positive/30 text-positive text-xs">
                Data: A
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="p-1">
                <p className="font-semibold text-xs mb-1">Data Freshness</p>
                <p className="text-xs">Eurostat COFOG: 12 days old</p>
                <p className="text-xs">CSB Latvia: 5 days old</p>
                <p className="text-xs">IO Tables: 45 days old</p>
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
