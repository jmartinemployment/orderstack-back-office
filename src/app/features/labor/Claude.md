# Labor

## Purpose
Staff scheduling, time clock, payroll, commissions, and labor compliance tracking.

## Route
`/scheduling` (also accessible via `/labor` redirect)

## Components
- **StaffScheduling** (`os-staff-scheduling`) — Weekly schedule builder, shift management, timecards, payroll periods, commission rules, compliance alerts

## Services
- `LaborService` — Schedules, timecards, PTO, payroll, commissions, compliance, labor forecast

## Models
- `labor.model` — Shift, Timecard, PayrollPeriod, CommissionRule, ComplianceAlert

## Known API Gaps (404s)
- `GET /labor/payroll` — Not implemented
- `GET /labor/commissions/rules` — Not implemented
- `GET /labor/compliance/alerts` — Not implemented
- `GET /labor/compliance/summary` — Not implemented

## Known Issues
- Tab "Timecards" not found in Playwright audit (tab label/selector mismatch)
