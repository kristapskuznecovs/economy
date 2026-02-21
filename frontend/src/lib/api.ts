/**
 * API client for Economic Simulation Backend
 */

const RAW_API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');

export interface SimulateRequest {
  policy: string;
  country?: string;
  horizon_quarters?: number;
}

export type PolicyParseDecision =
  | 'auto_proceed'
  | 'proceed_with_warning'
  | 'require_confirmation'
  | 'blocked_for_clarification';

export interface PolicyParseRequest {
  policy: string;
  country?: string;
  clarification_answers?: Record<string, string>;
}

export interface PolicyInterpretation {
  policy_type: 'immigration_processing' | 'subsidy' | 'tax_change' | 'regulation' | 'reallocation';
  category: string;
  parameter_changes: Record<string, unknown>;
  confidence: number;
  reasoning: string;
  ambiguities: string[];
  clarification_needed: boolean;
  clarification_questions: string[];
}

export interface PolicyParseResponse {
  interpretation: PolicyInterpretation;
  decision: PolicyParseDecision;
  can_simulate: boolean;
  warning: string | null;
  parser_used: 'openai' | 'rule_based';
  parser_error: string | null;
}

export interface BudgetVoteDivision {
  id: string;
  label: string;
  vote_division: string;
  amount_eur_m: number;
  share_pct: number;
  cents_from_euro: number;
}

export interface BudgetVoteDivisionsResponse {
  year: number;
  month: number;
  month_name: string;
  total_expenditure_eur_m: number;
  source_dataset_id: string;
  source_resource_id: string;
  source_last_modified: string | null;
  source_url: string | null;
  divisions: BudgetVoteDivision[];
}

export interface BudgetVoteDivisionGroupSummary {
  id: string;
  label: string;
  latest_amount_eur_m: number;
  latest_share_pct: number;
}

export interface BudgetVoteDivisionHistoryPoint {
  year: number;
  month: number;
  month_name: string;
  amount_eur_m: number;
  change_from_base_eur_m: number;
  change_from_base_pct: number | null;
  change_yoy_eur_m: number | null;
  change_yoy_pct: number | null;
}

export interface BudgetVoteDivisionHistoryResponse {
  since_year: number;
  to_year: number;
  selected_group_id: string;
  selected_group_label: string;
  total_expenditure_latest_eur_m: number;
  source_dataset_id: string;
  source_resource_ids: string[];
  groups: BudgetVoteDivisionGroupSummary[];
  series: BudgetVoteDivisionHistoryPoint[];
}

export interface SimulateResponse {
  run_id: string;
  status: string;
}

export interface HorizonImpact {
  year: number;
  budget_balance_eur_m: number;
  revenues_eur_m: number;
  expenditures_eur_m: number;
  gdp_real_pct: number;
  employment_jobs: number;
  inflation_pp: number;
}

export interface RegionalImpact {
  area: string;
  year: number;
  gdp_real_pct: number;
  employment_jobs: number;
  income_tax_eur_m: number;
  social_spending_eur_m: number;
  direction: 'increase' | 'decrease' | 'neutral';
}

export interface InvestmentImpact {
  year: number;
  public_investment_eur_m: number;
  private_investment_eur_m: number;
  fdi_investment_eur_m: number;
  total_investment_eur_m: number;
  direction: 'increase' | 'decrease';
  explanation: string;
}

export interface SimulationResults {
  scenario_id: string;
  title: string;
  policy_changes: string[];
  horizon_impacts: HorizonImpact[];
  regional_impacts: RegionalImpact[];
  investment_impacts: InvestmentImpact[];
  model_name: string;
  model_version: string;
  confidence: string;
  assumptions: string[];
  caveats: string[];
  causal_chain: string[];
  key_drivers: string[];
  winners: string[];
  losers: string[];
}

export interface SimulationDetailsResponse {
  run_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  policy_text: string;
  results: SimulationResults | null;
  error_message: string | null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    throw new Error(
      `Network error calling ${url}: ${message}. Check backend availability and CORS/API URL config.`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json();
}

export const api = {
  /**
   * Get expenditure allocations by ministry/resor from open data portal.
   */
  async getBudgetVoteDivisions(params?: {
    year?: number;
    month?: number;
    limit?: number;
  }): Promise<BudgetVoteDivisionsResponse> {
    const search = new URLSearchParams();
    if (params?.year !== undefined) search.set('year', String(params.year));
    if (params?.month !== undefined) search.set('month', String(params.month));
    if (params?.limit !== undefined) search.set('limit', String(params.limit));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return fetchApi<BudgetVoteDivisionsResponse>(`/api/budget/vote-divisions${suffix}`);
  },

  /**
   * Get yearly series for one expenditure group since a base year.
   */
  async getBudgetVoteDivisionHistory(params?: {
    since_year?: number;
    group?: string;
    top_groups?: number;
  }): Promise<BudgetVoteDivisionHistoryResponse> {
    const search = new URLSearchParams();
    if (params?.since_year !== undefined) search.set('since_year', String(params.since_year));
    if (params?.group) search.set('group', params.group);
    if (params?.top_groups !== undefined) search.set('top_groups', String(params.top_groups));
    const suffix = search.toString() ? `?${search.toString()}` : '';
    return fetchApi<BudgetVoteDivisionHistoryResponse>(`/api/budget/vote-divisions/history${suffix}`);
  },

  /**
   * Parse policy text to structured parameters before simulation.
   */
  async parsePolicy(request: PolicyParseRequest): Promise<PolicyParseResponse> {
    return fetchApi<PolicyParseResponse>('/api/policy/parse', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Start a new simulation
   */
  async simulate(request: SimulateRequest): Promise<SimulateResponse> {
    return fetchApi<SimulateResponse>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get simulation results
   */
  async getResults(runId: string): Promise<SimulationDetailsResponse> {
    return fetchApi<SimulationDetailsResponse>(`/api/results/${runId}`);
  },

  /**
   * Get simulation status
   */
  async getStatus(runId: string): Promise<{ run_id: string; status: string }> {
    return fetchApi(`/api/status/${runId}`);
  },

  /**
   * Health check
   */
  async health(): Promise<{ status: string }> {
    return fetchApi('/api/health');
  },
};
