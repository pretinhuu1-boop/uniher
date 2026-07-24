# UniHER P7A evidence refresh plan

**Date:** 2026-07-23
**Status:** executed
**Lane:** Paola P7A/F0
**Current decision:** PASS runtime/menu evidence with P3 evidence finding; HOLD full visual approval
**Finding source:** separate Paola P7A/F0 audit session

## Finding

P3: P7A textual evidence is mixed.

The RH completed-onboarding evidence reflects post-polish accented labels, but the primary `metrics.json` still contains pre-polish labels such as `Saude Primaria`, `Conteudos educativos` and `Configuracao de conquistas`.

## Harness

**Write allowlist:**

- P7A output directory files only if explicitly regenerating evidence:
  - `C:\Users\user\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-p7a-menu-boxes-2026-07-23\metrics.json`
  - refreshed screenshots/metrics in the same folder
- `docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md`
- `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`

**Write denylist:**

- no source code changes unless runtime labels regress
- no visual approval claim
- no P5/P6 implementation

## Tasks

- [x] Verify whether runtime recapture exists after PT-BR polish.
- [x] Confirm raw `metrics.json` still reports old unaccented labels and must be treated as pre-polish evidence.
- [x] Annotate `metrics.json` as pre-polish in the scorecard and make `rh-dashboard-complete-metrics.json` the post-polish evidence source.
- [x] Update P7A scorecard to distinguish primary pre-polish metrics from refreshed/post-polish metrics.

## Execution Receipt

No new runtime recapture was performed in this correction lane. The existing
evidence was reclassified:

- `metrics.json` remains a raw pre-polish artifact and still contains old
  labels.
- `rh-dashboard-complete-metrics.json` is the post-polish evidence source for
  accented PT-BR labels and badge spacing.

Verification:

```powershell
rg -n "Saude Primaria|Conteudos educativos|Configuracao de conquistas" "C:\Users\user\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-p7a-menu-boxes-2026-07-23"
rg -n "Saúde Primária|Conteúdos educativos|Configuração de conquistas|Saude Primaria|Conteudos educativos|Configuracao de conquistas" "C:\Users\user\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-p7a-menu-boxes-2026-07-23\metrics.json" "C:\Users\user\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-p7a-menu-boxes-2026-07-23\rh-dashboard-complete-metrics.json"
```

Result: old labels appear only in raw `metrics.json`; corrected accented labels
appear in `rh-dashboard-complete-metrics.json`.

## Verification

Run:

```powershell
rg -n "Saude Primaria|Conteudos educativos|Configuracao de conquistas" "C:\Users\user\Codex\2026\07\21\uniher-redesign-paginas-pendentes\outputs\uniher-p7a-menu-boxes-2026-07-23"
git diff --check -- docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md
```

If runtime is recaptured, also verify:

- no console/page/API errors
- no horizontal overflow
- active state still correct

## Pass Gate

- P7A evidence no longer mixes pre/post-polish labels without explanation.
- Full visual approval remains HOLD.
