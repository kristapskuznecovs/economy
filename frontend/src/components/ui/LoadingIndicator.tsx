import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
}

export function LoadingIndicator({ message, className = '' }: LoadingIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {message && <span>{message}</span>}
    </div>
  );
}
