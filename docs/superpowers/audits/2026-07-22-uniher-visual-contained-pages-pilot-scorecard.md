# Visual contained pages pilot scorecard

Date: 2026-07-22
Lane: `visual-contained-pages`
Scope: authenticated internal UniHER routes `/semaforo`, `/objetivos`, `/desafios`, `/conquistas`, `/liga`
Decision: PASS for visual QA and harness/loop pilot

## Harness contract

Intent source: final delivery roadmap, pending surfaces orchestration, end-to-end redesign audit, Waves 5-10 decision packet and harness/loop research artifact.
Coordinator: current orchestration session.
Worker lane: `visual-contained-pages`.
Write allowlist for visual promotion:

- `src/components/platform/ContainedSurfacePreview.tsx`
- `src/app/(platform)/semaforo/page.tsx`
- `src/app/(platform)/objetivos/page.tsx`
- `src/app/(platform)/desafios/page.tsx`
- `src/app/(platform)/conquistas/page.tsx`
- `src/app/(platform)/liga/page.tsx`

Write denylist: public landing, metadata, email surfaces, migrations, APIs, Semaforo activation behavior, Liga activation behavior, legacy gamification stores, NR-1/Yavix architecture and unrelated docs.
Runtime preflight: branch `codex/uniher-wave3-collaborator-nr1`, HEAD `dbd44c0`, authenticated collaborator login `colab@teste.com`, local dev server `http://localhost:3206`.
Evidence outputs: screenshots and `metrics.json` under `C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-visual-contained-pilot-2026-07-22`.
Stop condition: PASS for visual QA; stage/commit remains blocked until the exact write allowlist is reviewed manually.

## Loop result

Preflight: repo status, branch, HEAD, scripts and previous screenshots reviewed.
Observe: canonical orchestration docs, route sources, containment tests and QA findings reviewed.
Plan: keep the pages visually redesigned but contained; fix only visual/copy findings.
Act: corrected `/desafios` and `/liga` context labels, removed the duplicate visual Semaforo card, polished visible copy/accentuation and kept Semaforo containment anchored for the source-level test.
Verify: deterministic checks, build, authenticated route screenshots, mobile top/bottom viewport screenshots and independent QA were completed.
Reflect: first independent QA returned HOLD; after fixes and recapture, independent QA returned PASS with one P2 integration hygiene note.

## Evidence

| Check | Result |
| --- | --- |
| `git diff --check` | PASS; only known LF/CRLF warnings |
| `npm run test:unit -- tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/semaforo-containment.test.ts` | PASS, 2 files, 25 tests |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS, 137 routes; known Turbopack/NFT warning via `src/app/api/admin/system/ops/route.ts` and `next.config.ts` |
| Authenticated route capture | PASS, `colab@teste.com` |
| HTTP status | PASS, 200 for all 10 route/viewport combinations |
| Horizontal overflow | PASS, `horizontalOverflow=false` for all 10 combinations |
| Contained-state copy | PASS, `containedCopy=true`, `prohibitedActivationCopy=false` for all 10 combinations |
| Mobile bottom nav | PASS, body-scroll evidence shows `contentBottom=732`, `navTop=775`, `bottomContentClearOfMobileNav=true` on all five mobile routes |
| Independent QA | PASS after re-review by agent `019f87a1-f692-7380-9f24-5740b77d9819` |

## Screenshots

Desktop full-page screenshots:

- `semaforo-desktop.png`
- `objetivos-desktop.png`
- `desafios-desktop.png`
- `conquistas-desktop.png`
- `liga-desktop.png`

Mobile full-page screenshots:

- `semaforo-mobile.png`
- `objetivos-mobile.png`
- `desafios-mobile.png`
- `conquistas-mobile.png`
- `liga-mobile.png`

Mobile viewport evidence:

- `*-mobile-viewport-top.png`
- `*-mobile-viewport-bottom.png`

All files are under `C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-visual-contained-pilot-2026-07-22`.

## Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| VCP-01 | P1 | Initial screenshots captured the auth skeleton due `127.0.0.1` cookie-domain mismatch. | Fixed by recapturing through `http://localhost:3206`; invalid evidence was not used. |
| VCP-02 | P1 | `/desafios` and `/liga` had incorrect `context="Conquistas"` labels. | Fixed and recaptured. |
| VCP-03 | P1 | Full-page mobile screenshots made the fixed bottom nav look like it covered content. | Resolved with body-scroll metrics and separate viewport bottom screenshots; independent QA accepted the evidence. |
| VCP-04 | P2 | `/semaforo` rendered a second visual `FeedbackState` below the preview. | Fixed by removing the visual duplicate while keeping the source-level containment audit anchor. |
| VCP-05 | P3 | Visible copy/accentuation needed polish in Desafios, Liga, Conquistas and the shared component. | Fixed and recaptured. |
| VCP-06 | P2 | Worktree contains unrelated orchestration/research docs alongside visual code. | Not a visual blocker, but stage/commit must use the exact visual allowlist; no `git add .`. |

## Decision

The `visual-contained-pages` pilot is PASS for visual QA and validates the harness/loop operating model for future UniHER specs.

Do not stage, commit, PR or deploy automatically. If this wave is promoted into git, include only the six visual write-set files listed in the harness contract unless the user separately approves the orchestration docs write set.
