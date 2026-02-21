import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'lv' | 'en';

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const STORAGE_KEY = 'economy_locale';

const DICTIONARY: Record<Locale, Record<string, string>> = {
  lv: {
    'header.title': 'Latvijas valdības budžeta plūsmas panelis',
    'header.subtitle': 'Fiskālā caurskatāmība un politikas simulācijas',
    'header.home': 'Sākums',
    'header.savedViews': 'Saglabātie skati',
    'header.docs': 'Dokumentācija',
    'header.data': 'Dati: A',
    'header.dataFreshness': 'Datu aktualitāte',
    'header.dataFreshness.stateBudget': 'Valsts budžeta resori: pirms 12 dienām',
    'header.dataFreshness.csb': 'CSP Latvija: pirms 5 dienām',
    'header.dataFreshness.ioTables': 'I/O tabulas: pirms 45 dienām',
    'header.langLabel': 'Valoda',
    'index.detailsButton': 'Ieņēmumu un izdevumu detaļas',
    'index.tab.impact': 'Ietekme',
    'index.tab.why': 'Kāpēc',
    'index.tab.map': 'Karte',
    'index.tab.flow': 'Plūsma',
    'index.tab.details': 'Detaļas',
    'globalAsk.title': 'Jautā Fiscal AI',
    'globalAsk.placeholder': 'Uzdod fiskālu jautājumu (piem., simulēt 2. pensiju līmeņa atcelšanu)',
    'globalAsk.parseFailed': 'Politikas parsēšana neizdevās',
    'globalAsk.decision.auto_proceed':
      'Augsta pārliecība: simulācija tiks palaista automātiski.',
    'globalAsk.decision.proceed_with_warning':
      'Laba pārliecība ar pieņēmumiem: simulācija tiks palaista ar brīdinājumu.',
    'globalAsk.decision.require_confirmation':
      'Vidēja pārliecība: pārskati interpretāciju un apstiprini pirms simulācijas.',
    'globalAsk.decision.blocked_for_clarification':
      'Bloķēts: pirms simulācijas precizē trūkstošās detaļas.',
    'globalAsk.parseFailedFallback': '{message} Simulācija tiks palaista bez parsera.',
    'globalAsk.failedToParse': 'Neizdevās parsēt politiku',
    'globalAsk.parser': 'Parseris',
    'globalAsk.confidence': 'Pārliecība',
    'globalAsk.type': 'Tips',
    'globalAsk.category': 'Kategorija',
    'globalAsk.policyInterpretation': 'Politikas interpretācija',
    'globalAsk.reasoning': 'Pamatojums',
    'globalAsk.parameterChanges': 'Parametru izmaiņas',
    'globalAsk.ambiguities': 'Neskaidrības',
    'globalAsk.runWithInterpretation': 'Palaist simulāciju ar šo interpretāciju',
    'globalAsk.clarificationRequired': 'Nepieciešams precizējums',
    'globalAsk.answerPlaceholder': 'Ieraksti atbildi...',
    'globalAsk.reparse': 'Pārparsēt ar precizējumiem',
    'quickPrompt.1': 'Simulēt 2. pensiju līmeņa atcelšanu',
    'quickPrompt.2': 'Kas notiek, ja veselības budžetu palielina par €100M?',
    'quickPrompt.3': 'Samazināt aizsardzības budžetu par 20%',
    'quickPrompt.4': 'Pārdalīt ES fondus izglītībai',
    'horizon.gdp': 'IKP',
    'horizon.jobs': 'Darbvietas',
    'horizon.budget': 'Budžets',
    'horizon.inflation': 'Inflācija',
    'horizon.year': '{year}. gads',
    'horizon.yearImpact': '{year}. gada ietekme',
    'horizon.askAbove': 'Uzdod jautājumu augstāk',
    'why.title': 'Kāpēc tas notiek',
    'why.causalChain': 'Cēloņsakarību ķēde',
    'why.keyDrivers': 'Galvenie virzītāji',
    'why.winners': 'Ieguvēji',
    'why.losers': 'Zaudētāji',
    'interactive.title': 'Budžeta plūsma: no ieņēmumiem uz izdevumiem',
    'interactive.subtitle': 'Interaktīva Sankey diagramma - virziet peli virs mezgliem un saitēm',
    'interactive.revenue': 'Ieņēmumi',
    'interactive.expenditure': 'Izdevumi',
    'interactive.period': 'Periods',
    'interactive.loading': 'Ielādē budžeta sadalījumu no data.gov.lv...',
    'interactive.loadFail': 'Neizdevās ielādēt tiešsaistes datus. Parādīti lokālie dati.',
    'interactive.source': 'Avots',
    'sankey.title': 'Cik tiek novirzīts no 1 nodokļos iemaksātā eiro?',
    'sankey.subtitle': 'Saeimas balsojuma loģika pēc resoriem un ministrijām',
    'sankey.total': 'Kopā',
    'sankey.period': 'Periods',
    'sankey.loading': 'Ielādē budžeta sadalījumu no data.gov.lv...',
    'sankey.loadFail': 'Neizdevās ielādēt tiešsaistes datus. Parādīti lokālie dati.',
    'sankey.chartTitle': 'Visas ministrijas: vertikāls stabiņu grafiks',
    'sankey.chartSubtitle': 'Pilnais sadalījums pa resoriem ({count} ieraksti)',
    'sankey.tableTitle': 'Atvērtie dati: izdevumu tabula pēc ministrijām',
    'sankey.colMinistry': 'Ministrija / resors',
    'sankey.colEuro': 'No €1 (centi)',
    'sankey.colAmount': 'Summa (€M)',
    'sankey.colShare': 'Daļa (%)',
    'sankey.source': 'Avots',
    'sankey.cents': 'centi',
    'sankey.amountLabel': 'Summa',
    'history.title': 'Izdevumu izmaiņu pārlūks',
    'history.subtitle': 'Maini grupu un skati 1 gadu vai visu periodu no 2010. gada.',
    'history.period': 'Pieejamais periods',
    'history.loading': 'Ielādē vēsturiskos izdevumu datus...',
    'history.failed': 'Neizdevās ielādēt vēsturi',
    'history.group': 'Izdevumu grupa',
    'history.tabSingle': '1 gada skats',
    'history.tabAll': 'Visu gadu skats',
    'history.selectedYear': 'Izvēlētais gads',
    'history.yearsShown': 'Parādītie gadi',
    'history.metricAmount': 'Apjoms (€M)',
    'history.metricBaseEur': 'Pret bāzi (€M)',
    'history.metricBasePct': 'Pret bāzi (%)',
    'history.metricYoyPct': 'Gada izmaiņa (%)',
    'history.na': 'nav',
    'regionalMap.title': 'Latvijas reģionu fiskālā bilance',
    'regionalMap.netReceiver': 'Neto saņēmējs',
    'regionalMap.netContributor': 'Neto iemaksātājs',
    'regionalMap.fiscalDetail': '{area} — fiskālā detalizācija',
    'regionalMap.taxesPaid': 'Samaksātie nodokļi',
    'regionalMap.budgetReceived': 'Saņemtais budžets',
    'regionalMap.fiscalBalance': 'Fiskālā bilance',
    'regionalMap.scenarioImpactYear1': 'Scenārija ietekme (1. gads)',
    'regionalMap.jobs': 'darbvietas',
    'map.title': 'Latvijas interaktīvā karte',
    'map.subtitle': 'Reģioni, pilsētas un ostas',
    'map.legend.positive': 'Pozitīva ietekme',
    'map.legend.negative': 'Negatīva ietekme',
    'map.legend.neutral': 'Neitrāla ietekme',
    'map.legend.capital': 'Galvaspilsēta',
    'map.legend.port': 'Osta',
    'map.source': 'Avots',
    'regionalImpact.title': 'Reģionālā ietekme pa teritorijām',
    'regionalImpact.area': 'Teritorija',
    'regionalImpact.year': '{year}. gads',
    'regionalImpact.gdp': 'IKP %',
    'regionalImpact.jobs': 'Darbvietas',
    'investment.title': 'Ietekme uz investīcijām',
    'investment.year': '{year}. gads',
    'investment.public': 'Publiskās',
    'investment.private': 'Privātās',
    'investment.fdi': 'ĀTI',
    'investment.total': 'Kopā',
    'details.revenueTitle': 'Ieņēmumu avoti',
    'details.expenditureTitle': 'Izdevumi (Saeimas balsojuma dalījums)',
    'details.total': 'Kopā',
    'transparency.title': 'Caurskatāmība un modeļa informācija',
    'transparency.confidence': '{confidence} pārliecība',
    'transparency.model': 'Modelis',
    'transparency.assumptions': 'Pieņēmumi',
    'transparency.caveats': 'Ierobežojumi',
    'notFound.title': 'Ups! Lapa nav atrasta',
    'notFound.return': 'Atgriezties sākumā',
  },
  en: {
    'header.title': 'Latvia Government Budget Flow Dashboard',
    'header.subtitle': 'Fiscal Transparency & Policy Simulation',
    'header.home': 'Home',
    'header.savedViews': 'Saved Views',
    'header.docs': 'Docs',
    'header.data': 'Data: A',
    'header.dataFreshness': 'Data Freshness',
    'header.dataFreshness.stateBudget': 'State budget vote divisions: 12 days old',
    'header.dataFreshness.csb': 'CSB Latvia: 5 days old',
    'header.dataFreshness.ioTables': 'IO Tables: 45 days old',
    'header.langLabel': 'Language',
    'index.detailsButton': 'Revenue & Expenditure Details',
    'index.tab.impact': 'Impact',
    'index.tab.why': 'Why',
    'index.tab.map': 'Map',
    'index.tab.flow': 'Flow',
    'index.tab.details': 'Details',
    'globalAsk.title': 'Ask Fiscal AI',
    'globalAsk.placeholder': 'Ask a fiscal question (e.g., simulate 2nd pension pillar removal)',
    'globalAsk.parseFailed': 'Policy parse failed',
    'globalAsk.decision.auto_proceed':
      'High confidence: simulation will run automatically.',
    'globalAsk.decision.proceed_with_warning':
      'Good confidence with assumptions: simulation will run with warning.',
    'globalAsk.decision.require_confirmation':
      'Moderate confidence: review interpretation and confirm before simulation.',
    'globalAsk.decision.blocked_for_clarification':
      'Blocked: clarify missing details before simulation.',
    'globalAsk.parseFailedFallback': '{message} Running simulation without parser.',
    'globalAsk.failedToParse': 'Failed to parse policy',
    'globalAsk.parser': 'Parser',
    'globalAsk.confidence': 'Confidence',
    'globalAsk.type': 'Type',
    'globalAsk.category': 'Category',
    'globalAsk.policyInterpretation': 'Policy interpretation',
    'globalAsk.reasoning': 'Reasoning',
    'globalAsk.parameterChanges': 'Parameter changes',
    'globalAsk.ambiguities': 'Ambiguities',
    'globalAsk.runWithInterpretation': 'Run simulation with this interpretation',
    'globalAsk.clarificationRequired': 'Clarification required',
    'globalAsk.answerPlaceholder': 'Type answer...',
    'globalAsk.reparse': 'Re-parse with clarifications',
    'quickPrompt.1': 'Simulate removing the 2nd pension pillar',
    'quickPrompt.2': 'What if we increase health spending by €100M?',
    'quickPrompt.3': 'Cut defence budget by 20%',
    'quickPrompt.4': 'Redirect EU funds to education',
    'horizon.gdp': 'GDP',
    'horizon.jobs': 'Jobs',
    'horizon.budget': 'Budget',
    'horizon.inflation': 'Inflation',
    'horizon.year': 'Year {year}',
    'horizon.yearImpact': 'Year {year} impact',
    'horizon.askAbove': 'Ask a question above',
    'why.title': 'Why This Happens',
    'why.causalChain': 'Causal Chain',
    'why.keyDrivers': 'Key Drivers',
    'why.winners': 'Winners',
    'why.losers': 'Losers',
    'interactive.title': 'Budget flow: from revenues to expenditures',
    'interactive.subtitle': 'Interactive Sankey chart - hover over nodes and links for details',
    'interactive.revenue': 'Revenue',
    'interactive.expenditure': 'Expenditure',
    'interactive.period': 'Period',
    'interactive.loading': 'Loading budget allocation from data.gov.lv...',
    'interactive.loadFail': 'Could not load online data. Showing local fallback data.',
    'interactive.source': 'Source',
    'sankey.title': 'How much from €1 paid in taxes is allocated to sectors?',
    'sankey.subtitle': 'Saeima vote logic by ministries and spending lines',
    'sankey.total': 'Total',
    'sankey.period': 'Period',
    'sankey.loading': 'Loading budget allocation from data.gov.lv...',
    'sankey.loadFail': 'Could not load online data. Showing local fallback data.',
    'sankey.chartTitle': 'All ministries: vertical bar chart',
    'sankey.chartSubtitle': 'Full allocation by spending line ({count} records)',
    'sankey.tableTitle': 'Open data: expenditure table by ministries',
    'sankey.colMinistry': 'Ministry / spending line',
    'sankey.colEuro': 'From €1 (cents)',
    'sankey.colAmount': 'Amount (€M)',
    'sankey.colShare': 'Share (%)',
    'sankey.source': 'Source',
    'sankey.cents': 'cents',
    'sankey.amountLabel': 'Amount',
    'history.title': 'Expenditure Change Explorer',
    'history.subtitle': 'Switch groups and view 1 year or full-period changes since 2010.',
    'history.period': 'Available period',
    'history.loading': 'Loading historical expenditure data...',
    'history.failed': 'Failed to load history',
    'history.group': 'Expenditure group',
    'history.tabSingle': '1 year view',
    'history.tabAll': 'all years view',
    'history.selectedYear': 'Selected year',
    'history.yearsShown': 'Years shown',
    'history.metricAmount': 'Amount (€M)',
    'history.metricBaseEur': 'vs base (€M)',
    'history.metricBasePct': 'vs base (%)',
    'history.metricYoyPct': 'YoY (%)',
    'history.na': 'n/a',
    'regionalMap.title': 'Latvia Regional Fiscal Balance',
    'regionalMap.netReceiver': 'Net receiver',
    'regionalMap.netContributor': 'Net contributor',
    'regionalMap.fiscalDetail': '{area} - Fiscal Detail',
    'regionalMap.taxesPaid': 'Taxes Paid',
    'regionalMap.budgetReceived': 'Budget Received',
    'regionalMap.fiscalBalance': 'Fiscal Balance',
    'regionalMap.scenarioImpactYear1': 'Scenario Impact (Yr 1)',
    'regionalMap.jobs': 'jobs',
    'map.title': 'Interactive Latvia Map',
    'map.subtitle': 'Regions, cities and ports',
    'map.legend.positive': 'Positive impact',
    'map.legend.negative': 'Negative impact',
    'map.legend.neutral': 'Neutral impact',
    'map.legend.capital': 'Capital',
    'map.legend.port': 'Port',
    'map.source': 'Source',
    'regionalImpact.title': 'Regional Impact by Area',
    'regionalImpact.area': 'Area',
    'regionalImpact.year': 'Year {year}',
    'regionalImpact.gdp': 'GDP %',
    'regionalImpact.jobs': 'Jobs',
    'investment.title': 'Investment Impact',
    'investment.year': 'Year {year}',
    'investment.public': 'Public',
    'investment.private': 'Private',
    'investment.fdi': 'FDI',
    'investment.total': 'Total',
    'details.revenueTitle': 'Revenue Sources',
    'details.expenditureTitle': 'Expenditures (Saeima Vote Divisions)',
    'details.total': 'Total',
    'transparency.title': 'Transparency & Model Info',
    'transparency.confidence': '{confidence} confidence',
    'transparency.model': 'Model',
    'transparency.assumptions': 'Assumptions',
    'transparency.caveats': 'Caveats',
    'notFound.title': 'Oops! Page not found',
    'notFound.return': 'Return to Home',
  },
};

function resolveMessage(locale: Locale, key: string): string {
  return DICTIONARY[locale][key] ?? DICTIONARY.en[key] ?? key;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : `{${token}}`
  );
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'lv';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'lv';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: string, vars?: Record<string, string | number>) =>
        interpolate(resolveMessage(locale, key), vars),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
