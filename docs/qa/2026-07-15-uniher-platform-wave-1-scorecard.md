# UniHER Platform Wave 1 Scorecard

## Result

- Decision: PASS
- Commit under review: `bd28548`
- Evidence commit: `89878f5`
- Reviewed routes: `/admin`, `/dashboard`, `/colaboradora`, `/configuracoes`

## Automated evidence

- Unit tests: PASS — 75 tests in 9 files (`npm run test:unit`).
- TypeScript: PASS — `npx tsc --noEmit` exited `0`.
- Production build: PASS — `npm run build` exited `0` and generated 127 static pages. The known NFT whole-project trace warning remains non-blocking and is recorded below.
- Playwright: PASS — 78/78 tests across `platform-foundation`, `master`, `rh`, and `colaboradora`, using the configured 3 workers. The focused foundation project contributed 6/6 tests, including desktop/mobile screenshot baselines, reduced motion, drawer focus, active destination, and the 44px configuration-save target.
- Screenshot baselines: PASS — `platform-shell-desktop-platform-foundation-win32.png` at 1440x900 and `platform-shell-mobile-platform-foundation-win32.png` at 375x812 were inspected at original resolution. Dynamic admin data is replaced only inside the screenshot test with deterministic fixtures; no visual region is masked.
- Diff check: PASS — `git diff --check` exited `0` for the complete evidence diff.

## Manual evidence

- Desktop shell: PASS — the standalone production runtime returned `/api/health` 200 (`healthy`, database `ok`) and the four reviewed routes returned 200 at 1440x900 and 1024x768. Page title, role, current navigation destination, and primary action remained clear.
- Mobile drawer/focus: PASS — at 768x1024 and 375x812, the opener measured 44x44px, focus moved to the first drawer link after route hydration, Tab remained inside the open dialog, Escape closed it, and focus returned to the opener. Reduced-motion mode kept content visible and reduced the drawer transition to effectively zero.
- Responsive overflow: PASS — `/admin`, `/dashboard`, `/colaboradora`, and `/configuracoes` were checked at widths 1440, 1024, 768, and 375; document width always matched viewport width. The partially revealed next admin tab is intentional local tab-strip scrolling, not root overflow.
- Contrast and focus visibility: PASS — body text rendered dark brown (`rgb(33, 24, 19)`) on the warm light canvas (`rgb(255, 249, 241)`); placeholders remained readable on light fields; keyboard focus used the visible platform action outline/ring on shell navigation and actions. No text-bearing rendered element remained at computed opacity zero.
- Primary action sizing: PASS — RH `Convidar`, collaborator check-in/choice actions, and configuration `Salvar` measured at least 44px after the runtime fix. Smaller legacy secondary controls are deferred below.
- Privacy boundary: PASS — the RH dashboard exposed aggregate keys only (`ageDistribution`, `campaigns`, `departments`, `engagement`, `healthRisk`, `invites`, `kpis`, `reports`, `roi`) and no diagnosis, patient, or individual-health copy. A collaborator received 403 from `/api/dashboard`, while admin-only system data remained protected by role.
- Reference appearance: PASS — desktop shows the espresso sidebar, selected `Visão geral`, `Painel UniHER`, role, summary band, and recent-company surface without clipping. Mobile shows the compact top bar, role context, two-column metrics, and recent-company content without document overflow.

## Remaining drift

- `/admin` remains the legacy Admin Master route. Its local tab strip uses 36px contextual controls and intentional horizontal scrolling on narrow screens; Admin redesign is outside Wave 1.
- `/colaboradora` remains the legacy collaborator experience. Secondary mission `Registrar` controls measure 28px; collaborator route migration is outside Wave 1.
- `/configuracoes` retains legacy secondary inline export/delete controls and toggles. The primary save action is fixed at 44px; the remaining controls belong to a later route-specific accessibility pass.
- Wave 2 must migrate the RH route family: dashboard follow-up, `/convites`, `/campanhas`, `/departamentos`, `/colaboradoras-gestao`, reports at `/historico`, and RH configuration at `/company-profile` and `/gamificacao-config`.
- The production build still reports the known Next/Turbopack NFT warning that `next.config.ts` caused a whole-project trace through `src/app/api/admin/system/ops/route.ts`; it did not fail build or runtime health but should be isolated in a later operations hardening task.

## Promotion

- Wave 2 RH plan may begin: YES
- Blocking issue when NO: None
