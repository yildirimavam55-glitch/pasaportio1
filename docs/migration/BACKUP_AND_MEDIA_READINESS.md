# Backup & media readiness (Stage A, read-only, 12.10.2026)

## Database backup
- Method: `pg_dump` 17.9 is available in the workspace and the workspace role can read all `public` tables (not the `auth` schema).
- Proposed (needs approval): `pg_dump --schema=public --format=custom` + `--schema-only` copy + per-table row-count manifest + SHA-256 checksums.
- Storage: private project Files under `/mnt/documents/.lovable/backups/<date>/` (owner-only) and one off-platform copy downloaded by the owner. Never a public bucket. Optional: private bucket with admin-only policies.
- Restore test: restore into a disposable PostgreSQL 17 (baseline + migrations, then data), compare row counts + checksums.

## Existing backups — CORRECTED 12.10.2026 11:10
- Earlier report said the Phase 1 folder was empty; that was wrong (the size tool reports 0 on this file system). It holds `data_public.dump` (4.75 MB), `schema_public_with_grants.sql` and `SHA256SUMS` from 06:35 — older than Phases 2–5.
- NEW full backup 12.10.2026 ~11:07: private copy `/mnt/documents/.lovable/backups/2026-10-12-full/`, downloadable package `backups/pasaportio-backup-2026-10-12.zip` (37.8 MB, SHA-256 317d4d36…bf3fd06). 239 files, every checksum verified.
- Restore test passed in an isolated throwaway PostgreSQL 17.9 (stopped and deleted afterwards): all 70 tables' row counts equal, 112 policies, 143 indexes, 38 triggers; content fingerprints of products, exchange rates and guide translations identical. Only expected gap: 4 links to user accounts (not included) could not be created.
- Storage buckets `database_export_03_10_26` and `database_export_07_10_26` contain 0 files.

## Auth users
- 1 account, signs in with Google only; **no password hash stored** (0 bcrypt hashes). Nothing to port for passwords.
- Migration = recreate the Google identity: same Google account e-mail signs in on the new system (Google user id is stable), then reassign the `admin` row in `user_roles` to the new user id.
- `auth` schema is only readable through the platform; an export of `auth.users`/`auth.identities` would require approval.

## Hosted images
- 214 unique images on Lovable's asset host (`/__l5e/assets-v1/…`), ~28 MB, referenced by 214 pointer files + 11 source files (the "~225"). 3 guide hero images in the database reuse 3 of these.
- Reachability via the published site: **214/214 OK (HTTP 200)**. None missing.
- Plan (needs approval): download each file by its pointer to `public/media/<original_filename>` (or a CDN bucket), keep a manifest (asset id → new path → checksum), replace imports of `*.asset.json` with direct file imports/paths, update the 3 `guides.hero_image_url` values, crawl all pages for broken images.

## The 4 missing media records (`media_assets`, bucket files absent)
| id | label | storage_path | size |
|---|---|---|---|
| e18a36ef-46f5-436e-82e4-a7b056a1dddd | 278607.png | global/8ad2bead-061b-4938-be9f-624722cc2667.png | 2.35 MB |
| d7efd698-2c87-4519-9033-a0cd6ab67624 | 278608.png | global/d7cccc35-cbb3-47c6-b896-e34704b1d04a.png | 1.93 MB |
| b8459520-0c7f-4c82-a334-188acfe0b9f4 | 278609.png | global/67f4d811-c1a5-4169-b010-53b9dd912573.png | 1.99 MB |
| a4e22de3-8fa4-40ee-aaf8-5afc70187120 | 278606.png | global/5f230994-679c-432d-b59d-1bbb3f4256dd.png | 1.82 MB |
All uploaded 06.10.2026; files lost in the project copy. Need re-upload by owner or row cleanup (approval).
