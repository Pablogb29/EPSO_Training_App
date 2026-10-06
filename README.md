# EPSO Trainer

Local study tool for EPSO / CAST preparation. Active question bank comes from the CAST EPSOprep export (English). Progress is stored in the browser (`localStorage`).

## Requirements

- **Node.js** LTS (20 or 22 recommended)
- npm (comes with Node)

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## What is included

| Module | Source | Notes |
|--------|--------|-------|
| Verbal | CAST import | EN passages |
| Numerical | CAST import | Chart images |
| Abstract | CAST import | Composite diagram images |
| Digital Skills | CAST import | EN MCQs |
| EU Knowledge | CAST import | EN MCQs |
| Cybersecurity | Older generated bank | Extra module only |

Inactive legacy JSON banks remain under `src/data/questions/` but are **not** loaded in the UI.

## Modes

- **Practice** — no timer; choose 5 / 10 / 15 / 20 / 25 / 30 / all questions
- **Exam simulator** — timed random mix with presets:
  - **CAST FG III/IV** — 20 + 10 + 10 · 65 min
  - **EPSO-style full** — CAST + Digital + EU · 90 min
  - **Quick drill** — 5 + 5 + 5 · 25 min
  - Custom counts

## Re-import CAST bank

Source markdown: `CAST/epsoprep_export_png/deduped/`  
Images copied to `public/cast-assets/`.

```bash
npm run import:cast
```

## Private use

This project is for **private study** between a small group. Do not publish or redistribute the question bank or assets.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run import:cast` | Rebuild CAST JSON + copy images |
| `npm run lint` | Lint |

## Persistence

Progress key: `epso-trainer-progress` in `localStorage` (per browser / profile).
