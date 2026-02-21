import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Send, Loader2, Sparkles, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { ApiError, api, type PolicyParseResponse } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

function getDecisionLabel(decision: PolicyParseResponse['decision'], t: (key: string) => string): string {
  return t(`globalAsk.decision.${decision}`);
}

function formatParameterValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value);
}

export function GlobalAskBar() {
  const { t } = useI18n();
  const { askFiscalAssistant, isSimulating } = useAppStore();
  const [value, setValue] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<PolicyParseResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState('');
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});

  const isBusy = isSimulating || isParsing;
  const quickPrompts = [
    t('quickPrompt.1'),
    t('quickPrompt.2'),
    t('quickPrompt.3'),
    t('quickPrompt.4'),
  ];

  const parseAndDecide = async (prompt: string, answers?: Record<string, string>) => {
    setIsParsing(true);
    setParseError(null);

    try {
      const result = await api.parsePolicy({
        policy: prompt,
        country: 'LV',
        clarification_answers: answers,
      });

      setParseResult(result);
      setPendingPrompt(prompt);

      if (result.decision === 'auto_proceed' || result.decision === 'proceed_with_warning') {
        askFiscalAssistant(prompt);
        setValue('');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('globalAsk.failedToParse');
      const isNetworkFailure =
        message.toLowerCase().includes('network error') ||
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('load failed');
      const isParserServiceUnavailable =
        error instanceof ApiError && (error.status === 404 || error.status >= 500);

      if (isNetworkFailure || isParserServiceUnavailable) {
        setParseError(t('globalAsk.parseFailedFallback', { message }));
        askFiscalAssistant(prompt);
        setValue('');
      } else {
        setParseError(message);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = () => {
    const prompt = value.trim();
    if (!prompt || isBusy) return;
    void parseAndDecide(prompt);
  };

  const handleConfirmRun = () => {
    if (!pendingPrompt || isBusy) return;
    askFiscalAssistant(pendingPrompt);
    setValue('');
  };

  const handleSubmitClarifications = () => {
    if (!pendingPrompt || isBusy) return;
    const answers = Object.fromEntries(
      Object.entries(clarificationAnswers).filter(([, answer]) => answer.trim())
    );
    void parseAndDecide(pendingPrompt, answers);
  };

  const updateClarificationAnswer = (question: string, answer: string) => {
    setClarificationAnswers(prev => ({ ...prev, [question]: answer }));
  };

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold">{t('globalAsk.title')}</h2>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={t('globalAsk.placeholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="h-11 text-sm"
          disabled={isBusy}
        />
        <Button onClick={handleSubmit} disabled={!value.trim() || isBusy} className="h-11 px-4">
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {quickPrompts.map(prompt => (
          <Button
            key={prompt}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => { setValue(prompt); }}
            disabled={isBusy}
          >
            {prompt}
          </Button>
        ))}
      </div>

      {parseError && (
        <Alert variant="destructive" className="mt-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('globalAsk.parseFailed')}</AlertTitle>
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {parseResult && (
        <Card className="mt-3 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[11px]">
              {t('globalAsk.parser')}: {parseResult.parser_used}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t('globalAsk.confidence')}: {Math.round(parseResult.interpretation.confidence * 100)}%
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t('globalAsk.type')}: {parseResult.interpretation.policy_type}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {t('globalAsk.category')}: {parseResult.interpretation.category}
            </Badge>
          </div>

          <Alert>
            {parseResult.decision === 'blocked_for_clarification' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : parseResult.decision === 'require_confirmation' ? (
              <HelpCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertTitle>{t('globalAsk.policyInterpretation')}</AlertTitle>
            <AlertDescription>
              <p className="text-sm">{getDecisionLabel(parseResult.decision, t)}</p>
              {parseResult.warning && (
                <p className="text-xs text-muted-foreground mt-1">{parseResult.warning}</p>
              )}
            </AlertDescription>
          </Alert>

          <div>
            <p className="text-xs font-semibold mb-1">{t('globalAsk.reasoning')}</p>
            <p className="text-xs text-muted-foreground">{parseResult.interpretation.reasoning}</p>
          </div>

          {Object.keys(parseResult.interpretation.parameter_changes).length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">{t('globalAsk.parameterChanges')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(parseResult.interpretation.parameter_changes).map(([key, val]) => (
                  <div key={key} className="rounded border bg-muted/40 px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{key}</p>
                    <p className="text-xs font-mono">{formatParameterValue(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parseResult.interpretation.ambiguities.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">{t('globalAsk.ambiguities')}</p>
              <ul className="space-y-1">
                {parseResult.interpretation.ambiguities.map(ambiguity => (
                  <li key={ambiguity} className="text-xs text-muted-foreground flex gap-1.5">
                    <span>•</span>
                    <span>{ambiguity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parseResult.decision === 'require_confirmation' && (
            <div className="pt-1">
              <Button onClick={handleConfirmRun} disabled={isBusy || !pendingPrompt}>
                {t('globalAsk.runWithInterpretation')}
              </Button>
            </div>
          )}

          {parseResult.decision === 'blocked_for_clarification' && parseResult.interpretation.clarification_questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">{t('globalAsk.clarificationRequired')}</p>
              {parseResult.interpretation.clarification_questions.map(question => (
                <div key={question} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{question}</p>
                  <Input
                    value={clarificationAnswers[question] || ''}
                    onChange={(e) => updateClarificationAnswer(question, e.target.value)}
                    placeholder={t('globalAsk.answerPlaceholder')}
                    disabled={isBusy}
                    className="h-9 text-xs"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                onClick={handleSubmitClarifications}
                disabled={isBusy || !pendingPrompt}
              >
                {t('globalAsk.reparse')}
              </Button>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
