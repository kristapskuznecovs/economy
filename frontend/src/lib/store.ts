import { create } from 'zustand';
import type { BudgetRow, ChatMessage, SavedScenario, FundingSource, ScenarioResult, RevenueSource, ExpenditureItem } from './types';
import { DEFAULT_BUDGET_ROWS, DEFAULT_REVENUE_SOURCES, DEFAULT_EXPENDITURES, generateMockScenario, MOCK_CHAT_WELCOME } from './mockData';

interface AppState {
  // Budget
  budgetRows: BudgetRow[];
  fundingSource: FundingSource | null;
  revenueSources: RevenueSource[];
  expenditures: ExpenditureItem[];

  // Simulation
  isSimulating: boolean;
  activeScenario: ScenarioResult | null;

  // Chat
  chatMessages: ChatMessage[];

  // Scenarios
  savedScenarios: SavedScenario[];

  // Actions
  updateBudgetRow: (cofog: string, newValue: number) => void;
  setFundingSource: (source: FundingSource) => void;
  toggleRevenueSource: (id: string, enabled: boolean) => void;
  updateExpenditure: (id: string, amount_eur_m: number) => void;
  askFiscalAssistant: (prompt: string) => Promise<void>;
  sendChatMessage: (message: string) => void;
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  resetBudget: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  budgetRows: DEFAULT_BUDGET_ROWS.map(r => ({ ...r })),
  fundingSource: 'eu_funds',
  revenueSources: DEFAULT_REVENUE_SOURCES.map(r => ({ ...r })),
  expenditures: DEFAULT_EXPENDITURES.map(e => ({ ...e })),
  isSimulating: false,
  activeScenario: null,
  chatMessages: [{ role: 'assistant', content: MOCK_CHAT_WELCOME }],
  savedScenarios: [],

  updateBudgetRow: (cofog, newValue) =>
    set(state => ({
      budgetRows: state.budgetRows.map(row =>
        row.cofog === cofog ? { ...row, new_eur_m: newValue } : row
      ),
    })),

  setFundingSource: (source) => set({ fundingSource: source }),

  toggleRevenueSource: (id, enabled) =>
    set(state => ({
      revenueSources: state.revenueSources.map(r =>
        r.id === id ? { ...r, enabled } : r
      ),
    })),

  updateExpenditure: (id, amount_eur_m) =>
    set(state => ({
      expenditures: state.expenditures.map(e =>
        e.id === id ? { ...e, amount_eur_m } : e
      ),
    })),

  askFiscalAssistant: async (prompt) => {
    set({ isSimulating: true });
    const { chatMessages } = get();
    set({ chatMessages: [...chatMessages, { role: 'user', content: prompt }] });

    try {
      // Call real backend API
      const { api } = await import('./api');
      const { run_id } = await api.simulate({ policy: prompt });

      // Get results (in MVP, simulation completes immediately)
      const simulation = await api.getResults(run_id);

      if (simulation.status === 'completed' && simulation.results) {
        const results = simulation.results;

        // Convert API response to ScenarioResult format
        const scenario: ScenarioResult = {
          scenario_id: results.scenario_id,
          title: results.title,
          policy_changes: results.policy_changes,
          horizon_impacts: results.horizon_impacts.map(h => ({
            year: h.year,
            budget_balance_eur_m: h.budget_balance_eur_m,
            revenues_eur_m: h.revenues_eur_m,
            expenditures_eur_m: h.expenditures_eur_m,
            gdp_real_pct: h.gdp_real_pct,
            employment_jobs: h.employment_jobs,
            inflation_pp: h.inflation_pp,
          })),
          regional_area_impacts: results.regional_impacts.map(r => ({
            area: r.area as any,
            year: r.year,
            gdp_real_pct: r.gdp_real_pct,
            employment_jobs: r.employment_jobs,
            income_tax_eur_m: r.income_tax_eur_m,
            social_spending_eur_m: r.social_spending_eur_m,
            direction: r.direction,
          })),
          investment_impacts: results.investment_impacts.map(i => ({
            year: i.year,
            public_investment_eur_m: i.public_investment_eur_m,
            private_investment_eur_m: i.private_investment_eur_m,
            fdi_investment_eur_m: i.fdi_investment_eur_m,
            total_investment_eur_m: i.total_investment_eur_m,
            direction: i.direction,
            explanation: i.explanation,
          })),
          model_name: results.model_name,
          model_version: results.model_version,
          confidence: results.confidence as any,
          assumptions: results.assumptions,
          caveats: results.caveats,
          causal_chain: results.causal_chain,
          key_drivers: results.key_drivers,
          winners: results.winners,
          losers: results.losers,
        };

        const h1 = scenario.horizon_impacts.find(h => h.year === 1)!;
        const h5 = scenario.horizon_impacts.find(h => h.year === 5)!;

        const response = `**Scenario: ${scenario.title}**\n\n` +
          `📊 Year 1: GDP ${h1.gdp_real_pct > 0 ? '+' : ''}${h1.gdp_real_pct}%, ${h1.employment_jobs > 0 ? '+' : ''}${h1.employment_jobs.toLocaleString()} jobs\n` +
          `📊 Year 5: GDP ${h5.gdp_real_pct > 0 ? '+' : ''}${h5.gdp_real_pct}%, ${h5.employment_jobs > 0 ? '+' : ''}${h5.employment_jobs.toLocaleString()} jobs\n\n` +
          `Confidence: ${scenario.confidence} | Model: ${scenario.model_name} v${scenario.model_version}`;

        set(state => ({
          activeScenario: scenario,
          isSimulating: false,
          chatMessages: [...state.chatMessages, { role: 'assistant', content: response }],
        }));
      } else {
        throw new Error('Simulation failed or returned no results');
      }
    } catch (error) {
      console.error('Simulation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      set(state => ({
        isSimulating: false,
        chatMessages: [...state.chatMessages, {
          role: 'assistant',
          content: `⚠️ Simulation error: ${errorMessage}. Please try again.`
        }],
      }));
    }
  },

  sendChatMessage: (message) => {
    get().askFiscalAssistant(message);
  },

  saveScenario: (name) => {
    const { budgetRows, fundingSource, savedScenarios } = get();
    const scenario: SavedScenario = {
      id: `scn_${Date.now()}`,
      name,
      created_at: new Date().toLocaleDateString('en-GB'),
      budgetRows: budgetRows.map(r => ({ ...r })),
      fundingSource,
    };
    set({ savedScenarios: [...savedScenarios, scenario] });
  },

  loadScenario: (id) => {
    const scenario = get().savedScenarios.find(s => s.id === id);
    if (scenario) {
      set({
        budgetRows: scenario.budgetRows.map(r => ({ ...r })),
        fundingSource: scenario.fundingSource as FundingSource,
      });
    }
  },

  resetBudget: () => set({ budgetRows: DEFAULT_BUDGET_ROWS.map(r => ({ ...r })) }),
}));
