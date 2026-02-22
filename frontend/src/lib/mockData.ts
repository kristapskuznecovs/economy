import type { BudgetRow, ScenarioResult, HorizonImpact, RegionalAreaImpact, InvestmentImpact, RevenueSource, ExpenditureItem, LatviaArea } from './types';
import { LATVIA_AREAS } from './types';

export const DEFAULT_BUDGET_ROWS: BudgetRow[] = [
  { cofog: "01", category: "General Public Services", icon: "🏛️", current_eur_m: 1850, new_eur_m: 1850 },
  { cofog: "02", category: "Defence", icon: "🛡️", current_eur_m: 980, new_eur_m: 980 },
  { cofog: "03", category: "Public Order & Safety", icon: "👮", current_eur_m: 620, new_eur_m: 620 },
  { cofog: "04", category: "Economic Affairs", icon: "💼", current_eur_m: 1420, new_eur_m: 1420 },
  { cofog: "05", category: "Environment Protection", icon: "🌿", current_eur_m: 280, new_eur_m: 280 },
  { cofog: "06", category: "Housing & Community", icon: "🏠", current_eur_m: 340, new_eur_m: 340 },
  { cofog: "07", category: "Health", icon: "🏥", current_eur_m: 1680, new_eur_m: 1680 },
  { cofog: "08", category: "Recreation & Culture", icon: "🎭", current_eur_m: 420, new_eur_m: 420 },
  { cofog: "09", category: "Education", icon: "📚", current_eur_m: 1560, new_eur_m: 1560 },
  { cofog: "10", category: "Social Protection", icon: "🤝", current_eur_m: 3250, new_eur_m: 3250 },
];

// Detailed revenue sources based on Latvian tax system
export const DEFAULT_REVENUE_SOURCES: RevenueSource[] = [
  { id: 'iin', label: 'Iedzīvotāju ienākuma nodoklis (IIN)', amount_eur_m: 2800, enabled: true, type: 'regional_tax' },
  { id: 'pvn', label: 'Pievienotās vērtības nodoklis (PVN)', amount_eur_m: 3200, enabled: true, type: 'regional_tax' },
  { id: 'akcizes', label: 'Akcīzes nodokļi', amount_eur_m: 980, enabled: true, type: 'regional_tax' },
  { id: 'uzn_ien', label: 'Uzņēmumu ienākuma nodoklis', amount_eur_m: 620, enabled: true, type: 'regional_tax' },
  { id: 'soc_apdr', label: 'Sociālās apdrošināšanas iemaksas', amount_eur_m: 1850, enabled: true, type: 'regional_tax' },
  { id: 'nekust_ipas', label: 'Nekustamā īpašuma nodoklis', amount_eur_m: 380, enabled: true, type: 'regional_tax' },
  { id: 'customs', label: 'Muitas nodokļi', amount_eur_m: 210, enabled: true, type: 'regional_tax' },
  { id: 'dab_resursi', label: 'Dabas resursu nodokļi', amount_eur_m: 140, enabled: true, type: 'regional_tax' },
  { id: 'eu_funds', label: 'ES struktūrfondi', amount_eur_m: 850, enabled: true, type: 'eu_funds' },
  { id: 'borrowing', label: 'Aizņēmumi', amount_eur_m: 380, enabled: true, type: 'borrowing' },
  { id: 'other_rev', label: 'Citi ieņēmumi', amount_eur_m: 590, enabled: true, type: 'other' },
];

export const SAEIMA_VOTE_EXPENDITURES: ExpenditureItem[] = [
  { id: 'vote_social', label: 'Social Security and Pensions', vote_division: 'Welfare & Special Budgets', amount_eur_m: 3000, kind: 'category' },
  { id: 'vote_health', label: 'Ministry of Health', vote_division: 'Health', amount_eur_m: 1750, kind: 'category' },
  { id: 'vote_education', label: 'Ministry of Education and Science', vote_division: 'Education', amount_eur_m: 1650, kind: 'category' },
  { id: 'vote_finance', label: 'Ministry of Finance (incl. debt service)', vote_division: 'Finance', amount_eur_m: 1300, kind: 'category' },
  { id: 'vote_defence', label: 'Ministry of Defence', vote_division: 'Defence', amount_eur_m: 1100, kind: 'category' },
  { id: 'vote_interior', label: 'Ministry of the Interior', vote_division: 'Interior', amount_eur_m: 820, kind: 'category' },
  { id: 'vote_transport', label: 'Ministry of Transport', vote_division: 'Transport', amount_eur_m: 650, kind: 'category' },
  { id: 'vote_economics', label: 'Ministry of Economics', vote_division: 'Economics', amount_eur_m: 520, kind: 'category' },
  { id: 'vote_agriculture', label: 'Ministry of Agriculture', vote_division: 'Agriculture', amount_eur_m: 460, kind: 'category' },
  { id: 'vote_justice', label: 'Ministry of Justice', vote_division: 'Justice', amount_eur_m: 360, kind: 'category' },
  { id: 'vote_varam', label: 'Ministry of Environmental Protection and Regional Development', vote_division: 'Environment & Regions', amount_eur_m: 300, kind: 'category' },
  { id: 'vote_culture', label: 'Ministry of Culture', vote_division: 'Culture', amount_eur_m: 200, kind: 'category' },
  { id: 'vote_foreign', label: 'Ministry of Foreign Affairs', vote_division: 'Foreign Affairs', amount_eur_m: 170, kind: 'category' },
  { id: 'vote_constitutional', label: 'Saeima, Presidency and Constitutional Bodies', vote_division: 'Constitutional Bodies', amount_eur_m: 140, kind: 'category' },
];

const AREA_WEIGHTS: Record<LatviaArea, number> = {
  Riga: 0.42, Pieriga: 0.18, Kurzeme: 0.12, Zemgale: 0.09, Vidzeme: 0.10, Latgale: 0.09,
};

export function generateMockScenario(prompt: string): ScenarioResult {
  const isRemoval = prompt.toLowerCase().includes('remov') || prompt.toLowerCase().includes('cut');
  const sign = isRemoval ? -1 : 1;
  const base = 180 + Math.random() * 120;

  const horizons: HorizonImpact[] = ([1, 5, 15] as const).map(year => {
    const scale = year === 1 ? 1 : year === 5 ? 2.2 : 3.8;
    return {
      year,
      budget_balance_eur_m: Math.round(sign * base * 0.3 * scale),
      revenues_eur_m: Math.round(sign * base * 0.15 * scale),
      expenditures_eur_m: Math.round(sign * -base * 0.15 * scale),
      gdp_real_pct: Math.round(sign * 0.3 * scale * 100) / 100,
      employment_jobs: Math.round(sign * 2200 * scale),
      inflation_pp: Math.round(sign * 0.1 * scale * 100) / 100,
    };
  });

  const regionalImpacts: RegionalAreaImpact[] = [];
  for (const year of [1, 5, 15] as const) {
    const scale = year === 1 ? 1 : year === 5 ? 2.2 : 3.8;
    for (const area of LATVIA_AREAS) {
      const w = AREA_WEIGHTS[area];
      const jobs = Math.round(sign * 2200 * scale * w);
      regionalImpacts.push({
        area,
        year,
        gdp_real_pct: Math.round(sign * 0.3 * scale * w * 100) / 100,
        employment_jobs: jobs,
        income_tax_eur_m: Math.round(sign * base * 0.05 * scale * w),
        social_spending_eur_m: Math.round(base * 0.08 * scale * w),
        direction: jobs > 0 ? 'increase' : jobs < 0 ? 'decrease' : 'neutral',
      });
    }
  }

  const investmentImpacts: InvestmentImpact[] = ([1, 5, 15] as const).map(year => {
    const scale = year === 1 ? 1 : year === 5 ? 1.8 : 2.5;
    const pub = Math.round(sign * base * 0.4 * scale);
    const priv = Math.round(sign * base * 0.25 * scale);
    const fdi = Math.round(sign * base * 0.15 * scale);
    return {
      year,
      public_investment_eur_m: pub,
      private_investment_eur_m: priv,
      fdi_investment_eur_m: fdi,
      total_investment_eur_m: pub + priv + fdi,
      direction: (pub + priv + fdi) > 0 ? 'increase' as const : 'decrease' as const,
      explanation: year === 1
        ? 'Immediate public spending adjustment with limited private sector response'
        : year === 5
        ? 'Private sector adapts, FDI begins responding to policy signals'
        : 'Full structural adjustment with long-term investment reallocation',
    };
  });

  return {
    scenario_id: `scn_${Date.now()}`,
    title: prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt,
    policy_changes: [
      isRemoval ? 'Removal/reduction of targeted fiscal instrument' : 'Introduction/expansion of fiscal measure',
      'Adjustment to social transfer mechanisms',
      'Secondary effect on labor market participation',
    ],
    horizon_impacts: horizons,
    regional_area_impacts: regionalImpacts,
    investment_impacts: investmentImpacts,
    model_name: 'Latvia DSGE Fiscal Model',
    model_version: '2.4.1',
    confidence: 'medium',
    assumptions: [
      'EU growth baseline of 1.8% annually',
      'Stable monetary policy (ECB rates unchanged)',
      'No major external shocks',
      'Linear scaling of regional effects',
    ],
    caveats: [
      'Model does not capture behavioral migration effects',
      'Regional multipliers are approximated from national data',
      'Long-term projections carry increasing uncertainty',
    ],
    causal_chain: [
      isRemoval
        ? 'Policy removes existing fiscal instrument → reduces transfer payments'
        : 'Policy introduces new fiscal measure → increases public spending',
      'Direct effect on household disposable income',
      'Secondary consumption effects through multiplier channels',
      'Labor market adjustment over medium term',
      'Long-term structural shift in savings and investment patterns',
    ],
    key_drivers: [
      'Fiscal multiplier effect (1.2–1.6x depending on instrument)',
      'Regional concentration of affected population',
      'Labor market elasticity in service sectors',
      'EU co-financing leverage ratio',
    ],
    winners: isRemoval
      ? ['Government budget balance', 'Taxpayers (lower future obligations)', 'Fiscal sustainability metrics']
      : ['Direct beneficiaries of spending', 'Service sector employment', 'Regional economies'],
    losers: isRemoval
      ? ['Current benefit recipients', 'Consumer spending in affected regions', 'Social service employment']
      : ['Taxpayers (higher obligations)', 'Budget deficit', 'Competing spending priorities'],
  };
}

export const MOCK_CHAT_WELCOME = "👋 Ask any fiscal policy question to see budget, economy, regional, and investment impacts across 1, 5, and 15 year horizons.";
