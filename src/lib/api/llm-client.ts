// ============================================================
// LLM client — provider-agnostic adapter (server-side only)
// ============================================================
// Calls the user's OWN configured provider (Gemini / Claude / DeepSeek)
// with the API key stored locally in user-data/settings.json.
// Used for the qualitative analysis layer: catalysts, governance risks,
// pharma pipelines — the signals no financial API can compute.

export type LLMProvider = "gemini" | "claude" | "deepseek";

const MODELS: Record<LLMProvider, string> = {
    gemini: "gemini-2.0-flash",
    claude: "claude-sonnet-4-6",
    deepseek: "deepseek-chat",
};

/** Call the given provider with a single user prompt; returns raw text. */
export async function callLLM(provider: LLMProvider, apiKey: string, prompt: string): Promise<{ text: string; model: string }> {
    const model = MODELS[provider];

    if (provider === "claude") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                messages: [{ role: "user", content: prompt }],
            }),
        });
        if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = await res.json() as { content: Array<{ type: string; text?: string }> };
        const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("") ?? "";
        return { text, model };
    }

    if (provider === "gemini") {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 4096, temperature: 0.4 },
                }),
            },
        );
        if (!res.ok) throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        return { text, model };
    }

    // DeepSeek — OpenAI-compatible
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: 0.4,
            messages: [{ role: "user", content: prompt }],
        }),
    });
    if (!res.ok) throw new Error(`DeepSeek API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return { text: data.choices?.[0]?.message?.content ?? "", model };
}

// ── Qualitative analysis schema ──────────────────────────────

export interface QualitativeCatalyst {
    title: string;
    timeframe: string;          // e.g. "Q3 2026", "H1 2027", "fecha desconocida"
    impact: "alto" | "medio" | "bajo";
    type: "regulatorio" | "corporativo" | "producto" | "macro" | "otro";
    verify?: boolean;           // model unsure → user should verify
}

export interface QualitativeRisk {
    title: string;
    severity: "alto" | "medio" | "bajo";
}

export interface PipelineItem {
    asset: string;              // drug/product name
    stage: string;              // e.g. "Fase III", "PDUFA Q4 2026", "CHMP opinion pendiente"
    note?: string;
}

export interface QualitativeAnalysis {
    summary: string;
    catalysts: QualitativeCatalyst[];
    risks: QualitativeRisk[];
    pharmaPipeline: PipelineItem[] | null;
    governanceFlags: string[];
    moat: "amplio" | "estrecho" | "ninguno";
    qualitativeScore: number;   // 0-100
    verdict: string;

    // Narrative layer — grounded on recent news headlines
    narrativeScore: number;                               // 0-100 (higher = more positive momentum in the story)
    narrativeShift: { from: string; to: string } | null; // e.g. { from: "Neutral", to: "Strongly Positive" }
    baselineNarrative: string[];                          // what the story WAS
    recentNarrative: string[];                            // what it's BECOMING
}

/**
 * Best-effort JSON parse that tolerates the two ways LLM output breaks:
 *  1. trailing commas before a closing ] or }
 *  2. truncation (hit max_tokens mid-array/object) — we rebalance by cutting
 *     back to the last fully-complete value and closing the open brackets.
 */
function salvageJson(input: string): unknown {
    // Fast path
    try { return JSON.parse(input); } catch { /* fall through */ }

    // Strip trailing commas: ,}  → }   and  ,]  → ]
    const noTrailing = input.replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(noTrailing); } catch { /* fall through */ }

    // Rebalance a truncated structure. Scan tracking string state and an
    // open-bracket stack; remember the last index that sits right after a
    // *complete* value, then truncate there and append the missing closers.
    let inStr = false, esc = false;
    const stack: string[] = [];
    let safeEnd = -1;
    let safeStack: string[] = [];
    let lastValueStart = -1; // index of the '"' that opened the current value-string
    const mark = (i: number) => { safeEnd = i + 1; safeStack = [...stack]; };

    for (let i = 0; i < noTrailing.length; i++) {
        const c = noTrailing[i];
        if (inStr) {
            if (esc) esc = false;
            else if (c === "\\") esc = true;
            else if (c === '"') {
                inStr = false;
                // A string is a *value* (not a key) unless the next token is ':'
                let j = i + 1;
                while (j < noTrailing.length && /\s/.test(noTrailing[j])) j++;
                if (noTrailing[j] !== ":") mark(i);
            }
            continue;
        }
        if (c === '"') {
            inStr = true;
            // Track where this string began so we can close it if truncated.
            const prev = noTrailing.slice(0, i).trimEnd();
            const last = prev[prev.length - 1];
            if (last === ":" || last === "[" || last === ",") lastValueStart = i;
        }
        else if (c === "{") { stack.push("}"); }
        else if (c === "[") { stack.push("]"); }
        else if (c === "}" || c === "]") { stack.pop(); mark(i); }
        else if (/[0-9tfn-]/.test(c)) {
            // primitive token (number / true / false / null): jump to its end
            let j = i;
            while (j < noTrailing.length && /[0-9a-zA-Z+.eE\-]/.test(noTrailing[j])) j++;
            mark(j - 1);
            i = j - 1;
        }
    }

    // Fallback: the response was cut off *inside* a value-string (so nothing
    // ever "completed"). Close that string where it broke and seal the brackets.
    if (safeEnd === -1) {
        if (inStr && !esc && lastValueStart !== -1) {
            let out = noTrailing.replace(/\\$/, "") + '"';
            for (let k = stack.length - 1; k >= 0; k--) out += stack[k];
            return JSON.parse(out);
        }
        throw new Error("La respuesta del modelo no contiene JSON reparable");
    }
    let out = noTrailing.slice(0, safeEnd).replace(/,\s*$/, "");
    for (let k = safeStack.length - 1; k >= 0; k--) out += safeStack[k];
    return JSON.parse(out);
}

/** Strip markdown fences and parse the model's JSON answer (tolerant). */
export function parseAnalysisJson(raw: string): QualitativeAnalysis {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    // If there's a clean closing brace use the tight slice; otherwise (truncated,
    // no closing brace) hand the whole tail to the salvage routine.
    const candidate = start === -1 ? "" : end > start ? s.slice(start, end + 1) : s.slice(start);
    if (!candidate) throw new Error("La respuesta del modelo no contiene JSON");
    const obj = salvageJson(candidate) as QualitativeAnalysis;
    // Minimal shape guard — summary is the first field, so even a truncated
    // response should have it. Everything else we default rather than throw.
    if (typeof obj.summary !== "string") {
        throw new Error("JSON con esquema inesperado");
    }
    obj.qualitativeScore = Math.max(0, Math.min(100, Number(obj.qualitativeScore) || 0));
    obj.catalysts = Array.isArray(obj.catalysts) ? obj.catalysts : [];
    obj.risks = Array.isArray(obj.risks) ? obj.risks : [];
    obj.governanceFlags = Array.isArray(obj.governanceFlags) ? obj.governanceFlags : [];
    obj.pharmaPipeline = Array.isArray(obj.pharmaPipeline) ? obj.pharmaPipeline : null;
    obj.moat = ["amplio", "estrecho", "ninguno"].includes(obj.moat) ? obj.moat : "ninguno";
    if (typeof obj.verdict !== "string") obj.verdict = "";
    // Narrative layer
    obj.narrativeScore = Math.max(0, Math.min(100, Number(obj.narrativeScore) || 0));
    obj.narrativeShift = obj.narrativeShift && typeof obj.narrativeShift.from === "string" && typeof obj.narrativeShift.to === "string"
        ? { from: obj.narrativeShift.from, to: obj.narrativeShift.to }
        : null;
    obj.baselineNarrative = Array.isArray(obj.baselineNarrative) ? obj.baselineNarrative : [];
    obj.recentNarrative = Array.isArray(obj.recentNarrative) ? obj.recentNarrative : [];
    return obj;
}

// ── Crypto qualitative layer ─────────────────────────────────

export interface CryptoQualitative {
    summary: string;
    techExplanation: string;     // concrete technology, in plain language
    useCase: string;             // the real problem it solves
    roadmap: QualitativeCatalyst[];
    risks: QualitativeRisk[];
    moat: "amplio" | "estrecho" | "ninguno";
    competitors: string[];
    qualitativeScore: number;
    verdict: string;

    // Narrative layer — grounded on recent news headlines
    narrativeScore: number;
    narrativeShift: { from: string; to: string } | null;
    baselineNarrative: string[];
    recentNarrative: string[];
}

/** Parse the model's crypto JSON answer (tolerant, like the stock one). */
export function parseCryptoAnalysisJson(raw: string): CryptoQualitative {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) s = fence[1].trim();
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    const candidate = start === -1 ? "" : end > start ? s.slice(start, end + 1) : s.slice(start);
    if (!candidate) throw new Error("La respuesta del modelo no contiene JSON");
    const obj = salvageJson(candidate) as CryptoQualitative;
    if (typeof obj.summary !== "string") throw new Error("JSON con esquema inesperado");
    obj.techExplanation = typeof obj.techExplanation === "string" ? obj.techExplanation : "";
    obj.useCase = typeof obj.useCase === "string" ? obj.useCase : "";
    obj.roadmap = Array.isArray(obj.roadmap) ? obj.roadmap : [];
    obj.risks = Array.isArray(obj.risks) ? obj.risks : [];
    obj.competitors = Array.isArray(obj.competitors) ? obj.competitors : [];
    obj.moat = ["amplio", "estrecho", "ninguno"].includes(obj.moat) ? obj.moat : "ninguno";
    obj.qualitativeScore = Math.max(0, Math.min(100, Number(obj.qualitativeScore) || 0));
    if (typeof obj.verdict !== "string") obj.verdict = "";
    obj.narrativeScore = Math.max(0, Math.min(100, Number(obj.narrativeScore) || 0));
    obj.narrativeShift = obj.narrativeShift && typeof obj.narrativeShift.from === "string" && typeof obj.narrativeShift.to === "string"
        ? { from: obj.narrativeShift.from, to: obj.narrativeShift.to }
        : null;
    obj.baselineNarrative = Array.isArray(obj.baselineNarrative) ? obj.baselineNarrative : [];
    obj.recentNarrative = Array.isArray(obj.recentNarrative) ? obj.recentNarrative : [];
    return obj;
}

/** Build the grounded Spanish prompt for a crypto asset's qualitative layer. */
export function buildCryptoAnalysisPrompt(input: {
    name: string;
    symbol: string;
    categories: string;
    description: string;
    quantSummary: string;
    news?: string;
}): string {
    const newsBlock = input.news && input.news.trim()
        ? `\nTITULARES RECIENTES (úsalos para la NARRATIVA; no inventes otros):\n${input.news}\n`
        : `\n(No hay titulares recientes disponibles — basa la narrativa en tu conocimiento y márcala como menos fiable.)\n`;

    return `Eres un analista cripto fundamental, técnico y escéptico. Analizas tecnología y tokenomics, NO precio.

ACTIVO: ${input.name} (${input.symbol}) · Categorías: ${input.categories}
DESCRIPCIÓN DEL PROYECTO (su propia web):
${input.description.slice(0, 1200)}

DATOS CUANTITATIVOS YA CALCULADOS (no los repitas, úsalos de contexto):
${input.quantSummary}
${newsBlock}
Tu trabajo es la capa CUALITATIVA que los datos no capturan. El usuario es un inversor que busca señales fundamentales en un mercado muy especulativo. NO quiere opiniones de trader.

REGLAS DE HONESTIDAD (críticas):
- PROHIBIDO predecir precio, dar precios objetivo, o decir "subirá/bajará". Si lo haces, fallas.
- Tu conocimiento tiene fecha de corte: si un hito/fecha puede haber cambiado, marca "verify": true.
- NO inventes fechas, partnerships ni titulares. La narrativa debe apoyarse en los titulares dados.
- Si no conoces el proyecto con detalle, dilo en summary y devuelve listas cortas con qualitativeScore ~50.

Cubre:
- Tecnología CONCRETA explicada en lenguaje claro (consenso, arquitectura, qué la diferencia de verdad).
- Caso de uso real: ¿qué problema resuelve y quién lo usa hoy?
- Roadmap/catalizadores prácticos próximos (mainnet, upgrades, integraciones).
- Riesgos: desbloqueos/vesting de VCs, centralización, gobernanza, dependencia de un equipo, competencia.
- Foso (moat) y competidores directos.
- NARRATIVA dominante: a partir de los titulares y tu conocimiento, resume cuál ERA la narrativa de base y en qué se está convirtiendo AHORA, el giro ("Neutral → Positiva", etc.) y un narrativeScore 0-100 (100 = narrativa fuertemente positiva y con momentum).

Devuelve EXCLUSIVAMENTE un JSON válido (sin texto fuera del JSON) con este esquema:
{
  "summary": "tesis cualitativa en 2-3 frases",
  "techExplanation": "la tecnología explicada en claro, 3-5 frases",
  "useCase": "problema real que resuelve y adopción actual, 2-3 frases",
  "roadmap": [{"title": "...", "timeframe": "Q3 2026 | fecha desconocida", "impact": "alto|medio|bajo", "type": "regulatorio|corporativo|producto|macro|otro", "verify": true|false}],
  "risks": [{"title": "...", "severity": "alto|medio|bajo"}],
  "competitors": ["..."],
  "moat": "amplio|estrecho|ninguno",
  "qualitativeScore": 0-100,
  "narrativeScore": 0-100,
  "narrativeShift": {"from": "Neutral", "to": "Positiva"},
  "baselineNarrative": ["qué se decía antes, 2-3 viñetas"],
  "recentNarrative": ["qué se dice ahora, 2-3 viñetas"],
  "verdict": "conclusión cualitativa, escéptica y accionable, SIN hablar de precio"
}`;
}

/** Build the grounded Spanish prompt for a company's qualitative layer. */
export function buildAnalysisPrompt(input: {
    ticker: string;
    name: string;
    sector: string;
    description: string;
    quantSummary: string;
    news?: string;        // recent headlines, one per line (may be empty)
}): string {
    const today = new Date().toISOString().split("T")[0];
    const newsBlock = input.news && input.news.trim()
        ? `\nTITULARES RECIENTES (úsalos para la NARRATIVA; no inventes otros):\n${input.news}\n`
        : `\n(No hay titulares recientes disponibles — basa la narrativa en tu conocimiento y márcala como menos fiable.)\n`;

    return `Eres un analista fundamental escéptico y conciso. Hoy es ${today}.

EMPRESA: ${input.name} (${input.ticker}) · Sector: ${input.sector}
DESCRIPCIÓN: ${input.description.slice(0, 600)}

DATOS CUANTITATIVOS YA CALCULADOS (no los repitas, úsalos como contexto):
${input.quantSummary}
${newsBlock}
Tu trabajo es la capa CUALITATIVA que las APIs financieras no capturan:
- Catalizadores próximos (~12 meses): decisiones regulatorias (FDA/EMA/CE si es farma/biotech), juicios o arbitrajes, posibles ventas de divisiones o M&A, refinanciaciones, cambios de guidance, lanzamientos de producto, juntas relevantes.
- Riesgos cualitativos: gobernanza (estructura accionarial, operaciones vinculadas), ataques de bajistas (p.ej. informes tipo Gotham/Hindenburg), dependencia de clientes/proveedores, riesgo regulatorio o político.
- Si es farmacéutica/biotech: pipeline con fases y próximos hitos regulatorios conocidos.
- Foso competitivo (moat).
- NARRATIVA dominante: a partir de los titulares y tu conocimiento, resume cuál ERA la narrativa de base (baselineNarrative) y en qué se está convirtiendo AHORA (recentNarrative), el giro ("Neutral → Positiva", etc.) y un narrativeScore 0-100 donde 100 = narrativa fuertemente positiva y con momentum.

REGLAS DE HONESTIDAD (críticas):
- Tu conocimiento tiene fecha de corte: si una fecha o estado puede haber cambiado, marca el ítem con "verify": true y usa expresiones como "verificar".
- NO inventes fechas, titulares ni hitos. Mejor "fecha desconocida" que una fecha inventada.
- La narrativa debe apoyarse en los titulares dados; no inventes noticias.
- Si no conoces la empresa con suficiente detalle, dilo en summary y devuelve listas cortas o vacías con qualitativeScore cercano a 50.

Devuelve EXCLUSIVAMENTE un JSON válido (sin texto fuera del JSON) con este esquema:
{
  "summary": "tesis cualitativa en 2-3 frases",
  "catalysts": [{"title": "...", "timeframe": "Q3 2026 | H1 2027 | fecha desconocida", "impact": "alto|medio|bajo", "type": "regulatorio|corporativo|producto|macro|otro", "verify": true|false}],
  "risks": [{"title": "...", "severity": "alto|medio|bajo"}],
  "pharmaPipeline": [{"asset": "...", "stage": "...", "note": "..."}] o null si no aplica,
  "governanceFlags": ["..."],
  "moat": "amplio|estrecho|ninguno",
  "qualitativeScore": 0-100,
  "narrativeScore": 0-100,
  "narrativeShift": {"from": "Neutral", "to": "Positiva"},
  "baselineNarrative": ["qué se decía antes, 2-3 viñetas"],
  "recentNarrative": ["qué se dice ahora, 2-3 viñetas"],
  "verdict": "conclusión cualitativa en 2-3 frases, escéptica y accionable"
}`;
}
