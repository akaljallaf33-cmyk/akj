# Well Intervention 2026 Dashboard — Design Brainstorm

## Context
A top-management-facing dashboard for tracking Coiled Tubing, Wireline, and Pumping well intervention jobs across 2026. Needs to convey authority, precision, and clarity. The audience is senior leadership in the oil & gas sector.

---

<response>
<probability>0.07</probability>
<idea>

## Option A: Industrial Command Center

**Design Movement:** Industrial Brutalism meets Petroleum Engineering Aesthetics

**Core Principles:**
1. Raw data density — every pixel earns its place; no decorative fluff
2. High-contrast monochrome base with single amber/orange accent (petroleum amber)
3. Structured asymmetry — sidebar-anchored layout with data-dense panels
4. Military-grade readability — tabular data is the hero

**Color Philosophy:**
- Background: Deep charcoal (#0F1117) — evokes control room environments
- Surface: Slate (#1A1D27) — subtle elevation without softness
- Accent: Petroleum Amber (#E8A020) — references crude oil, signals importance
- Positive uplift: Muted green (#4CAF50)
- Negative/loss: Muted red (#EF5350)
- Text: Off-white (#E8E8E8) for primary, steel grey for secondary

**Layout Paradigm:**
- Fixed left sidebar with service line navigation (CT / Wireline / Pumping)
- Top strip: KPI ticker bar (total jobs, avg uplift, monthly delta)
- Main area: Full-width data table with inline sparklines
- Right panel: Collapsible chart drawer

**Signature Elements:**
1. Horizontal rule dividers with amber dot markers
2. Monospace font for all numeric data (Roboto Mono)
3. Subtle grid overlay on chart backgrounds (engineering graph paper aesthetic)

**Interaction Philosophy:**
Interactions are purposeful and immediate — no playful animations. Hover reveals data tooltips. Row selection highlights the full well record.

**Animation:**
- Table rows slide in from left on tab switch (100ms stagger)
- KPI numbers count up on load
- Chart bars grow from baseline

**Typography System:**
- Display: Space Grotesk Bold — for section headers and KPI values
- Body: Inter Regular — for labels and descriptions
- Data: Roboto Mono — for all numeric values and well IDs

</idea>
</response>

<response>
<probability>0.06</probability>
<idea>

## Option B: Executive Intelligence Platform

**Design Movement:** Corporate Minimalism with Data Journalism Influence

**Core Principles:**
1. Generous whitespace — data breathes; hierarchy is established through space, not decoration
2. Typographic hierarchy as the primary visual language
3. Restrained color — navy and slate with a single teal accent
4. Card-based modular layout that scales gracefully

**Color Philosophy:**
- Background: Warm off-white (#F8F7F4) — premium paper feel, not clinical white
- Cards: Pure white with soft shadow — elevation through shadow depth
- Primary accent: Deep Navy (#1B3A6B) — authority, trust, petroleum industry standard
- Secondary accent: Teal (#0D9488) — modern, data-forward
- Positive: Forest green (#16A34A)
- Negative: Crimson (#DC2626)
- Text: Near-black (#1C1C1E) for headings, slate for body

**Layout Paradigm:**
- Top navigation bar with service line tabs (CT / Wireline / Pumping / Overview)
- Full-width KPI summary row below nav
- Two-column layout: wide data table left, chart panel right
- Monthly impact banner pinned above the table

**Signature Elements:**
1. Thin navy top border on cards (4px accent stripe)
2. Pill-shaped status badges (Successful / Partial / Failed)
3. Subtle paper texture on background

**Interaction Philosophy:**
Calm and deliberate. Smooth tab transitions. Hover states use navy underline rather than background fill. Data entry forms slide in as side panels.

**Animation:**
- Fade + slight upward translate on page load (200ms)
- Chart lines draw from left to right
- Status badges pulse once on load

**Typography System:**
- Display: Playfair Display Bold — for page title and major KPIs
- Section headers: DM Sans SemiBold
- Body/labels: DM Sans Regular
- Data: DM Mono — for all numeric values

</idea>
</response>

<response>
<probability>0.05</probability>
<idea>

## Option C: Precision Engineering Dark Dashboard

**Design Movement:** Aerospace HUD / Subsea Control Panel Aesthetic

**Core Principles:**
1. Dark-first design — mimics subsurface monitoring environments
2. Neon accent lines on dark surfaces — precision instrument feel
3. Data visualization as the primary UI element, not tables
4. Layered depth through glassmorphism cards

**Color Philosophy:**
- Background: Very dark navy (#080E1A) — deep ocean/subsurface reference
- Glass cards: rgba(255,255,255,0.05) with backdrop blur — floating instrument panels
- Primary accent: Electric cyan (#00D4FF) — sonar/instrument readout
- Secondary: Lime green (#39FF14) — positive signal
- Warning: Amber (#FFB800)
- Danger: Red (#FF3B3B)
- Text: White primary, cyan-tinted secondary

**Layout Paradigm:**
- Full-screen dark canvas
- Horizontal tab strip for service lines
- Masonry-style card grid — KPI cards, chart cards, table card
- Floating action button for adding new job entries

**Signature Elements:**
1. Thin glowing cyan border on active cards
2. Circular gauge charts for uplift percentages
3. Animated scan line effect on chart backgrounds

**Interaction Philosophy:**
Immersive and reactive. Every interaction has a visual echo. Adding a new job entry triggers a brief "signal received" animation.

**Animation:**
- Scan line sweeps across charts every 8 seconds
- Numbers tick up with a digital counter effect
- Card entrance: scale from 0.95 + fade

**Typography System:**
- Display: Orbitron — futuristic, instrument-panel feel
- Body: Exo 2 Regular
- Data: Share Tech Mono — for numeric readouts

</idea>
</response>

---

## Selected Design: **Option B — Executive Intelligence Platform**

Chosen for its balance of authority, readability, and professional credibility. Top management audiences respond best to clean, data-forward layouts that communicate trust and precision without visual noise. The warm off-white background and navy/teal palette align with petroleum industry corporate standards while feeling modern and polished.
