# Workflow Memory

## Standard Commands

- `npm run dev`: run the app locally with Next.js webpack dev server.
- `npm run build`: production build.
- `npm run lint`: ESLint.
- `npm run start`: Next.js production server.
- `npm run android:sync`: Capacitor Android sync.
- `npm run android:open`: open Android project.

## Verification Defaults

- For UI-only changes, prefer lint/build when feasible and targeted visual review when requested.
- For high-risk financial, auth, KYC, ledger, or withdrawal changes, run deeper review and targeted tests/manual verification.
- Avoid browser screenshots unless the user asks for visual verification or the task needs it.
- Do not commit/push unless explicitly requested.

## Git Defaults

- Preserve user changes. Never reset or checkout files unless explicitly requested.
- Before commit/push, inspect `git status --short`.
- Commit messages should be concise and describe the user-facing change.
- If there are unrelated dirty files, avoid staging them.

## Memory Update Workflow

Use the persistent memory skill after meaningful work:

- `/decision` for durable technical/product/design decisions.
- `/bugfix` for resolved bugs or important regressions.
- `/architecture` for route/component/schema/service structure changes.
- `/session-summary` at the end of a substantial session.
- `/remember` for safe general project context.
- `/recall` before revisiting a feature with prior decisions.

When adding memory manually, append to the correct file in `.codex/project-memory/` and avoid secrets.

## Slash Commands Installed For Memory

- `/remember`
- `/recall`
- `/project-context`
- `/decision`
- `/bugfix`
- `/architecture`
- `/session-summary`

## Slash Commands Installed For Engineering

- `/review`
- `/qa`
- `/design-review`
- `/security-review`
- `/codex`
- `/ship`
- `/code-review`
- `/security-guidance`
- `/superpowers`

## Update Installed Skills

```bash
cd ~/.gstack/repos/gstack
git pull --ff-only
./setup --host codex --no-prefix

npx skills@latest update --global
```
