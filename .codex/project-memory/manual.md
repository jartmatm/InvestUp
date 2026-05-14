# Manual Memory Operations

## Add A General Note

```bash
~/.codex/skills/project-memory/scripts/memory.sh remember "Short title" "Safe note body"
```

## Add A Decision

```bash
~/.codex/skills/project-memory/scripts/memory.sh decision "Short title" "Decision, rationale, files, tradeoffs"
```

## Add A Bugfix

```bash
~/.codex/skills/project-memory/scripts/memory.sh bugfix "Short title" "Bug, fix, regression guard"
```

## Add Architecture Context

```bash
~/.codex/skills/project-memory/scripts/memory.sh architecture "Short title" "Architecture change or important structure"
```

## Search Memory

```bash
~/.codex/skills/project-memory/scripts/memory.sh recall "query"
```

## Print Project Context

```bash
~/.codex/skills/project-memory/scripts/memory.sh project-context
```

## Reset Memory

To reset repo-local memory:

```bash
mv .codex/project-memory .codex/project-memory.backup
```

To reset the global mirror for this project:

```bash
rm -rf ~/.codex/memories/projects/InvestUp
```

Only reset memory intentionally. Prefer editing or pruning specific entries.
