/**
 * API client for Economic Simulation Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SimulateRequest {
  policy: string;
  country?: string;
  horizon_quarters?: number;
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

class ApiError extends Error {
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
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json();
}

export const api = {
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
