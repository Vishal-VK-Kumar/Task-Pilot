# TaskPilot

A personal task manager for Android, built because I kept forgetting things.

Six task fields, three lists, six screens. The interesting part of this project
is not what it does, it is what it deliberately does not do.

## Why it exists

I was forgetting deadlines across a job search, coursework and ordinary errands.
The first version of the plan was a private command centre with four workspaces,
around twenty task fields, a kanban board, a calendar, recurring tasks and an AI
planning assistant. I cut it down to something I could ship in days and actually
live in, on the theory that a small tool I use beats a large one I abandon.

## What shipped

| | |
|---|---|
| Task fields | title, deadline, one reminder, done, list, notes |
| Lists | Job search, Studies, Personal |
| Screens | Today, Upcoming, Job board, Task detail, History, Settings |
| Job tracking | company, role, link, application stage, next action date |
| History | completed tasks marked on time or late, with a completion rate |

## What I cut, and why

Most of the original plan did not make it in.

| Cut | Reason |
|---|---|
| Priority levels | The deadline already encodes urgency. Two competing signals means neither gets trusted. |
| Five status states | To do / Doing / Waiting / Blocked / Done collapses to two within a week of real use. |
| Progress percentage | Unmeasurable for personal tasks, and it invites fiddling instead of finishing. |
| Tags and subcategories | Three lists do not need a second axis. Tags earn their place at a few hundred tasks. |
| Recurrence, dependencies, estimates | Real complexity, no use case yet. |
| Natural language input | A parser that is wrong 15% of the time is worse than a date picker, because you stop trusting capture. |
| Search | Deferred. At twenty tasks it is a screen you never open. |
| Health and medication tracking | Cut on risk, not scope. Medical data does not belong in a hosted app built in a week. |

Two features suggested during the build were adopted and two were declined. The
adopted ones were snooze and swipe actions, both of which shorten a loop that
already existed. The declined ones added surface area for problems I did not have.

## Architecture, and the one decision that drove it

**Reminders are on-device local notifications, scheduled at task-save time.**

This is why the app is native rather than a web app. Scheduled notifications do
not exist in the web Notifications API, so a browser-based version would need a
server pushing at exactly the right moment, with a delivery guarantee it cannot
make. The entire product is reminders, so the reminders chose the platform.

The consequence is that reminders fire offline, with no backend scheduler and no
push infrastructure. The tradeoff is that reminders live on one device.

Local storage is the source of truth. The backend is a mirror, last write wins,
no conflict resolution. The app is fully usable with no network and no backend
configured at all.

**Stack:** Expo 54, React Native 0.81, React 19, TypeScript, expo-router,
expo-notifications, AsyncStorage. FastAPI and MongoDB for the optional sync
mirror.

## Repository layout

```
frontend/   Expo React Native app
backend/    FastAPI sync mirror and its tests
docs/       Product requirements and design tokens
```

## Status

Running on a Samsung S23. Not published to any store. No usage measurement yet,
so there are no results to report.

## Notes

The first version was scaffolded with an AI app builder, then exported here and
taken over. I wrote the product spec, made the architecture decisions and set the
acceptance criteria.

Demo mode exists so the app can be shown to someone without exposing real
content. It is a hard data separation, not a display toggle.
