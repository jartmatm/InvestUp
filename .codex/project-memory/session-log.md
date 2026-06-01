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
