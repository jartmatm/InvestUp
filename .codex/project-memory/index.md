# InvestUp Project Memory

Last reviewed: 2026-05-13

## Purpose

Persistent memory for Codex continuity in this repo. Use this as the first stop for project context, then open the focused memory file needed for the current task.

## Current Project

InvestUp / InvestApp is a Next.js App Router fintech marketplace for investors and entrepreneurs. It includes:

- Investor marketplace feed and project detail pages.
- Entrepreneur project publishing and funding dashboard.
- Portfolio dashboards for investor and entrepreneur profiles.
- Send, top-up, withdrawal, repayment, contracts/documents, history, notifications, and profile flows.
- Mobile app-oriented UI plus a separate desktop dashboard UI.
- Separate landing app in `investapp-landing/`.

## Read Order

1. `architecture.md` for stack, folder structure, routing, shared components, data flow, and APIs.
2. `decisions.md` for design/product/technical decisions already made.
3. `workflows.md` for commands, verification, deployment, commits, and memory update conventions.
4. `bugfixes.md` for resolved bugs and regressions to avoid reintroducing.
5. `todos.md` for open risks or known future work.
6. `session-log.md` for chronological session summaries.

## High-Signal Facts

- Desktop protected pages should use `DesktopAppShell` for consistent sidebar/topbar/content spacing.
- Mobile and desktop views are intentionally separate; keep mobile behavior stable when changing desktop.
- UI copy in the web app should be English unless explicitly requested otherwise.
- Primary desktop sidebar: Home, Portfolio, Send, Feed, Profile.
- Secondary desktop sidebar: Top up, Withdraw, Documents.
- Investor CTA: `Invest in a business`; entrepreneur CTA: `Publish project`.
- Publish CTA should be disabled for entrepreneurs who already have a mounted project.
- Privy is the auth and wallet identity layer.
- Supabase stores app data and is accessed from server routes with service-role helpers.
- Do not store secrets, env values, private keys, tokens, passwords, signing credentials, or user-sensitive data in memory.

## Memory Commands

- `/remember`: save a general project note.
- `/recall`: search project memory.
- `/project-context`: load current project context.
- `/decision`: record a technical/product/design decision.
- `/bugfix`: record a resolved bug and regression guard.
- `/architecture`: record architecture or structure changes.
- `/session-summary`: summarize and persist session learnings.

## Manual Storage

Append sanitized notes to the relevant file in `.codex/project-memory/` using the entry format:

```md
## YYYY-MM-DD - Short title

Type: decision | bugfix | architecture | workflow | note | session
Tags: area, feature, risk
Files: optional/file.tsx, optional/route.ts

Summary:
- Concise fact.

Details:
- Useful context without secrets.
```
