# TODO Memory

## Open Risks

- Review and fix security findings from the read-only `/security-review` smoke test:
  - server-side verification for financial ledger/on-chain writes
  - KYC `submitted` versus `approved` handling
  - Android release signing key/password rotation and secret removal
  - auth/rate limits/token caps for public OpenAI endpoints

## Product/UX Follow-Ups

- Keep auditing desktop pages for English-only UI copy.
- Keep mobile layouts stable when desktop pages are adjusted.
- Ensure all protected desktop internals use sidebar/topbar and consistent content spacing.
- Continue using shared desktop components instead of screen-specific copies.

## Memory Hygiene

- Keep memory concise and searchable.
- Prefer updating existing entries over duplicating facts.
- Never save secrets, environment values, private keys, or raw user-sensitive data.
