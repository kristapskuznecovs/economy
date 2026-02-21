import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { QUICK_PROMPTS } from '@/lib/mockData';

export function GlobalAskBar() {
  const { askFiscalAssistant, isSimulating } = useAppStore();
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim() || isSimulating) return;
    askFiscalAssistant(value.trim());
    setValue('');
  };

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold">Ask Fiscal AI</h2>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Ask a fiscal question (e.g., simulate 2nd pension pillar removal)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="h-11 text-sm"
          disabled={isSimulating}
        />
        <Button onClick={handleSubmit} disabled={!value.trim() || isSimulating} className="h-11 px-4">
          {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {QUICK_PROMPTS.map(prompt => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => { setValue(prompt); }}
            disabled={isSimulating}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </section>
  );
}
