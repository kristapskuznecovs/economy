import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

function normalizeYears(years: number[]): number[] {
  return [...new Set(years)].sort((a, b) => a - b);
}

type YearSelectorProps = {
  label: string;
  years: number[];
  value: number;
  onChange: (year: number) => void;
  disabled?: boolean;
  className?: string;
  showStepButtons?: boolean;
};

export function YearSelector({
  label,
  years,
  value,
  onChange,
  disabled = false,
  className,
  showStepButtons = true,
}: YearSelectorProps) {
  const options = normalizeYears(years);
  if (options.length === 0) {
    return null;
  }

  const safeValue = options.includes(value) ? value : options[options.length - 1];
  const currentIndex = options.indexOf(safeValue);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <p className="text-xs font-medium">{label}</p>
      <div className="flex items-center gap-1">
        {showStepButtons && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || currentIndex <= 0}
            onClick={() => onChange(options[currentIndex - 1])}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        <Select
          value={String(safeValue)}
          onValueChange={(next) => onChange(Number(next))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 min-w-[96px] px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showStepButtons && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || currentIndex >= options.length - 1}
            onClick={() => onChange(options[currentIndex + 1])}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

type YearRangeSelectorProps = {
  label: string;
  fromLabel: string;
  toLabel: string;
  years: number[];
  fromYear: number;
  toYear: number;
  onChange: (fromYear: number, toYear: number) => void;
  disabled?: boolean;
  className?: string;
};

export function YearRangeSelector({
  label,
  fromLabel,
  toLabel,
  years,
  fromYear,
  toYear,
  onChange,
  disabled = false,
  className,
}: YearRangeSelectorProps) {
  const options = normalizeYears(years);
  if (options.length === 0) {
    return null;
  }

  const minYear = options[0];
  const maxYear = options[options.length - 1];
  const safeFrom = Math.max(minYear, Math.min(fromYear, maxYear));
  const safeTo = Math.max(minYear, Math.min(toYear, maxYear));
  const resolvedFrom = Math.min(safeFrom, safeTo);
  const resolvedTo = Math.max(safeFrom, safeTo);

  const fromOptions = options.filter((year) => year <= resolvedTo);
  const toOptions = options.filter((year) => year >= resolvedFrom);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <p className="text-xs font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{fromLabel}</span>
        <Select
          value={String(resolvedFrom)}
          onValueChange={(next) => {
            const nextFrom = Number(next);
            const nextTo = Math.max(nextFrom, resolvedTo);
            onChange(nextFrom, nextTo);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 min-w-[92px] px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fromOptions.map((year) => (
              <SelectItem key={`from-${year}`} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-[11px] text-muted-foreground">{toLabel}</span>
        <Select
          value={String(resolvedTo)}
          onValueChange={(next) => {
            const nextTo = Number(next);
            const nextFrom = Math.min(resolvedFrom, nextTo);
            onChange(nextFrom, nextTo);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 min-w-[92px] px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {toOptions.map((year) => (
              <SelectItem key={`to-${year}`} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
