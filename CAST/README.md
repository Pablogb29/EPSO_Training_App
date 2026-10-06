# CAST source material

Raw EPSOprep export used to build the in-app question bank.

## Keep for re-import

- `epsoprep_export_png/deduped/*.md` — unique questions (study source of truth)
- `epsoprep_export_png/assets/` — PNG charts/diagrams
- `epsoprep_export_png/deduped/dedupe-summary.json`

## App outputs (generated)

Running `npm run import:cast` writes:

- `src/data/questions/*.cast-import.json`
- `public/cast-assets/**`

## Optional / tooling (not needed to run the app)

- `epsoprep_export/` — older text-only scrape
- `epsoprep_export_png/formatted/` — pre-dedupe formatted markdown
- `epsoprep_export_png/*.md` — raw (pre-dedupe) markdown
- `*.mjs` scrapers / formatters
- Root `Verbal.md` / `Numerico.md` — small Spanish samples
- `EPSO_CAST_Profile_Data_Pablo.md` — personal application notes (do not share publicly)

The web app does **not** read these folders at runtime; only the imported JSON + `public/cast-assets`.
