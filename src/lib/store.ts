// ============================================================
// Astro Trader Insights - Global State (Zustand)
// ============================================================

import { create } from "zustand";
import type { Company, AlgorithmScore, MacroContext, ExplorerFilters } from "./types";
import { generateMockCompanies, getDefaultMacroContext } from "./mock-data";
import { evaluateAll } from "./algorithm";
import type { MarketGroupId } from "./market-groups";

export type DataSource = "mock" | "live";
export type ActiveSection = "macro" | "explorer" | "screener" | "watchlist" | "wiki" | "settings";
export type AssetClass = "stocks" | "crypto";
/** Top-level app mode: esoteric (cosmic) vs serious (fundamental analysis). */
export type AppMode = "esoteric" | "serious";
export type MacroSubSection = "overview" | "turbulence" | "lunar" | "mercury" | "solar" | "backtest" | "sectors" | "fibonacci";

interface AppState {
    // ── Data ───────────────────────────────────────────────────
    companies: Company[];
    scores: AlgorithmScore[];
    macro: MacroContext;
    dataSource: DataSource;

    // ── Navigation ────────────────────────────────────────────
    activeSection: ActiveSection;
    assetClass: AssetClass;
    appMode: AppMode;
    macroSubSection: MacroSubSection;
    selectedMarket: MarketGroupId | null | string; // crypto markets can be strings like "decentralized-finance-defi"

    // ── Explorer Filters ───────────────────────────────────────
    filters: ExplorerFilters;

    // ── UI State ───────────────────────────────────────────────
    selectedCompanyId: string | null;
    isDetailOpen: boolean;
    isLoading: boolean;
    loadingTicker: string | null;   // ticker currently being fetched (for the loading screen)
    apiCallCount: number;
    error: string | null;

    // ── Actions ────────────────────────────────────────────────
    initializeData: () => void;
    setActiveSection: (section: ActiveSection) => void;
    setAssetClass: (assetClass: AssetClass) => void;
    setAppMode: (mode: AppMode) => void;
    setDataSource: (source: DataSource) => void;
    setMacroSubSection: (sub: MacroSubSection) => void;
    setSelectedMarket: (market: MarketGroupId | string | null) => void;
    fetchLiveData: (market?: MarketGroupId | string) => Promise<void>;
    fetchCompanyDetail: (ticker: string) => Promise<void>;
    addCompanyByTicker: (ticker: string, assetType?: "s" | "c") => Promise<void>;
    setFilter: <K extends keyof ExplorerFilters>(key: K, value: ExplorerFilters[K]) => void;
    setMacro: (macro: Partial<MacroContext>) => void;
    selectCompany: (id: string | null) => void;
    recalculateScores: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
    companies: [],
    scores: [],
    macro: getDefaultMacroContext(),
    dataSource: "live",
    activeSection: "macro",
    assetClass: "stocks",
    appMode: "serious",
    macroSubSection: "overview",
    selectedMarket: null,

    filters: {
        maxMarketCap: 5_000_000,   // $5T — show everything by default
        minFcfYield: 0,            // 0% — show everything
        minBookToMarket: 0,        // 0 — show everything
        showOnlyPassing: false,
    },

    selectedCompanyId: null,
    isDetailOpen: false,
    isLoading: false,
    loadingTicker: null,
    apiCallCount: 0,
    error: null,

    initializeData: () => {
        const companies = generateMockCompanies();
        const { macro, filters } = get();
        const scores = evaluateAll(companies, macro, filters.maxMarketCap);
        set({ companies, scores, error: null });
    },

    setActiveSection: (section) => {
        set({ activeSection: section, selectedCompanyId: null, isDetailOpen: false });
    },

    setAssetClass: (assetClass) => {
        set({ assetClass, selectedMarket: null, companies: [], scores: [], selectedCompanyId: null, isDetailOpen: false });
    },

    setAppMode: (mode) => set({ appMode: mode }),

    setDataSource: (source) => {
        set({ dataSource: source, error: null });
        if (source === "mock") {
            get().initializeData();
        }
        // Live mode no longer auto-scans — user must pick a market first
    },

    setMacroSubSection: (sub) => {
        set({ macroSubSection: sub });
    },

    setSelectedMarket: (market) => {
        set({ selectedMarket: market });
        if (market) {
            get().fetchLiveData(market);
        } else {
            // Going back to market selector — clear companies
            set({ companies: [], scores: [] });
        }
    },

    fetchLiveData: async (market?: MarketGroupId | string) => {
        const { filters, assetClass, dataSource } = get();
        set({ isLoading: true, error: null });

        try {
            const params = new URLSearchParams({
                maxMarketCap: String(filters.maxMarketCap),
                limit: "200",
                source: dataSource,
            });

            if (market) {
                if (assetClass === "crypto") {
                    params.set("category", market);
                } else {
                    params.set("market", market);
                }
            }

            const endpoint = assetClass === "crypto" ? "/api/crypto-screener" : "/api/screener";
            const res = await fetch(`${endpoint}?${params}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || `API error: ${res.status}`);
            }

            const data = await res.json();
            const companies: Company[] = data.companies;
            const { macro } = get();
            const scores = evaluateAll(companies, macro, filters.maxMarketCap);

            set((state) => ({
                companies,
                scores,
                isLoading: false,
                apiCallCount: state.apiCallCount + 1,
            }));
        } catch (error) {
            console.error("[fetchLiveData]", error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to fetch live data",
            });
        }
    },

    fetchCompanyDetail: async (ticker: string) => {
        set({ isLoading: true, error: null });

        try {
            const res = await fetch(`/api/company/${ticker}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || `API error: ${res.status}`);
            }

            const data = await res.json();
            const enrichedCompany: Company = data.company;
            const apiCalls: number = data.apiCalls || 3;

            set((state) => {
                const updatedCompanies = state.companies.map((c) =>
                    c.ticker === ticker ? enrichedCompany : c
                );
                const { macro, filters } = state;
                const scores = evaluateAll(updatedCompanies, macro, filters.maxMarketCap);

                return {
                    companies: updatedCompanies,
                    scores,
                    isLoading: false,
                    apiCallCount: state.apiCallCount + apiCalls,
                };
            });
        } catch (error) {
            console.error("[fetchCompanyDetail]", error);
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to fetch company detail",
            });
        }
    },

    addCompanyByTicker: async (ticker: string, assetType?: "s" | "c") => {
        const isCrypto = assetType === "c";
        // Crypto tickers are CoinGecko IDs (lowercase, hyphens) — don't uppercase
        const lookupTicker = isCrypto ? ticker.trim() : ticker.toUpperCase().trim();
        // For crypto, Company.ticker is the symbol (e.g. "HBAR"), not the CoinGecko ID,
        // so we match by ID prefix instead.
        const existing = get().companies.find((c) =>
            isCrypto ? c.id === `cg_${lookupTicker}` : c.ticker === lookupTicker
        );
        if (existing) {
            get().selectCompany(existing.id);
            return;
        }

        set({ isLoading: true, loadingTicker: lookupTicker, error: null });

        try {
            const queryParam = isCrypto ? "?type=c" : "";
            const res = await fetch(`/api/company/${encodeURIComponent(lookupTicker)}${queryParam}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || `Ticker "${lookupTicker}" not found`);
            }

            const data = await res.json();
            const company: Company = data.company;
            const apiCalls: number = data.apiCalls || 2;

            set((state) => {
                const updatedCompanies = [...state.companies, company];
                const { macro, filters } = state;
                const scores = evaluateAll(updatedCompanies, macro, filters.maxMarketCap);

                return {
                    companies: updatedCompanies,
                    scores,
                    isLoading: false,
                    loadingTicker: null,
                    apiCallCount: state.apiCallCount + apiCalls,
                    selectedCompanyId: company.id,
                    isDetailOpen: true,
                };
            });
        } catch (error) {
            console.error("[addCompanyByTicker]", error);
            set({
                isLoading: false,
                loadingTicker: null,
                error: error instanceof Error ? error.message : "Failed to add company",
            });
        }
    },

    setFilter: (key, value) => {
        set((state) => ({
            filters: { ...state.filters, [key]: value },
        }));
        get().recalculateScores();
    },

    setMacro: (partial) => {
        set((state) => ({
            macro: { ...state.macro, ...partial },
        }));
        get().recalculateScores();
    },

    selectCompany: (id) => {
        const { dataSource, companies } = get();

        if (id && dataSource === "live") {
            const company = companies.find((c) => c.id === id);
            if (company) {
                get().fetchCompanyDetail(company.ticker);
            }
        }

        set({ selectedCompanyId: id, isDetailOpen: id !== null });
    },

    recalculateScores: () => {
        const { companies, macro, filters } = get();
        const scores = evaluateAll(companies, macro, filters.maxMarketCap);
        set({ scores });
    },
}));
