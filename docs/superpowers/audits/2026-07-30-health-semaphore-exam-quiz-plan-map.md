# Health semaphore exam quiz plan map

Date: 2026-07-30

## Question

Find where the prior plans described integrating new exams and a new health semaphore quiz based on those exams.

## Finding

There is no single closed implementation plan that explicitly says "build the new exam-based quiz and wire it to the Semaforo." The written plan is split across three layers:

1. Old product/schema plan defines the data model:
   - collaborator home has `healthAlert`, `examsPercent`, `examsTotal`;
   - `SemaforoItem` has `dimension`, `status`, `score`, `recommendation`;
   - `quiz_results` stores one quiz result per user;
   - six health dimensions include `Prevencao`, described as exams/check-ups;
   - `SEMAFORO` maps to latest `health_scores`;
   - `user_exams` is identified as the table to track individual exams and dates;
   - health data needs explicit consent, aggregation for RH, and individual visibility only for the collaborator.

2. July safety plans block production behavior until the contract is explicit:
   - `/semaforo` must define a personal collaborator-only model before UI changes;
   - source must be approved as self-reported, content-derived, or another source;
   - no clinical inference, NR-1 answers, individual score/classification exposure, manager/RH escalation, gamification, Liga, objectives or achievements input;
   - Semaforo production behavior remains blocked until clinical/product/DPO/SST decisions approve copy, consent, retention, deletion, audience and downstream prohibitions.

3. Lovable export now provides the missing product candidate:
   - `DemoHealthCheckin.tsx` contains exam/risk questions for gynecologist visit, mammography, Papanicolau, family history, diabetes, menstrual cycle, mental health, lifestyle and smoking;
   - it creates health items for Mammography, Papanicolau, Gynecological Consultation, Diabetes, Mental Health and Lifestyle;
   - it generates risk low/moderate/high and personalized recommendations;
   - it does not yet persist into the rollback backend, does not use the rollback `health_scores` contract, and does not escalate to Concierge.

## Source Map

### Schema plan

- `docs/plans/2026-03-14-uniher-schema.md:270-292`
  - collaborator home already expected a health alert, exam percentage and exam total;
  - Semaforo item model already expected dimension/status/score/recommendation.
- `docs/plans/2026-03-14-uniher-schema.md:388-401`
  - `quiz_results` stores answers per user.
- `docs/plans/2026-03-14-uniher-schema.md:622-633`
  - health dimensions include `Prevencao` for exams/check-ups.
- `docs/plans/2026-03-14-uniher-schema.md:754-791`
  - quiz answer recording and `user_exams` are identified as missing dynamic data/tables.
- `docs/plans/2026-03-14-uniher-schema.md:797-800`
  - health data is sensitive; RH only sees aggregates.

### Safety and module contract

- `docs/superpowers/plans/2026-07-20-uniher-collaborator-placeholder-repair.md:9-30`
  - Semaforo stays placeholder/contained until data source, privacy, permission, loading/error states and tests exist.
- `.worktrees/uniher-wave3-collaborator-nr1/docs/superpowers/specs/2026-07-21-uniher-waves5-10-decision-packet.md:106-117`
  - Wave 9 Semaforo can open only after non-diagnostic self-report, clinical/product copy, consent/retention/deletion and no escalation.
- `.worktrees/uniher-wave3-collaborator-nr1/docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md:178-183`
  - RH Saude Primaria covers aggregate green/yellow/red classifications and company health evolution; Concierge remains locked unless purchased/enabled.
- `.worktrees/uniher-wave3-collaborator-nr1/docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md:207-219`
  - collaborator Saude Primaria reuses `/semaforo`; Agenda de Exames reuses `/agenda`.
- `.worktrees/uniher-wave3-collaborator-nr1/docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md:246-254`
  - Admin Saude Primaria is aggregate-only; Admin Dashboard de Exames should cover good-standing, pending, expired exams and prevention indicators.
- `.worktrees/uniher-wave3-collaborator-nr1/docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md:305-313`
  - Semaforo production remains gated; RH/Admin cannot see individual health-sensitive records; gamification cannot use health data.

### Lovable candidate source

- `docs/superpowers/evidence/lovable-uniher-export-2026-07-30/files/src/pages/DemoHealthCheckin.tsx`
  - exam-based health quiz candidate.
- `docs/superpowers/evidence/lovable-uniher-export-2026-07-30/files/src/contexts/UserContext.tsx`
  - mock/default health items and notifications for Mammography, Papanicolau and Gynecological Consultation.
- `docs/superpowers/evidence/lovable-uniher-export-2026-07-30/files/src/pages/Concierge.tsx`
  - candidate Concierge UI with services including Gynecology, Mammography, Papanicolau, Ultrasound, HPV, hormones and women's specialties.
- `docs/superpowers/audits/2026-07-30-lovable-vs-rollback-808e10c.md:90-120`
  - comparison already records that the Lovable quiz differs from rollback quiz and needs a new contract.

## Correct Integration Direction

Use rollback `808e10c` as canonical backend and product base. Do not replace it with Lovable/Supabase.

Recommended first contract:

`POST /api/collaborator/health-checkin`

Inputs:

- exam answers: gynecologist visit, mammography, Papanicolau, family history, diabetes, cycle, mental health, activity, smoking;
- explicit consent checkbox/version;
- source metadata: `exam_quiz_v1`;
- optional note fields only if privacy language is approved.

Writes:

- `quiz_results` or a new `health_checkins` table for raw answer snapshot;
- `user_exams` for exam status/due-date derived records where appropriate;
- `health_scores` for Semaforo dimensions, starting with `Prevencao` and approved non-diagnostic dimensions;
- optional `concierge_cases` only after Concierge case-management contract exists.

Outputs:

- personal result: green/yellow/red or safe/attention/urgent labels;
- personalized non-diagnostic guidance;
- visible next action:
  - low/moderate: go to Semaforo/dashboard/agenda;
  - high/urgent: offer Concierge support if module enabled, otherwise show honest unavailable/support instructions.

Required gates before implementation:

- clinical/product approves questions, labels and recommendations;
- DPO/LGPD approves consent, retention and deletion;
- product defines whether high/urgent creates only a private recommendation or an actual case;
- RH/Admin aggregate suppression rules are written;
- tests prove no individual exam, Semaforo score, answer or health note leaks to RH/Admin/leadership/community/gamification.

## Decision

The old plan gave the schema and guardrails. The Lovable project gives the missing exam-based quiz candidate. The product-final work is to write the missing contract between them, then implement the smallest backend-first slice on the rollback codebase.
