# Civilization Evolution Simulator

[简体中文](./README.md) | **English**

**Live demo: <https://civilization-evolution-simulator.vercel.app/>** — no installation required.

A god-view civilization simulation console. The era starts from the **contemporary information society of 2026 AD**, and multiple
civilization bodies evolve on their own, driven by five dimensions: **Morality (德), Intellect (智), Physique (体), Aesthetics (美) and Labor (劳)**.
At any time you can issue an "Oracle" to adjust the five dimensions and population, inspect the legal systems and moral constraints that
spontaneously emerged during evolution, and rewrite them.

Civilization has **no ceiling and no victory condition**: you can push forward from the information age to a planetary civilization, a
star-system civilization, a galactic civilization, and finally to a galactic-empire-style unified polity, then into an "Transcendent Layer · Ω-n"
extrapolated by formula, where the K value (Kardashev index) and the years-per-tick keep growing.

## Feature Overview

| Feature | Description |
| --- | --- |
| Unbounded evolution | The civilization index `civIndex` is a continuous, uncapped floating-point value; stages are merely buckets over it, and beyond the preset ladder `deriveStage(index)` keeps extrapolating stage names and effect parameters by formula |
| Spontaneous emergence | Laws and morals emerge and upgrade in stages based on `year + stage + civIndex + each tribe's five dimensions + technology + happiness + triggered events` |
| Pure-function institution layer | `projectEffects(world, tribe)` is a pure function shared by both the UI preview and the engine, so **the estimate shown on the panel is exactly what happens in the next tick** |
| Deterministic & reproducible | `mulberry32 + seed`: the same seed with the same intervention and edit sequence reproduces the exact same run |
| Numerically stable | All magnitude-type quantities are computed in the log10 domain, structurally ruling out `Infinity` and `NaN` |
| Zero backend | A pure front-end SPA; state lives in memory plus `localStorage` — no network requests, no accounts, no telemetry |

## Prerequisites

- **Node.js ≥ 18** (required by Vite 5; Node 20 or 22 LTS recommended)
- npm (installed together with Node)

Check your versions:

```bash
node -v
npm -v
```

## Quick Start

```bash
git clone https://github.com/WeiRunting/Civilization-Evolution-Simulator.git
cd Civilization-Evolution-Simulator
npm ci          # exact install from package-lock.json (npm install also works)
npm run dev     # start the dev server
```

Open the address printed in the terminal (default: <http://localhost:5173>) and start simulating.

Alternatively, use `Code → Download ZIP` on the repository page, extract the archive, and start from the `npm ci` step above.

## All Scripts

| Command | Purpose | Output / URL |
| --- | --- | --- |
| `npm run dev` | Start the dev server (hot reload) | <http://localhost:5173> |
| `npm run build` | Type-check with `tsc -b`, then `vite build` | `dist/` |
| `npm run preview` | Preview the production build locally | <http://localhost:4173> |
| `npm test` | Run the Vitest engine unit tests once | Test results |
| `npm run test:watch` | Unit tests in watch mode | Re-runs on file changes |
| `npm run lint` | ESLint check | List of issues |

> `vite.config.ts` already sets `host: '0.0.0.0'` and `allowedHosts: true`, so the dev server also prints a `Network:` address.
> Phones and tablets on the same LAN can open it directly (Windows Firewall may prompt once — choose "Allow").

## FAQ

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ETARGET ... No matching version found for zustand@^5.0.15` | Some regional npm mirrors lag behind in syncing | Run `npm config set registry https://registry.npmjs.org`, then reinstall |
| `npm ci` complains the lockfile and `package.json` are out of sync | Dependencies changed without updating the lockfile | Use `npm install` instead, and commit the updated `package-lock.json` |
| Port 5173 already in use | Another dev server is still running | `npm run dev -- --port 5174` |
| `npm run dev` works but `npm run build` reports type errors | Dev mode skips type checking; only `tsc -b` inside `build` checks types | Fix the reported types — it does not affect the dev preview |
| PowerShell says "cannot be loaded because running scripts is disabled … npm.ps1" | Script execution policy restriction | Use `npm.cmd run dev`, or run `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `node_modules` is roughly 230 MB after install | Full React + Vite + Vitest + ESLint dependency tree | This is normal; `npm cache clean --force` frees the npm download cache |

## Deployment

The `dist/` folder produced by `npm run build` contains **pure static files** and can be hosted anywhere.

- **Vercel**: import the repository, it auto-detects Vite. Build Command `npm run build`, Output Directory `dist` — zero config.
  This project is deployed there: <https://civilization-evolution-simulator.vercel.app/>. Every push to `main` rebuilds and redeploys it automatically.
  Note: `*.vercel.app` access can be unreliable in mainland China; bind a custom domain if you need stable access.
- **Netlify**: same as above, with publish directory `dist`.
- **GitHub Pages**: add `base: '/Civilization-Evolution-Simulator/'` to `vite.config.ts` (otherwise `/assets/*` will 404), then publish via a Pages branch or an Actions workflow.
- **Your own server / Nginx**: copy the contents of `dist/` to the site root. Since it is a single-page app, configure a fallback to `index.html`.

## The Five Dimensions

| Key | Dimension | Role in the equations |
| --- | --- | --- |
| `de` | Morality | Suppresses crime and revolt risk, improves moral internalization efficiency, reduces inter-tribe conflict tendencies |
| `zhi` | Intellect | Drives technology and innovation indices, shortens the cognitive threshold required for institutions to emerge |
| `ti` | Physique | Raises population carrying capacity and food output, lowers mortality |
| `mei` | Aesthetics | Raises the happiness index and cultural identity, relieves separatist tension |
| `lao` | Labor | Raises organizational efficiency, colonization success rate and the upper bound of enforcement |

Each dimension ranges from **0–100**. When a dimension reaches 100 and the stage and technology conditions are met, an **ascension (transcendence)** triggers:
that dimension is permanently preserved as a "legacy bonus", the overall multiplier is amplified once exponentially, and the value falls back to the baseline range —
so the pleasant 0–100 slider stays meaningful forever in an unbounded run.

## Civilization Stages and Time Scale

The civilization index `civIndex` is a **continuous, uncapped** floating-point number, composed by weighting technology, population magnitude,
colony magnitude, territory magnitude, the composite five-dimension score, ascension layers and the institution stock. Stages are only its bucket mapping.
Beyond the preset ladder, `deriveStage(index)` keeps generating stage names and effect parameters by formula.

| Stage | Name | K value | Years per step | civIndex threshold |
| --- | --- | --- | --- | --- |
| 0 | Contemporary · Information Era | 0.73 | 1 year | 0 |
| 1 | Near Future · Intelligence Era | 0.79 | 2 years | 44 |
| 2 | Planetary Civilization | 1.02 | 5 years | 56 |
| 3 | Star-System Civilization | 1.86 | 15 years | 68 |
| 4 | Interstellar Civilization | 2.31 | 40 years | 78 |
| 5 | Galactic Civilization | 2.94 | 150 years | 88 |
| 6 | Galactic Empire | 3.05 | 600 years | 97 |
| 7 | Transcendent Layer | 3.28 | 2500 years | 112 |
| 8+ | Transcendent Layer · Ω-n | 3.28 + 0.36n | 2500 × 5ⁿ (cap 5×10⁸) | Increasing by formula |

**Adaptive time scale**: the time consoles at the top and bottom of the UI always show "1 step = N years". All rates inside the engine (birth, death,
lifespan, technology, colonization) are converted by `yearsPerTick`, so advancing across scales never scrambles the numbers. `1x / 2x / 5x` only affect
"ticks per second" and are orthogonal to the years per step; the "single step" button always means "advance exactly 1 tick".

## Gameplay

- **Overview**: world summary metric cards, the civilization level ladder with progress to the next stage, a five-dimension radar chart, an individual
  dot-matrix plot, and historical trend line charts.
- **Territory**: a Canvas star map showing colony distribution, territory radius, trade routes and conflict hotspots; faction cards compare the size of
  each civilization body; the expansion console offers three miracles — "accelerate colonization / contract the defense line / build a relay" — with
  predicted success rates and backlash risk.
- **Divine Code**: two tabs for legal systems and moral constraints, with filtering by stage and category, search, enable/disable, rewriting and deletion.
  Entering the galactic era unlocks the gold-outlined "Galactic Codex" section; the "Evolution Timeline" drawer shows when and why each institution emerged,
  when it was revised by an Oracle, and supports side-by-side comparison of two institutions.
- **Chronicle**: an event waterfall filterable by type, with a year input (large-number units such as "120000" are supported) for quick scroll positioning.

**Oracle interventions** only affect the future: the history arrays are append-only, so curves already drawn never warp retroactively because of a tuning change.

## Institution Parameters

Institutions are first-class citizens that enter the evolution equations through **effect projection**. `projectEffects(world, tribe)` is a pure function
that outputs coefficients such as `crimeRate / revoltRisk / innovation / fertility / happiness / dimDrift / conflictDelta / divergenceTension`,
which `equations.ts` consumes every tick. The "estimated influence" shown in the UI reuses the very same pure function (`compareEffects`),
so **the estimate on the panel is exactly what happens in the next tick**.

- **Laws (LawItem)**
  - `category`: Criminal / Civil / Economic / Religious / Military / Customary — determines the base scope of the article.
  - `strictness`: how hard crime and unrest are suppressed. Exceeding the tolerable range for that category **raises revolt risk** — harsh punishment lowers crime but costs stability.
  - `enforcement`: whether the article is actually implemented. With a low enforcement rate, even the harshest law is just words on paper.
  - `scope`: `'all'` means all civilization bodies, or an array of specific tribe ids.
  - `customByGod`: articles rewritten by an Oracle are flagged and will not be automatically phased out by the institution layer.
- **Morals (MoralItem)**
  - `bindDim`: bound to a dimension (continuously producing a drift push on it) or `'conflict'` (suppressing inter-tribe conflict).
  - `strength`: the magnitude of the push.
  - `prevalence`: norms below 50% prevalence are rendered with a dashed style, and their actual push on the five dimensions decays proportionally.

Institutions **emerge on their own and upgrade in stages** as the civilization level rises (AI ethics law, gene-editing regulations, extraterrestrial
resource law, colonial charter, interstellar warfare law, Galactic Codex, robotic laws, psychohistory supervision, and more). The emergence conditions are
centralized in the rule table in `src/sim/emergence.ts`, keyed on `year + stage + civIndex + each tribe's five dimensions + technology + happiness + triggered events`.

## Project Structure

Three cleanly separated layers — "pure-function simulation engine / Zustand bridge / React view layer". The engine has zero React dependencies, which makes
unit testing and replay easy.

```
src/
├── sim/           # Pure TS simulation engine (22 .ts files)
│   ├── engine.ts / equations.ts / dims.ts        # Main loop, evolution equations, five-dimension dynamics
│   ├── expansion.ts / institutions.ts            # Colonial expansion, institution system
│   ├── institutionStep.ts / emergence.ts         # Per-step institution advance, emergence rule table
│   ├── events.ts / stages.ts / world.ts          # Events, stage mapping, world state
│   ├── agents.ts / presets.ts / config.ts        # Individual dot matrix, initial presets, constants
│   ├── num.ts / log.ts / rng.ts / types.ts       # log10 numeric helpers, formatting, deterministic RNG, types
│   ├── pools/                                    # Object pools (to reduce GC pressure)
│   └── __tests__/                                # Engine and institution system unit tests
├── store/         # Zustand store and localStorage saves (with a version field for migration)
├── hooks/         # useSimLoop (rAF accumulator main loop), useElementSize (ResizeObserver)
├── components/    # View layer (26 .tsx files in 10 subdirectories)
│   └── layout / overview / charts / tribes / controls
│       institutions / chronicle / galaxy / milestones / ui
├── utils/         # Big-number formatting, pure institution math reuse, color conversion
├── App.tsx        # App shell and panel routing
├── main.tsx       # Entry point
└── index.css      # Tailwind entry and global styles
```

## Tech Stack

| Layer | Choice |
| --- | --- |
| View | React 18 + TypeScript |
| State | Zustand 5 (`localStorage` persistence + version migration) |
| Build | Vite 5 |
| Styling | Tailwind CSS 3.4, tailwind-merge, tailwindcss-animate |
| Charts | Recharts 2, native Canvas star map |
| Icons | lucide-react, react-icons |
| Testing | Vitest 2 |
| Linting | ESLint 9 + typescript-eslint |

## Core Mechanics

**Numerical stability**: at galactic-empire scale the population exceeds 10¹⁸, far beyond the JS safe-integer limit. Population, colonies, fleets and other
magnitude-type metrics are therefore stored and computed in the **log10 domain** (addition becomes log-add, multiplication becomes exponent addition), and
only formatted into big-number units at display time (万 / 亿 / 万亿 / 京 / 垓 / 秭…, falling back to `10^n`). All growth terms use a log-saturating form, which
structurally rules out `Infinity` and `NaN`. Tests cover "100,000 years of large-step simulation produces no NaN, and the history buffer stays under its cap".

**Determinism**: `mulberry32 + seed` guarantees that "same seed + same intervention sequence + same edit sequence" is fully reproducible; the rAF accumulator
executes at most 8 ticks per frame.

**Saving**: `localStorage` save/load, with the option to reset and start a new civilization at any time. A corrupted save goes through field validation and
default fallbacks, so it never blocks startup.

## License

This repository currently **does not include a LICENSE file**. For redistribution, derivative work or commercial use, please contact the author first.
