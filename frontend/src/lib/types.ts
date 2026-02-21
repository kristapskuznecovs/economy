export interface BudgetRow {
  cofog: string;
  category: string;
  icon: string;
  current_eur_m: number;
  new_eur_m: number;
}

export interface RevenueSource {
  id: string;
  label: string;
  amount_eur_m: number;
  enabled: boolean;
  type: 'regional_tax' | 'eu_funds' | 'borrowing' | 'other';
}

export interface ExpenditureItem {
  id: string;
  label: string;
  cofog?: string;
  amount_eur_m: number;
  kind: 'category' | 'project';
  funded_by?: 'eu_funds' | 'borrowing' | 'taxes' | 'reallocation';
}

export interface HorizonImpact {
  year: 1 | 5 | 15;
  budget_balance_eur_m: number;
  revenues_eur_m: number;
  expenditures_eur_m: number;
  gdp_real_pct: number;
  employment_jobs: number;
  inflation_pp: number;
}

export interface RegionalAreaImpact {
  area: 'Riga' | 'Pieriga' | 'Kurzeme' | 'Zemgale' | 'Vidzeme' | 'Latgale';
  year: 1 | 5 | 15;
  gdp_real_pct: number;
  employment_jobs: number;
  income_tax_eur_m: number;
  social_spending_eur_m: number;
  direction: 'increase' | 'decrease' | 'neutral';
}

export interface InvestmentImpact {
  year: 1 | 5 | 15;
  public_investment_eur_m: number;
  private_investment_eur_m: number;
  fdi_investment_eur_m: number;
  total_investment_eur_m: number;
  direction: 'increase' | 'decrease' | 'neutral';
  explanation: string;
}

export interface ScenarioResult {
  scenario_id: string;
  title: string;
  policy_changes: string[];
  horizon_impacts: HorizonImpact[];
  regional_area_impacts: RegionalAreaImpact[];
  investment_impacts: InvestmentImpact[];
  model_name: string;
  model_version: string;
  confidence: 'low' | 'medium' | 'high';
  assumptions: string[];
  caveats: string[];
  causal_chain: string[];
  key_drivers: string[];
  winners: string[];
  losers: string[];
}

export interface SankeyNode {
  id: string;
  title: string;
  color: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface DataQuality {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sources: Array<{ name: string; freshness_days: number }>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{
    label: string;
    action: string;
    params: Record<string, unknown>;
  }>;
}

export interface SavedScenario {
  id: string;
  name: string;
  created_at: string;
  budgetRows: BudgetRow[];
  fundingSource: string | null;
}

export type FundingSource = 'eu_funds' | 'borrowing' | 'taxes' | 'reallocation';

export type LatviaArea = 'Riga' | 'Pieriga' | 'Kurzeme' | 'Zemgale' | 'Vidzeme' | 'Latgale';
export const LATVIA_AREAS: LatviaArea[] = ['Riga', 'Pieriga', 'Kurzeme', 'Zemgale', 'Vidzeme', 'Latgale'];
