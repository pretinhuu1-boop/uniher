# UniHER Platform — Full Demo Implementation Design

> Date: 2026-03-14
> Purpose: Sales demo / investor presentation
> Approach: Client-side with mock data, no backend

## Routes

| Route | Description |
|-------|------------|
| `/` | Landing page (existing) |
| `/auth` | Login / Register (mocked) |
| `/welcome` | Role selection (RH / Lideranca / Colaboradora) |
| `/hr-onboarding` | HR onboarding multi-step |
| `/dashboard` | HR Dashboard |
| `/colaboradora` | Collaborator Dashboard |
| `/company-profile` | Company Profile |
| `/semaforo` | Health Semaphore |
| `/campanhas` | Campaigns |
| `/desafios` | Challenges |
| `/conquistas` | Achievements |
| `/historico` | History |
| `/configuracoes` | Settings |

## Shared Components

- Sidebar, AppLayout, StatCard, ChartCard, NotificationToast

## Mock Data Files

- mock-dashboard.ts, mock-collaborator.ts, mock-company.ts

## Style: Keep current design system (cream/rose/gold, CSS Modules)
