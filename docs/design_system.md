# Astro Trader Insights — Design System

> Guía visual de referencia: paleta de colores, tipografía, componentes, espaciado y convenciones de diseño.
> Última actualización: 2026-04-05.

---

## 1. Filosofía de diseño

- **Dark-first premium**: Fondo zinc-950 (#09090b) con superficies escalonadas
- **Glassmorphism sutil**: Paneles con `backdrop-filter: blur(12px)` y bordes translúcidos
- **Datos sobre decoración**: Diseño denso de información financiera con jerarquía tipográfica clara
- **Acento por significado**: Cada color tiene un propósito semántico (señal, urgencia, categoría)
- **Micro-animaciones**: Framer Motion para transiciones entre paneles y estados

---

## 2. Paleta de colores

### 2.1 Superficies

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--bg-primary` | `#09090b` | Fondo principal (zinc-950) |
| `--bg-secondary` | `#18181b` | Paneles elevados (zinc-900) |
| `--bg-tertiary` | `#27272a` | Controles, inputs, separadores (zinc-800) |
| `--bg-card` | `#1c1c22` | Cards de empresas y paneles |
| `--bg-card-hover` | `#242430` | Estado hover de cards |

```
Jerarquía de profundidad:
──────────────────────────────────────
 bg-primary → bg-secondary → bg-tertiary
 #09090b      #18181b         #27272a
──────────────────────────────────────
```

### 2.2 Texto

| Token CSS | Hex | Tailwind equiv. | Uso |
|-----------|-----|-----------------|-----|
| `--text-primary` | `#fafafa` | zinc-50 | Títulos, valores numéricos |
| `--text-secondary` | `#a1a1aa` | zinc-400 | Labels, texto descriptivo |
| `--text-muted` | `#71717a` | zinc-500 | Metadata, timestamps, hints |

### 2.3 Acentos

| Token CSS | Hex (bright) | Hex (dim) | Uso principal |
|-----------|-------------|-----------|---------------|
| `--accent-cyan` | `#22d3ee` | `#0891b2` | Señal BUY, links principales, sliders |
| `--accent-emerald` | `#34d399` | `#059669` | Señal STRONG_BUY, métricas positivas |
| `--accent-violet` | `#a78bfa` | `#7c3aed` | Categorías macro, astrología |
| `--accent-amber` | `#fbbf24` | `#d97706` | Señal HOLD, warnings, atención |
| `--accent-rose` | `#fb7185` | `#e11d48` | Señal AVOID, errores, tendencias negativas |

### 2.4 Señales de inversión

| Token CSS | Hex | Badge class | Cuándo |
|-----------|-----|-------------|--------|
| `--signal-strong-buy` | `#34d399` | `.badge-strong-buy` | Score ≥ 75 |
| `--signal-buy` | `#22d3ee` | `.badge-buy` | Score ≥ 55 |
| `--signal-hold` | `#fbbf24` | `.badge-hold` | Score ≥ 35 |
| `--signal-avoid` | `#fb7185` | `.badge-avoid` | Score < 35 |

**Patrón de badge**: Fondo al 12% de opacidad + texto en color vivo + borde al 20% de opacidad.

```css
/* Ejemplo: badge-strong-buy */
background: rgba(52, 211, 153, 0.12);
color: #34d399;
border: 1px solid rgba(52, 211, 153, 0.2);
```

### 2.5 Bordes y vidrio

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `--border-subtle` | `rgba(255,255,255,0.06)` | Bordes por defecto de cards |
| `--border-active` | `rgba(255,255,255,0.12)` | Bordes activos/hover |
| `--glass-bg` | `rgba(255,255,255,0.03)` | Fondo glass |
| `--glass-border` | `rgba(255,255,255,0.08)` | Borde glass |

### 2.6 Sombras y glows

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `--shadow-card` | `0 4px 24px rgba(0,0,0,0.4)` | Elevación de cards |
| `--shadow-glow-cyan` | `0 0 20px rgba(34,211,238,0.15)` | Glow en elementos cyan activos |
| `--shadow-glow-emerald` | `0 0 20px rgba(52,211,153,0.15)` | Glow en elementos emerald activos |

---

## 3. Tipografía

### 3.1 Fuentes

| Familia | Variable CSS | Uso |
|---------|-------------|-----|
| **Inter** | `--font-sans` | Todo el texto (UI, labels, párrafos) |
| **JetBrains Mono** | `--font-mono` | Tickers, números, código, precios |

Cargadas via `next/font/google` en `layout.tsx`.

### 3.2 Escala tipográfica usada

| Tamaño | Uso |
|--------|-----|
| `text-[10px]` | Tags, badges, meta mínima |
| `text-xs` (12px) | Subtext, fechas, labels secundarios |
| `text-sm` (14px) | Texto principal de UI, métricas |
| `text-base` (16px) | — (rara vez usado) |
| `text-lg` / `text-xl` | Títulos de secciones |
| `text-3xl` / `text-4xl` | Scores, precios destacados, banderas |

### 3.3 Pesos

| Peso | Uso |
|------|-----|
| `font-normal` (400) | Texto descriptivo |
| `font-medium` (500) | Labels, nombres de empresas |
| `font-semibold` (600) | Scores, acciones del sidebar |
| `font-bold` (700) | Títulos de sección, valores destacados |
| `font-mono` | Tickers, precios, porcentajes |

---

## 4. Espaciado y radios

### 4.1 Border Radius

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `--radius-sm` | `6px` | Badges, pequeños inputs |
| `--radius-md` | `10px` | Botones, tags |
| `--radius-lg` | `16px` | Cards, paneles de sección |
| `--radius-xl` | `20px` | Paneles modales, cards grandes |

### 4.2 Espaciado común

| Patrón | Tailwind | Uso |
|--------|----------|-----|
| `p-3` / `p-4` | 12/16px | Padding interior de cards |
| `p-5` | 20px | Cards de mercado grandes |
| `gap-2` / `gap-3` | 8/12px | Espaciado entre elementos inline |
| `gap-4` / `gap-6` | 16/24px | Separación entre secciones |
| `mb-3` / `mb-4` | 12/16px | Margen inferior de headings |

---

## 5. Componentes base

### 5.1 Glass Card

```css
.glass-card {
  background: var(--glass-bg);           /* rgba(255,255,255,0.03) */
  border: 1px solid var(--glass-border); /* rgba(255,255,255,0.08) */
  border-radius: var(--radius-lg);       /* 16px */
  backdrop-filter: blur(12px);
}
```

Uso: Paneles principales, secciones de overview, modales.

### 5.2 Gradient Border

```css
.gradient-border::before {
  background: linear-gradient(
    135deg,
    rgba(34, 211, 238, 0.3),   /* cyan */
    rgba(168, 85, 247, 0.3),   /* violet */
    rgba(251, 191, 36, 0.1)    /* amber */
  );
}
```

Uso: Cards de alto valor, paneles de detalle enriquecido.

### 5.3 Score Ring (SVG)

Componente SVG circular (`ScoreRing.tsx`) que renderiza un arco coloreado proporcionalmente al score (0–100). Colores dinámicos:
- ≥ 75 → emerald
- ≥ 55 → cyan
- ≥ 35 → amber
- < 35 → rose

### 5.4 Signal Badges

Clases: `.badge-strong-buy`, `.badge-buy`, `.badge-hold`, `.badge-avoid`

Formato: `rounded-full px-2 py-0.5 text-[10px] font-semibold`

### 5.5 Custom Scrollbar

```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);  /* #27272a */
  border-radius: 3px;
}
```

### 5.6 Range Slider

- **Thumb**: Disco cyan (`--accent-cyan`) de 18px con glow
- **Track**: 4px de alto, color `--bg-tertiary`
- **Hover**: Scale 1.2x + glow intensificado

---

## 6. Animaciones

### 6.1 CSS Animations

| Nombre | Efecto | Uso |
|--------|--------|-----|
| `pulse-glow` | Opacidad 0.4 → 1.0 → 0.4 | Indicadores live/pulsantes |
| `fade-in-up` | Opacity 0 + Y +12px → normal | Entrada de cards y paneles |

### 6.2 Framer Motion

| Patrón | Props | Uso |
|--------|-------|-----|
| Entrada de card | `{opacity: 0, y: 20} → {1, 0}` | Items de listas |
| Hover flotante | `whileHover: {scale: 1.03, y: -4}` | Cards clicables |
| Press | `whileTap: {scale: 0.98}` | Feedback táctil |
| Panel deslizante | `AnimatePresence` + layout | Panel de detalle lateral |
| Stagger | `transition: {delay: index * 0.05}` | Grids de cards |

---

## 7. Convenciones de charts (ECharts)

### 7.1 Paleta de series

| Variable | Color | Serie |
|----------|-------|-------|
| Primary line | `#22d3ee` (cyan) | S&P 500, EBIT Margin, precio principal |
| Secondary line | `#a78bfa` (violet) | BTC, Gross Margin |
| Tertiary line | `#fbbf24` (amber) | Gold, Turbulence |
| Quaternary line | `#34d399` (emerald) | Nasdaq, ROE |
| Alert area | `rgba(251,113,133,0.08)` (rose) | Zonas Mercury Rx |
| Calm zone | `rgba(52,211,153,0.05)` (emerald) | Zonas fluidity |

### 7.2 Config base

```javascript
{
  backgroundColor: "transparent",
  textStyle: { color: "#a1a1aa", fontFamily: "Inter" },
  grid: { top: 60, right: 20, bottom: 60, left: 60 },
  tooltip: {
    backgroundColor: "#1c1c22",
    borderColor: "rgba(255,255,255,0.08)",
    textStyle: { color: "#fafafa", fontSize: 12 },
  },
  legend: { textStyle: { color: "#71717a" } },
  xAxis: {
    axisLine: { lineStyle: { color: "#27272a" } },
    axisLabel: { color: "#71717a" },
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
  },
}
```

---

## 8. Iconografía

Toda la iconografía proviene de **Lucide React**. Tamaños estándar:

| Tamaño | `size` | Uso |
|--------|--------|-----|
| Micro | 12px | Inline con texto xs |
| Small | 14px | Sidebar items, badges |
| Default | 16px | Botones de acción |
| Medium | 20px | Headers, CTAs |
| Large | 24px+ | Hero sections |

---

## 9. Layout general

### 9.1 Sidebar

| Propiedad | Valor |
|-----------|-------|
| Ancho (collapsed) | 72px |
| Ancho (macro expanded) | 252px (72 + 180) |
| Posición | Fixed left |
| Fondo | `--bg-secondary` (#18181b) |
| Borde derecho | `--border-subtle` |

### 9.2 Content area

| Sección | margin-left |
|---------|-------------|
| Macro Hub (con sub-nav) | 252px |
| Explorer, Screener, Wiki | 72px |
| Detail Panel (overlay) | Fixed right, width ~40% |

### 9.3 Grid de cards (Explorer)

- Layout: CSS Grid responsive
- Columnas: `repeat(auto-fill, minmax(280px, 1fr))`
- Gap: 16px
- Card height: Auto (contenido determina)

---

## 10. Paleta semántica resumen

```
┌─────────────────────────────────────────────────────┐
│                PALETA ASTRO TRADER                   │
│                                                     │
│  Fondos      ████ #09090b  ████ #18181b  ████ #27272a │
│                                                     │
│  Texto       ████ #fafafa  ████ #a1a1aa  ████ #71717a │
│                                                     │
│  Señales     ████ #34d399  ████ #22d3ee  ████ #fbbf24  ████ #fb7185 │
│              STRONG_BUY    BUY          HOLD        AVOID            │
│                                                     │
│  Acentos     ████ #a78bfa  ████ #0891b2  ████ #d97706  ████ #e11d48 │
│              Violet(dim)  Cyan(dim)    Amber(dim)  Rose(dim)         │
│                                                     │
│  Vidrio      ░░░░ 3% white bg  ░░░░ 6% border  ░░░░ 8% glass │
└─────────────────────────────────────────────────────┘
```
