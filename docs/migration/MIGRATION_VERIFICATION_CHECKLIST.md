# Migration verification matrix

Effort = developer days, ESTIMATE only.

| Component | Current state | Exportable | Must be rebuilt | Actions | Depends on | Risk | Validation | Effort (est.) |
|---|---|---|---|---|---|---|---|---|
| Source code | Builds, 1,208 tests pass | Yes (git) | Vite preset | Replace `@lovable.dev/vite-tanstack-config` | — | Low | Build + full test suite | 0.5–1 |
| Database schema | Baseline + 6 migrations, proven rebuild | Yes | — | Apply in order | New DB | Medium | Schema diff empty | 0.5 |
| Database data | 73 MB, 70 tables | Yes (pg_dump) | — | Dump/restore, triggers off | Platform export | Medium | Per-table counts + checksums | 0.5 |
| Security (RLS, grants) | 112 policies, column grants | Yes (in migrations) | — | Re-run security suite on new DB | Schema | High | Anon cannot read cost/drafts; customer cannot reach admin | 0.5 |
| Auth users | 1 admin | Only via platform export | Sessions | Restore with hashes | Platform support | High | Owner signs in with old password | 0.5 |
| Google / Apple | Lovable broker | No | Yes | Own OAuth apps + code swap | Domain | Medium | Real sign-in on staging | 1 |
| Auth e-mails | Platform default | No | Yes | SMTP + branded templates | E-mail domain | Medium | Verify + reset mails arrive | 0.5–1 |
| Images | Lovable asset host (~225 refs) | Download while on Lovable | Hosting | Upload + rewrite URLs | Storage/CDN | **High** | Crawl: 0 broken images | 1–2 |
| Storage buckets | 3 empty buckets, 4 dangling media rows | Nothing to copy | Buckets/policies | Recreate `media`; fix 4 rows | — | Low | Upload/read test | 0.25 |
| AI translation (admin) | Lovable AI Gateway | No | Yes | Swap to another AI API or remove buttons | API key | Low | Admin translate works / hidden | 0.5–1 |
| eSIM Go | 403 since copy | Config only | — | Key + IP allowlist | Supplier | **High** | Read-only balance check succeeds | 0.5 + supplier time |
| eSIM Access | Cancelled | — | — | Do not migrate keys unless approved | Owner | Low | — | 0 |
| Scheduler | None | — | Yes | 3 cron jobs with secret | Hosting | Medium | "Monitoring active" shown | 0.5 |
| App e-mail templates | Tables only | Yes | Sending | Finish admin + provider later | E-mail provider | Low | Preview + test mail to internal | 2–3 |
| Payments | Mock only | — | Yes | After migration, separate approval | Provider | — | — | n/a |
| DNS / domain | lovable.app subdomain | — | Yes | Domain, HTTPS, redirects | Registrar | Medium | All routes 200 on new domain | 0.5 |

## Go-live checklist
- [ ] Row counts match for all 70 tables
- [ ] Schema diff empty; security suite green on new DB
- [ ] Owner admin sign-in; customer test account cannot open /admin
- [ ] Homepage, country page, cart, mock checkout in TR/DE/EN + 1 overlay language + Arabic
- [ ] 0 broken images (crawler)
- [ ] Prices identical to source for 20 sampled products; currency rates < 48 h
- [ ] Provider Hub balance check succeeds (read-only)
- [ ] Scheduled jobs ran once and are visible
- [ ] Auth e-mails delivered; password reset works
- [ ] Sitemap/canonical use new domain
- [ ] Backup + test restore completed on new host
