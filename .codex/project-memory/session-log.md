# Session Log

## 2026-05-13 - Project memory bootstrap

Type: session
Tags: codex, memory, skills

Summary:
- Created repo-local persistent project memory under `.codex/project-memory/`.
- Expanded `AGENTS.md` so Codex can recover project context automatically at session start.
- Planned global Codex skill installation for memory commands and wrappers.

Details:
- Memory is markdown-first, searchable, and intentionally sanitized.
- Source of truth is repo-local memory; global memory mirrors/summarizes it for cross-session continuity.

## 2026-05-13 - Persistent project memory installed

Type: session
Tags: project-memory

Summary:
- Created AGENTS.md project guide, repo-local .codex/project-memory markdown store, global ~/.codex/skills/project-memory skill, slash wrappers, and ~/.codex/memories/projects/InvestUp mirror. Verified recall for DesktopAppShell and global skill discovery.

## 2026-06-01 - Publication wizard media and preview layout polish

Type: session
Tags: publish, media, desktop-ui
Files: app/(protected)/publish/page.tsx

Summary:
- Centered and widened desktop publication media upload/reorder states with 5-column grids.
- Added client-side image conversion to WebP before media enters the pending upload state.
- Moved the generated title editor to the left content column, added scrolling compliance options, and widened the final preview with internal scrolling.

## 2026-06-05 - Entrepreneur goal progress speed meter refinement

Type: session
Tags: entrepreneur-dashboard, portfolio, ui
Files: components/EntrepreneurFeedDashboard.tsx

Summary:
- Refined the entrepreneur dashboard speed meter to show only the half-donut goal progress and days-remaining badge.
- Removed funds-raised and remaining side figures from the speed meter while preserving the gradient card treatment.

## 2026-06-06 - Invest mobile preview aligned with publish wizard

Type: session
Tags: invest, mobile, preview, ui
Files: app/(protected)/feed/[id]/invest/page.tsx, components/ProjectPhotoCarousel.tsx

Summary:
- Reworked the mobile investor `Invest` detail screen to mirror the publish wizard preview layout more closely.
- Matched the carousel containment, horizontal business info table, KPI card styling, and minimal tabbed publication content pattern from the wizard preview.
- Kept desktop behavior unchanged and preserved the existing investment handoff flow.

## 2026-06-06 - Feed cards and transfer feedback polish

Type: session
Tags: feed, investment, mobile, animation, notifications
Files: app/(protected)/feed/page.tsx, components/TransactionLoader.tsx, components/TransactionOverlay.tsx, lib/investapp-context.tsx

Summary:
- Removed flip behavior from investor feed cards so standard and premium publications open the detail page directly.
- Replaced the transfer sending loader with a purple-branded Lottie animation and surfaced cancel/success/failure feedback through toasts.
