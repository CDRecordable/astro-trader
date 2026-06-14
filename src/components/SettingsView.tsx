// ============================================================
// SettingsView — User settings: LLM API keys, preferences
// ============================================================

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    Settings, Key, Eye, EyeOff, Save, CheckCircle2,
    AlertCircle, Loader2, Brain, Cpu, Zap, Info,
} from "lucide-react";
import type { UserSettings } from "@/app/api/settings/route";

// ── LLM Provider config ───────────────────────────────────────

const PROVIDERS = [
    {
        id: "gemini" as const,
        label: "Google Gemini",
        icon: Cpu,
        color: "var(--accent-cyan)",
        placeholder: "AIza...",
        docsUrl: "https://aistudio.google.com/app/apikey",
        description: "Gemini 2.0 Flash · Gratis hasta el límite diario",
    },
    {
        id: "claude" as const,
        label: "Anthropic Claude",
        icon: Brain,
        color: "var(--accent-violet)",
        placeholder: "sk-ant-...",
        docsUrl: "https://console.anthropic.com/settings/keys",
        description: "Claude Sonnet / Haiku · Potente y detallado",
    },
    {
        id: "deepseek" as const,
        label: "DeepSeek",
        icon: Zap,
        color: "var(--accent-emerald)",
        placeholder: "sk-...",
        docsUrl: "https://platform.deepseek.com/api_keys",
        description: "DeepSeek Chat · Coste bajísimo, ideal para análisis masivo",
    },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

// ── Crypto data provider config ───────────────────────────────

const DATA_PROVIDERS = [
    {
        id: "coinmarketcal" as const,
        label: "CoinMarketCal",
        color: "var(--accent-amber)",
        placeholder: "clave API",
        docsUrl: "https://coinmarketcal.com/en/developer/register",
        description: "Catalizadores: mainnets, listings, upgrades, unlocks",
    },
] as const;

type DataProviderId = (typeof DATA_PROVIDERS)[number]["id"];

// ── Component ─────────────────────────────────────────────────

export default function SettingsView() {
    const t = useTranslations("settings");

    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Visibility toggles per provider
    const [visible, setVisible] = useState<Record<ProviderId, boolean>>({
        gemini: false,
        claude: false,
        deepseek: false,
    });
    const [dataVisible, setDataVisible] = useState<Record<DataProviderId, boolean>>({
        coinmarketcal: false,
    });

    // ── Load settings from disk ───────────────────────────────
    useEffect(() => {
        fetch("/api/settings")
            .then((r) => r.json())
            .then((data: UserSettings) => { setSettings(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // ── Handlers ─────────────────────────────────────────────

    const handleKeyChange = (provider: ProviderId, value: string) => {
        if (!settings) return;
        // If the user types a key and no provider is active yet, auto-select
        // this one as default — so "paste a key" is enough to enable analysis.
        const shouldAutoSelect =
            value.trim().length > 0 && settings.llm.defaultProvider === "none";
        setSettings({
            ...settings,
            llm: {
                ...settings.llm,
                apiKeys: { ...settings.llm.apiKeys, [provider]: value },
                defaultProvider: shouldAutoSelect ? provider : settings.llm.defaultProvider,
            },
        });
        setSaved(false);
    };

    const handleDataKeyChange = (provider: DataProviderId, value: string) => {
        if (!settings) return;
        setSettings({
            ...settings,
            dataKeys: { ...settings.dataKeys, [provider]: value },
        });
        setSaved(false);
    };

    const handleDefaultProvider = (provider: UserSettings["llm"]["defaultProvider"]) => {
        if (!settings) return;
        setSettings({
            ...settings,
            llm: { ...settings.llm, defaultProvider: provider },
        });
        setSaved(false);
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setSaveError(null);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error("Error al guardar");
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : "Error desconocido");
        } finally {
            setSaving(false);
        }
    };

    const toggleVisible = (id: ProviderId) =>
        setVisible((v) => ({ ...v, [id]: !v[id] }));

    // ── Render ────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
                <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent-cyan)" }} />
            </div>
        );
    }

    if (!settings) return null;

    return (
        <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
            <div className="max-w-2xl mx-auto px-6 py-10">

                {/* Header */}
                <div className="flex items-center gap-3 mb-10">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: "linear-gradient(135deg, var(--accent-violet-dim), var(--accent-cyan-dim))",
                            boxShadow: "0 0 20px rgba(167,139,250,0.2)",
                        }}
                    >
                        <Settings size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                            {t("title")}
                        </h1>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {t("subtitle")}
                        </p>
                    </div>
                </div>

                {/* ── LLM Keys section ─────────────────────────── */}
                <section className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Key size={16} style={{ color: "var(--accent-cyan)" }} />
                        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                            {t("llmKeysTitle")}
                        </h2>
                    </div>

                    {/* Privacy note */}
                    <div
                        className="flex items-start gap-2 p-3 rounded-xl mb-5 text-xs"
                        style={{
                            background: "rgba(34,211,238,0.06)",
                            border: "1px solid rgba(34,211,238,0.15)",
                            color: "var(--text-muted)",
                        }}
                    >
                        <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent-cyan)" }} />
                        <span>{t("privacyNote")}</span>
                    </div>

                    {/* Default provider selector */}
                    <div className="mb-6">
                        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                            {t("defaultProvider")}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {(["none", "gemini", "claude", "deepseek"] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => handleDefaultProvider(p)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                                    style={{
                                        background: settings.llm.defaultProvider === p
                                            ? "var(--accent-cyan-dim)"
                                            : "var(--bg-tertiary)",
                                        color: settings.llm.defaultProvider === p
                                            ? "white"
                                            : "var(--text-muted)",
                                        border: "1px solid var(--border-subtle)",
                                    }}
                                >
                                    {p === "none" ? t("noProvider") : p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API key cards */}
                    <div className="flex flex-col gap-4">
                        {PROVIDERS.map((prov) => {
                            const Icon = prov.icon;
                            const currentKey = settings.llm.apiKeys[prov.id];
                            const isDefault = settings.llm.defaultProvider === prov.id;

                            return (
                                <motion.div
                                    key={prov.id}
                                    layout
                                    className="rounded-2xl p-5"
                                    style={{
                                        background: "var(--bg-secondary)",
                                        border: isDefault
                                            ? `1px solid ${prov.color}55`
                                            : "1px solid var(--border-subtle)",
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                                style={{ background: `${prov.color}18` }}
                                            >
                                                <Icon size={14} style={{ color: prov.color }} />
                                            </div>
                                            <div>
                                                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                                    {prov.label}
                                                </span>
                                                {isDefault && (
                                                    <span
                                                        className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                                        style={{ background: `${prov.color}22`, color: prov.color }}
                                                    >
                                                        {t("default")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <a
                                            href={prov.docsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] underline underline-offset-2"
                                            style={{ color: "var(--text-muted)" }}
                                        >
                                            {t("getKey")}
                                        </a>
                                    </div>

                                    <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
                                        {prov.description}
                                    </p>

                                    <div
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                        style={{
                                            background: "var(--bg-tertiary)",
                                            border: "1px solid var(--border-subtle)",
                                        }}
                                    >
                                        <input
                                            type={visible[prov.id] ? "text" : "password"}
                                            value={currentKey}
                                            onChange={(e) => handleKeyChange(prov.id, e.target.value)}
                                            placeholder={currentKey ? "••••••••••••••••••••" : prov.placeholder}
                                            className="flex-1 bg-transparent text-sm font-mono outline-none"
                                            style={{ color: "var(--text-primary)" }}
                                            autoComplete="off"
                                        />
                                        <button
                                            onClick={() => toggleVisible(prov.id)}
                                            className="p-1 rounded cursor-pointer"
                                            style={{ color: "var(--text-muted)" }}
                                        >
                                            {visible[prov.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                        {currentKey && (
                                            <div
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ background: "var(--signal-strong-buy)" }}
                                                title={t("keySet")}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* ── Crypto data keys section ─────────────────── */}
                <section className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Cpu size={16} style={{ color: "var(--accent-amber)" }} />
                        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                            {t("dataKeysTitle")}
                        </h2>
                    </div>

                    <div
                        className="flex items-start gap-2 p-3 rounded-xl mb-5 text-xs"
                        style={{
                            background: "rgba(251,191,36,0.06)",
                            border: "1px solid rgba(251,191,36,0.15)",
                            color: "var(--text-muted)",
                        }}
                    >
                        <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--accent-amber)" }} />
                        <span>{t("dataKeysNote")}</span>
                    </div>

                    <div className="flex flex-col gap-4">
                        {DATA_PROVIDERS.map((prov) => {
                            const currentKey = settings.dataKeys?.[prov.id] ?? "";
                            return (
                                <div
                                    key={prov.id}
                                    className="rounded-2xl p-5"
                                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                            {prov.label}
                                        </span>
                                        <a
                                            href={prov.docsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] underline underline-offset-2"
                                            style={{ color: "var(--text-muted)" }}
                                        >
                                            {t("getKey")}
                                        </a>
                                    </div>
                                    <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
                                        {prov.description}
                                    </p>
                                    <div
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                        style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)" }}
                                    >
                                        <input
                                            type={dataVisible[prov.id] ? "text" : "password"}
                                            value={currentKey}
                                            onChange={(e) => handleDataKeyChange(prov.id, e.target.value)}
                                            placeholder={currentKey ? "••••••••••••••••••••" : prov.placeholder}
                                            className="flex-1 bg-transparent text-sm font-mono outline-none"
                                            style={{ color: "var(--text-primary)" }}
                                            autoComplete="off"
                                        />
                                        <button
                                            onClick={() => setDataVisible((v) => ({ ...v, [prov.id]: !v[prov.id] }))}
                                            className="p-1 rounded cursor-pointer"
                                            style={{ color: "var(--text-muted)" }}
                                        >
                                            {dataVisible[prov.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                        {currentKey && (
                                            <div
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ background: "var(--signal-strong-buy)" }}
                                                title={t("keySet")}
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Save button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
                        style={{
                            background: saved
                                ? "var(--signal-strong-buy)"
                                : "linear-gradient(135deg, var(--accent-cyan-dim), var(--accent-violet-dim))",
                            color: "white",
                        }}
                    >
                        {saving
                            ? <Loader2 size={15} className="animate-spin" />
                            : saved
                                ? <CheckCircle2 size={15} />
                                : <Save size={15} />
                        }
                        {saving ? t("saving") : saved ? t("saved") : t("save")}
                    </button>

                    {saveError && (
                        <p className="text-xs flex items-center gap-1" style={{ color: "var(--signal-avoid)" }}>
                            <AlertCircle size={12} /> {saveError}
                        </p>
                    )}
                </div>

                {/* Storage note */}
                <div
                    className="mt-8 p-4 rounded-xl text-xs"
                    style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)",
                    }}
                >
                    <p className="font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                        {t("storageTitle")}
                    </p>
                    <p>{t("storageDesc")}</p>
                    <code
                        className="mt-1 block font-mono text-[11px] px-2 py-1 rounded-md"
                        style={{ background: "var(--bg-tertiary)", color: "var(--accent-cyan)" }}
                    >
                        ./user-data/settings.json
                    </code>
                </div>
            </div>
        </div>
    );
}
