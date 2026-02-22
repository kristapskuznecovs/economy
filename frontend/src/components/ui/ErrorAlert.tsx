import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  className?: string;
}

export function ErrorAlert({ message, className = '' }: ErrorAlertProps) {
  return (
    <div className={`flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 ${className}`}>
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
