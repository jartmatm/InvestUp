# Domain Docs

How engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists. It points at one `CONTEXT.md` per context.
- **`docs/adr/`** for architectural decisions relevant to the area being changed.

If any of these files do not exist, proceed silently.

## File structure

This repo uses the single-context default:

```text
/
|-- CONTEXT.md
|-- docs/adr/
`-- docs/agents/
```

## Use the glossary vocabulary

When output names a domain concept in an issue, proposal, test, or diagnosis, use the term defined in `CONTEXT.md` when available.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
