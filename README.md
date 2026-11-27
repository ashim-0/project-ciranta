# Project Pulse

A collaborative project management platform: teams organize projects, assign tasks,
collaborate in real time, and track progress on an interactive Kanban board.

Built for the Ciranta Full-Stack Product Development Challenge (Round 1).

## Demo video

[Watch or download the 3:15 demo](project-pulse-demo.mp4). This silent screen
recording uses synthetic accounts and covers registration, projects and members,
task creation and assignment, Kanban drag, comments and activity, dashboard,
mobile layout, and side-by-side live updates between two independent sessions.

## Features

- **Authentication and user management** — register, log in, log out. Passwords are
  bcrypt-hashed; sessions are signed JWTs in httpOnly cookies. All app pages and API
  routes are protected.
- **Projects and team management** — create, edit and delete projects; add registered
  users as members by email; role-based access control (Owner manages project, members
  and tasks; Members view and collaborate). Permissions are enforced on the server.
- **Interactive Kanban board** — three columns (To Do, In Progress, Done); drag cards
  between columns or reorder within one with dnd-kit; every move is validated and
  persisted through the API and survives a refresh.
- **Task management** — title (required), description, status, priority (Low/Medium/High),
  assignee (project members only), due date, creator, created/updated timestamps.
  Overdue tasks are highlighted.
- **Real-time collaboration** — Socket.IO rooms per project. When one member creates,
  moves, edits, deletes or comments on a task, every other member with the board open
  sees the change without refreshing.
- **Comments and activity history** — comment threads on each task with author and
  timestamp; a chronological activity feed records task creation, moves, edits,
  assignment changes, deletions, comments and membership changes.
- **Dashboard and analytics** — total/completed/overdue tasks, completion percentage,
  tasks by status (donut) and priority (bar), per-member workload; updates live.
- **Search and filtering** — search tasks by title, filter by status, priority or
  assignee, with clear empty states.
- **Responsive UI** — desktop three-column board; on phones the sidebar folds into a
  top bar and the board shows one column at a time with a switcher. Loading, error
  and validation states throughout.

## Technology stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript | One codebase for UI and API; typed end to end |
| Styling | Tailwind CSS v4 + small custom design tokens | Consistent dark theme, fast iteration |
| Database | SQLite via Prisma ORM (dev) | Zero-setup persistent storage with real migration files; schema avoids SQLite-only constructs so PostgreSQL deployment is a provider switch |
| Auth | bcryptjs + jose (JWT session cookie) | Small, auditable, no external service |
| Real-time | Socket.IO (custom Node server) | Reliable rooms + membership-checked joins |
| Drag and drop | dnd-kit | Accessible, touch-friendly, React-native |
| Charts | Recharts | Simple React chart components |
| Tests | Vitest (28 tests) | Services tested against a real isolated SQLite DB |

## Architecture

```
Browser (React client)                    Node server (server.ts)
┌──────────────────────────┐             ┌──────────────────────────────┐
│ Board / Dashboard / ...  │  HTTP API   │ Next.js route handlers       │
│  - dnd-kit drag & drop   │────────────▶│  - zod validation            │
│  - socket.io-client      │             │  - session check (jose JWT)  │
└───────────┬──────────────┘             │  - RBAC per project          │
            │  Socket.IO                 │  - Prisma services           │
            │◀───────────── broadcast ───│  - record activity           │
            │  room: project:<id>        │ SQLite (Prisma)              │
            │                            │ Socket.IO: verifies session  │
            │                            │ cookie, joins project rooms  │
            │                            │ only for members             │
            └────────────────────────────┴──────────────────────────────┘
```

Data model: `User`, `Project`, `ProjectMember` (with role), `Task`, `Comment`,
`Activity`. Roles live on the membership, so a user can own one project and be a
member of others.

### How real-time sync works

1. A user drags a card (or edits, creates, deletes, comments).
2. The API route validates input, checks membership/role, writes to the database,
   and records an activity entry.
3. The route broadcasts the event to the project's Socket.IO room.
4. Every other connected member's client applies the change to its local state.
   The sender applies the response directly and ignores its own broadcast by id,
   so nothing renders twice.

Socket joins are authorized: the server verifies the session cookie and checks
project membership before adding a socket to a room.

### Permissions summary

| Action | Owner | Member | Outsider |
| --- | --- | --- | --- |
| View project, tasks, comments, activity, dashboard | yes | yes | no (404) |
| Create / edit / move tasks, comment | yes | yes | no |
| Delete a task | yes | only tasks they created | no |
| Edit / delete project, add / remove members | yes | no | no |

## Setup and installation

Requires Node.js 20+.

```bash
npm install          # also generates the Prisma client (postinstall)
cp .env.example .env # then edit the values
npm run db:migrate   # apply the migration files in prisma/migrations (creates the SQLite DB)
npm run db:seed      # optional: demo users (alice@example.com / bob@example.com,
                     # password: password123) and the populated "Product Launch" project
```

### Environment configuration

`.env`:

```
DATABASE_URL="file:./dev.db"          # SQLite file, relative to prisma/
SESSION_SECRET="at-least-32-random-characters-long"
```

No secrets are committed; `.env` is git-ignored and `.env.example` documents the keys.

### Switching to PostgreSQL

The schema deliberately uses only constructs shared by SQLite and PostgreSQL
(strings and dates instead of enums, no SQLite-specific types). To deploy on
PostgreSQL:

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL` to the Postgres connection string.
3. SQLite migrations cannot run on PostgreSQL. Move `prisma/migrations` aside, then
   run `npx prisma migrate dev --name init` against an empty PostgreSQL database to
   generate and apply PostgreSQL-specific migration SQL. Commit that new migration
   history for PostgreSQL deployments; then use `prisma migrate deploy` in production.
   Do not apply these SQLite migration files directly to a PostgreSQL server.

Verified: schema passes `prisma validate` with the postgresql provider, `prisma migrate dev`
generates and applies the migration on a real PostgreSQL server, the seed loads through
the application service layer, and the running app passes a smoke test on PostgreSQL
(login, projects, dashboard stats, permission denial). Verified locally with an
isolated PostgreSQL instance; production deployment is still pending.

### Running the application

```bash
npm run dev      # development server with hot reload on http://localhost:3000
# or
npm run build && npm start   # production build + server
```

Open two browsers (or one normal + one incognito window), register two accounts,
and try the collaboration scenario below.

### Running tests

```bash
npm test
```

28 tests cover: password hashing and login errors, session token integrity,
project membership and role enforcement (including the outsider-sees-404 rule),
task validation, assignment rules, drag-and-drop persistence and ordering, task
deletion permissions, comment/activity recording, and dashboard calculations.
Tests run against a separate `prisma/test.db` created and reset automatically.

## Demo scenario (matches the evaluation workflow)

1. Register **Alice**; she creates the project "Product Launch".
2. Register **Bob** in a second browser.
3. Alice opens Members, adds `bob@example.com`.
4. Alice creates "Develop Landing Page", assigns Bob, sets High priority.
5. Bob sees it in To Do. Alice drags it to In Progress: Bob's board updates live.
6. Bob comments; Alice sees the comment and the activity history.
7. Bob drags it to Done; the dashboard counts it.
8. A third account without membership gets "Project not found" on the project URL.

## Known limitations

- Live deployment is still pending (see "Switching to PostgreSQL"); the app is
  fully verified on SQLite and smoke-verified on a local PostgreSQL instance.
- On phones the board shows one column at a time. Use the task dialog's Status
  select for reliable cross-column movement; physical touch drag needs a real-device check.
- Task status can also be changed from the task dialog; drag-and-drop is the primary
  interaction.
- Pagination is not needed yet: boards load all project tasks, and the activity feed
  shows the latest 100 entries.
- Comments cannot yet be edited or deleted.

## Future improvements

- Customizable Kanban columns and in-column ordering persistence UI polish.
- In-app notifications and @mentions in comments.
- Subtasks, labels, file attachments, project invitations by link.
- AI-assisted task drafting from natural language.
- Docker packaging and CI.

## Engineering notes (challenges and decisions)

- **Drag persistence without renumbering.** Card order is a float `position`; a drop
  takes the midpoint between neighbors, so a move writes one row. Positions rebalance
  only if they ever collide.
- **Real-time without double rendering.** The API response updates the sender's
  state; the Socket.IO broadcast updates everyone else. The sender ignores its own
  broadcast by task id, which fixed an early duplicate-card bug.
- **Authorized sockets.** Socket.IO has no session of its own, so the custom server
  verifies the `pp_session` cookie on connect and checks project membership before
  joining a room; broadcasts are emitted only after the database write succeeds.
- **Server-side RBAC.** `src/lib/permissions.ts` is the single authority every route
  calls: members get 403, non-members get 404 so project existence is never leaked.
- **Headless-test charts.** Recharts animations never settle in headless browsers,
  which made dashboard verification flaky; animations are disabled
  (`isAnimationActive={false}`), which is also better for low-end devices.

## AI tools disclosure

Built with an AI coding assistant (Instinct). It assisted with architecture,
scaffolding, component and service implementation, tests, and documentation.
Automated checks and browser/API verification were run during development, including
the two-account real-time scenario and a test suite against a real SQLite database.
The candidate must still review and understand the code and decisions before
submission, and be ready to explain and modify them in the technical interview.
#   p r o j e c t - c i r a n t a  
 