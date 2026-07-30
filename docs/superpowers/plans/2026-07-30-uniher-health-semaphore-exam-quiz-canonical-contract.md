# UniHER health semaphore exam quiz canonical contract

Date: 2026-07-30
Status: CONTRACT DRAFT / HOLD FOR IMPLEMENTATION
Base product: rollback `808e10c`
Candidate UX/source: Lovable `UniHer Health Hub`

## Objective

Organize the new Semaforo da Saude correctly so the team stops mixing three different things:

1. old profile/archetype quiz;
2. private wellbeing check-in/check-out;
3. new primary-health exam quiz that should drive the Semaforo da Saude.

The implementation target is not a Lovable/Supabase replacement. The target is the rollback Next.js backend and UI, using Lovable only as UX/product reference for the new exam-based quiz and related Concierge flow.

## Canonical Decision

The Semaforo da Saude final product should use a new exam-based health quiz, not the old archetype/profile quiz as its final source.

- Old quiz remains: profile/onboarding/archetype journey.
- Check-in/check-out remains: daily wellbeing signal, private and not used for Semaforo scoring.
- New quiz becomes: primary-health/exam intake for Semaforo da Saude.

## Naming

Use these names in code, docs and UI to avoid confusion:

| Concept | Canonical name | Route/API target | Purpose |
|---|---|---|---|
| Old onboarding quiz | Perfil de Jornada | `/welcome-colaboradora/quiz`, `/api/quiz/submit` | Archetype/profile and initial journey only. |
| Daily wellbeing | Meu Bem-Estar | `/colaboradora`, wellbeing APIs | Check-in/check-out only. No Semaforo feed. |
| New health quiz | Quiz de Exames e Prevencao | new route under `/semaforo` or `/saude-primaria` | Exam/prevention intake. Feeds Semaforo only after gates. |
| Health traffic-light | Semaforo da Saude | `/semaforo`, `/api/collaborator/semaforo*` | Private non-diagnostic personal status. |
| Exam agenda | Minha Agenda de Exames | `/agenda` | Reminders, history, exam follow-up. |
| Human support | Concierge UniHER | `/concierge` | Optional support route only when module/contract is enabled. |

## Source Of Truth

### Keep From Rollback

- Next.js application shell and authenticated platform.
- Auth and user/company scoping.
- SQLite migration pattern.
- Existing `quiz_results`, `health_scores`, `user_exams` direction.
- Existing `/api/collaborator/semaforo*` and `semaforo-calculator.service.ts` direction.
- Existing privacy guardrails: RH/Admin aggregate-only, collaborator owns individual data.

### Pull From Lovable

Use as product/UX source, not as direct backend:

- `DemoHealthCheckin.tsx`
  - exam-based questions;
  - risk score;
  - health items;
  - recommendations.
- `HealthSemaphore.tsx` and `HealthStatus.tsx`
  - visual language for safe/attention/urgent.
- `Concierge.tsx`
  - service taxonomy and support UI reference.
- `UserContext.tsx`
  - mock examples for Mammography, Papanicolau and Gynecological Consultation.

## Product Contract

### Exam Quiz Inputs

Initial version should cover:

- last gynecologist consultation;
- mammography status/applicability;
- Papanicolau status;
- family history of breast/ovarian cancer;
- diabetes history;
- menstrual cycle;
- mental health support signal;
- physical activity;
- smoking.

Questions must be reviewed before production. The UI copy must state:

- non-diagnostic;
- private to collaborator;
- used for guidance and reminders;
- not visible individually to RH/Admin/leadership;
- can be deleted according to retention policy.

### Output Model

The quiz returns:

- overall private result: `safe`, `attention`, or `urgent`;
- per-item status:
  - Mammography;
  - Papanicolau;
  - Gynecological Consultation;
  - Diabetes monitoring;
  - Mental Health support;
  - Lifestyle;
- recommendations;
- recommended next action:
  - continue to Semaforo;
  - update Agenda de Exames;
  - offer Concierge if enabled and approved.

### Persistence Model

Prefer new explicit tables instead of overloading old archetype quiz data.

Proposed tables:

1. `health_checkins`
   - raw answer snapshot;
   - consent version;
   - source `exam_quiz_v1`;
   - user id;
   - timestamps;
   - deletion/retention fields.

2. `user_exams`
   - exam type;
   - status;
   - due date or unknown;
   - source answer id;
   - user id.

3. `health_scores`
   - Semaforo dimensions and status;
   - no RH-visible individual rows.

4. `concierge_cases`
   - only after Concierge contract exists;
   - not created automatically in Wave 1 unless product/DPO/clinical approve.

## API Contract

### New Endpoint

`POST /api/collaborator/health-checkin`

Responsibilities:

- authenticate collaborator;
- validate answers;
- validate consent;
- calculate non-diagnostic statuses;
- write `health_checkins`;
- update or derive `user_exams`;
- update Semaforo scores/status;
- return private result and recommended next action.

### Read Endpoints

Reuse or evolve:

- `GET /api/collaborator/semaforo`
- `GET /api/collaborator/semaforo/history`
- `GET /api/collaborator/agenda`

Potential new endpoint:

- `GET /api/collaborator/health-checkin/latest`

### Admin/RH Endpoints

Only aggregate and suppressed:

- no answer-level data;
- no individual exam status;
- no individual Semaforo score;
- no identifiable red/yellow classification;
- no mental-health details.

## UI Contract

### Collaborator

`/semaforo` should show:

- intro: Semaforo da Saude is private and non-diagnostic;
- CTA: start or update `Quiz de Exames e Prevencao`;
- current status per item/dimension;
- recommended next action;
- link to Agenda de Exames;
- Concierge CTA only if enabled and contract-approved.

`/colaboradora` should not redirect to the old archetype quiz as if it were the final Semaforo quiz. If no exam quiz exists yet, show honest unavailable/candidate state instead of pretending the old quiz is final.

### RH/Admin

Saude Primaria panels may show only:

- aggregate green/yellow/red counts with minimum cohort suppression;
- exam completion/pending/expired aggregates;
- evolution over time after privacy approval.

They must not show:

- individual answers;
- individual exams;
- individual Semaforo;
- mental-health details;
- Concierge case details unless separate contract allows it.

## Concierge Contract

Concierge is not automatic escalation in the first implementation.

Wave 1 may return:

- `nextAction: "show_concierge_offer"`
- `conciergeEnabled: false | true`
- copy explaining availability.

Creating a real case requires a separate approved contract:

- case lifecycle;
- ownership;
- consent;
- access control;
- retention/deletion;
- response SLA;
- audit trail;
- what data is shared with the Concierge operator.

## Non-Negotiable Guardrails

- No clinical diagnosis.
- No automatic manager/RH/leadership escalation.
- No use as gamification, Liga, ranking, rewards, objectives, challenges or achievements input.
- No NR-1/Yavix data mixing.
- No community/feed exposure.
- No public landing dependency.
- No production activation without clinical/product/DPO/SST gate.

## Implementation Waves

### Wave 0 - Contract Freeze

Deliverables:

- this contract;
- source map;
- question mapping table;
- data retention decision placeholders;
- test matrix.

Exit gate:

- no runtime code changed;
- coordinator approves Wave 1 scope.

### Wave 1 - Backend Skeleton

Deliverables:

- migration for `health_checkins`;
- optional migration patch for `user_exams` if missing fields block the flow;
- validator/schema for exam quiz answers;
- pure calculator function with unit tests;
- `POST /api/collaborator/health-checkin` behind feature flag or contained access.

Exit gate:

- unit tests prove mapping;
- API tests prove auth, consent and no RH leak.

### Wave 2 - Collaborator UI

Deliverables:

- `/semaforo` uses canonical exam quiz CTA;
- old profile quiz copy is renamed away from Semaforo final source;
- result screen with non-diagnostic copy;
- Agenda next-action wiring.

Exit gate:

- Playwright desktop/mobile;
- no landing page changes;
- no mock/spec text visible as final product.

### Wave 3 - Concierge Offer

Deliverables:

- private CTA only;
- module-enabled/disabled state;
- no case auto-creation unless approved.

Exit gate:

- tests prove no automatic external/RH escalation.

### Wave 4 - Aggregate RH/Admin

Deliverables:

- suppressed aggregates only;
- exam dashboard summaries;
- company/department/period filters only after cohort policy exists.

Exit gate:

- privacy tests prove individual rows are inaccessible.

## First Concrete Task

Before implementing code, write the question mapping table:

| Lovable question | Canonical field | Derived exam/status | Semaforo dimension | Recommendation | Concierge trigger |
|---|---|---|---|---|---|
| lastGynecologist | `last_gynecologist_visit` | Gynecological Consultation | Prevencao | schedule/follow-up | only if urgent and enabled |
| mammography | `mammography_status` | Mammography | Prevencao | schedule/update agenda | only if urgent and enabled |
| papanicolau | `papanicolau_status` | Papanicolau | Prevencao | schedule/update agenda | only if urgent and enabled |
| familyHistory | `family_history_cancer` | Risk factor note | Prevencao | preventive review | no auto case |
| diabetesHistory | `diabetes_history` | Diabetes monitoring | Prevencao | monitoring guidance | no auto case |
| menstrualCycle | `menstrual_cycle_status` | Cycle support | Saude Reprodutiva or Prevencao | guidance | only if approved |
| mentalHealth | `mental_health_support_signal` | Support signal | Saude Mental | support resources | no RH escalation |
| lifestyle | `physical_activity_level` | Lifestyle | Habitos | habit guidance | no |
| smoking | `smoking_status` | Lifestyle/Risk | Habitos or Prevencao | preventive guidance | no |

## Current Decision

The next implementation should not be another visual patch. It should start with Wave 0/1: formalize mapping and backend contract, then make `/semaforo` consume that contract.
