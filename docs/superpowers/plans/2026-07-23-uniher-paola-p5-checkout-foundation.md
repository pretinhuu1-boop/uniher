# UniHER Paola P5 Check-out Foundation

Date: 2026-07-23
Coordinator: current Codex session
Status: PASS for P5 foundation; uncommitted in current worktree

## Intent

Close the `Meu Bem-Estar` product gap from Dra. Paola's specification by adding
the daily pair:

- Check-in: `Como você chega hoje?`
- Check-out: `Como você encerra o seu dia?`

This lane creates the data/API/UI foundation only. It does not create RH/Admin
aggregate charts; those remain P6.

## Harness Contract

- Source of truth: Paola redesign contract P5 and current-state scorecard.
- Write allowlist:
  - wellbeing migration/service/API
  - collaborator home UI
  - DSAR export for data-subject access
  - focused unit/privacy tests
  - orchestration docs/ledger
- Write denylist:
  - no Semáforo calculation or health scoring
  - no Liga/ranking/XP/badges/rewards
  - no RH/Admin individual mood visibility
  - no P6 aggregate dashboard chart in this lane
  - no SIPAT/Concierge/Denúncias/Yavix production behavior

## Implementation Receipt

- Added `061_wellbeing_events.sql` with one daily `check_in` and one daily
  `check_out` event per user.
- Added `src/services/wellbeing.service.ts` with a closed mood set and
  fail-closed validation.
- Extended existing `/api/gamification/check-in` to optionally record the
  controlled check-in mood while preserving old no-body clients.
- Added `/api/wellbeing/check-out` for the end-of-day event.
- Added `/api/wellbeing/daily-status` and extended `/api/gamification/streak-status`
  with private check-in/check-out status for the collaborator UI.
- Updated `/colaboradora` journey with both prompts and controlled mood buttons.
- Added DSAR export `wellbeingEvents` as top-level data-subject data, not
  legacy derived data.

## Privacy Boundary

- Mood values are controlled enum values only; no free text.
- No individual mood data is exposed to RH/Admin in this lane.
- Check-in/check-out does not write points, levels, badges, rankings, leagues,
  health scores or Semáforo outputs.
- DSAR includes the user's own wellbeing events.

## Validation

Focused gate:

```powershell
npm run test:unit -- tests/unit/wellbeing-events.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts
npx tsc --noEmit
```

Result:

- Unit/privacy focused gate: PASS; 3 files / 29 tests.
- TypeScript: PASS.

Final gates:

```powershell
git diff --check
npm run build
```

Result:

- `git diff --check`: PASS; LF/CRLF warnings only.
- `npm run test:unit -- tests/unit/wellbeing-events.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts`: PASS; 6 files / 75 tests.
- `npm run build`: PASS; 148 pages. Existing Turbopack/NFT warning remains around `next.config.ts` via `/api/admin/system/ops`.

## P6 Handoff

P6 may now build privacy-safe RH/Admin aggregate indicators using only
thresholded aggregate projections. It must not expose individual check-in or
check-out mood values.
