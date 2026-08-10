# TaskPilot — Product Requirements

## What it is
A single-user personal task manager for Android-first + iOS + web (shared Expo codebase). Tasks with optional due date/reminder, three built-in lists (Job / Studies / Personal), and a Job-application tracker layered onto the Job list.

## Core screens
- **Today** — Quick-add bar at top (title + datetime + list). Overdue section (red accent) then Today section. Tap circle to mark done, undo bar shows for 4s. Tap row → detail.
- **Upcoming** — Future tasks grouped by day. "Someday" at bottom for no-due-date tasks.
- **Task detail** — Edit title / due / reminder (none, at due, 1h before, 1d before, custom) / list / notes / delete / mark done. When list=job, also company/role/link/stage/next-action.
- **Job board** — Applications grouped by stage (to apply, applied, interviewing, offer, rejected) with next-action date and external link. Add-application form.
- **Settings** — Demo mode toggle, test-notification button (60s), notification-permission status + open system settings.

## Non-negotiable behaviors
- Local scheduled notifications via `expo-notifications` (no push).
- Reminders cancelled + re-scheduled on any task edit / delete / mark done.
- Never schedule in the past; save without a reminder and show inline warning.
- Store times in device local timezone (ISO strings).
- Demo mode swaps in a realistic sample dataset (~15 tasks + 8 applications; early-career analyst/PM roles; India + Europe locations). Toggling back restores real data untouched. SAMPLE DATA badge visible in demo mode.
- Backend mirror: FastAPI + MongoDB, static `X-API-Key`, last-write-wins by `updatedAt`. Local is source of truth; sync is fire-and-forget.
- Web build works — reminders show inline "phone only" info instead of silently no-op.

## Deliberately excluded
No auth, no calendar, no kanban, no NLP, no AI, no recurring tasks, no attachments, no analytics, no onboarding tours, no priority/tags/subtasks/dependencies.
