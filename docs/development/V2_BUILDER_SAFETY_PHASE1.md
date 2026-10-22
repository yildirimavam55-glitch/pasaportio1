# Issue #2 — V2 builder safety phase 1

Base: `chore/launch-readiness-2026-10-22`, `a0a6cd47eea22f741c17c4926c9cc245aaceeb1e`.
Review branch: `fix/v2-builder-safety-phase1`. Draft only; no production approval.

## P1A: restore only a draft

`restoreV2Version` retains authentication and `adminDb` authorization. The injected,
offline-tested `restoreV2Draft` checks the requested page, document identity,
version-to-document association, snapshot page and section structure. Its update
contains only `data`, retaining all existing members except `draft`. It never writes
`status`, `published_at` or a replacement `published` value. A failed compare-and-swap
on the read `updated_at` returns a conflict. A missing current document cannot be
re-created or published by restore. The Admin confirmation and feedback explicitly
say that publication is unchanged.

## P1B: reference and deletion checks

The reference registry covers all known marketing locations in the checked-in baseline:
destination/airport content, route presets and campaigns (direct desktop/mobile IDs
and nested content), guides (hero ID/URL), guide translations (sections/FAQ/city facts),
all CMS documents and translations (not only storefront keys), every retained CMS
version (including theme snapshots), current theme draft/published logo/favicon, and
duplicate media records pointing to the same path. Nested section/card/image overrides
are included through their complete JSON documents. Matching checks IDs and stored/
encoded paths, including URLs containing those paths; conservative false positives
block rather than delete. Own media metadata is not counted as a reference.

The scanner uses ordered 100-row pages with exact counts, independent of the 300-item
library screen. Unknown counts, database/permission errors, duplicate page rows,
truncation, changing counts, over 10,000 rows per source or over 20 million serialized
characters per source fail closed. All retained versions count; nothing ages out
silently. The server no longer accepts a force bypass. Storage failures prevent the
metadata delete; metadata/audit failures after deletion are explicit partial outcomes.
The UI offers replacement-first guidance, confirmation and visible errors.

### Important remaining limits — do not merge as fully race-safe

- Counts/pagination are not a consistent database snapshot. A simultaneous writer
  can introduce a reference without changing row counts, or after the scan. Current
  metadata/Storage deletion is **not atomic**. A database-coordinated reservation or
  soft-delete workflow, enforced by every reference writer, is needed before claiming
  concurrent reference safety. This PR does not pretend that a second scan solves it.
- Live schema drift/new reference tables cannot be certified from a repository scan.
  The current database and Storage have not been accessed. Expand/verify the registry
  against the intended test database before enabling deletion there.
- If Storage succeeds and metadata deletion fails, the metadata remains with a missing
  file. The operation reports an explicit error; it must be reconciled, not blindly retried.
- Broad history scans may reach the safety limit. Then deletion is blocked; do not
  raise limits or prune history without a reviewed reference-index design.

## P1C: honest write guarantees

Read errors and version insert errors are no longer ignored. Audit failures after a
document/version write explicitly identify a partial operation. There is no compensating
write advertised as rollback. Existing save still has multiple requests, and a stale
Admin session can overwrite another Admin's work; restore's read/write compare-and-swap
does not provide editor-session revision checking or document/version/audit atomicity.

`docs/migration/pending/v2_builder_atomicity_proposal.sql` is an **unapplied review
proposal**, outside migration discovery. It proposes an invoker-rights RPC with explicit
Admin authorization, row locking, expected revision checks and document/version/audit
writes in one PostgreSQL transaction. The review script ends in ROLLBACK deliberately.
It is not wired into the application. Existing V2 sanitization must remain, grants/RLS
and function signatures must be checked in an isolated database, all writers must be
converted, and concurrency/error-injection tests must pass before requesting application.
Schema rollback is dropping only the new RPC after reverting its callers; never delete
existing versions/audits or restore old document contents as a schema rollback.

## Visibility/RLS finding — repository evidence only

The checked-in baseline's published CMS SELECT policy allows reading a whole published
`cms_documents` row, whose `data` can contain both draft and published. The theme policy
similarly exposes a row containing `draft` and `published`. Server-side projection alone
does not prove direct PostgREST isolation. Effective live grants/policies, later migrations
and view/RPC access paths have NOT been inspected. No live exposure claim is made.
Before release, test anon/non-Admin/Admin reads on a disposable fixture containing a
distinctive draft-only marker. Design a published-only read contract and private draft
access if the finding persists. Do not apply broad policy revocations in this phase.

## Verification and release gates

- Credential-free behavioral checks: `node --test --test-isolation=none scripts/checks/v2-builder-safety.checks.mjs`.
- Local Node 24 checks pass; tests cover restore invariance/rejections/conflicts,
  actual Admin guard denial, every reference source, >300 history entries, pagination
  failures and Storage/metadata partial failures. These are mocks, not real PostgREST tests.
- YAML was parsed locally. SQL proposal was reviewed but not executed or PostgreSQL-parsed.
- Local Bun/Bunx are absent; install/TypeScript/build commands exit 127. A complete
  local checkout/install was not achieved. Local success is not claimed for these checks.
- New PR workflow runs offline checks plus frozen Bun install, TypeScript, production
  build and the unchanged Vitest suite on GitHub Actions, with no project secrets and
  no live security probes. Environment files are removed only in its disposable runner.
- The nine previously reported SQL security failures are separate pre-existing blockers;
  their current count must be established by the actual unchanged suite, not assumed.
- No database operation, migration, account creation, product edit, payment, provider
  order, deployment or publication was performed. Existing security tests are unchanged.

Required owner approval: review the draft changes and unresolved races; authorize isolated
database tests and a separately refined RPC/RLS/media-deletion proposal. No existing
database change is authorized by this PR. Phase 1 is not production-ready until these
gates and the full checks are resolved.
