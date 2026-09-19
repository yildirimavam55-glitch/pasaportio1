# eSIM catalogue — provider-sourced, deduplicated, exclusive categories

## Goal

Every eSIM package shown to a customer comes from the supplier catalogue, appears exactly once on the page, and belongs to exactly one of four sections. No country, language or provider is special-cased.

## What already holds (verified)

- All customer packages are loaded from the supplier catalogue through the catalogue query; there are no hard-coded package arrays in the storefront.
- The supplier sync imports the complete catalogue (no top-N or 10 GB limits); storefront visibility is decided by published / visible / available / price rules.

So the work is concentrated in classification and rendering, not in the sync.

## What changes

### 1. New classification module (`src/domain/esim/catalogue-sections.ts`)

One pure function turns the eligible catalogue into the final page model:

```
normalize identity -> dedupe -> classify -> order -> safety check
```

- **Identity**: `provider + providerProductId` when both exist, otherwise the catalogue row id. Never GB / price / label.
- **Dedupe**: first occurrence wins; two rows with different provider product ids are always kept as distinct products.
- **Exclusive classification**, in this priority:
  1. `RECOMMENDED` — the single recommended product id
  2. `UNLIMITED` — unlimited plans (including unlimited global/regional)
  3. `BROADER_COVERAGE` — capped plans whose coverage is meaningfully wider than the selected trip
  4. `STANDARD` — everything else eligible
- Each product lands in exactly one bucket; no product is filtered into two arrays.
- Coverage width is derived from the normalized coverage scope relative to the requested ISOs — no `if country === "TR"` style rules.
- Classification takes no locale input, so TR/DE/EN produce identical buckets.

### 2. Invariant + safety dedupe

The function returns counters (`received`, `eligible`, `unique`, and a count per bucket) and asserts

```
recommended + standard + unlimited + broader === unique eligible
```

A second pass over the rendered ids detects any product appearing twice; in development this logs an error and the duplicate is dropped rather than rendered.

### 3. Packages page rendering (`src/routes/esim.paketler.tsx`)

The page consumes the new model and renders, in order:

1. Önerilen
2. Standart paketler
3. Sınırsız seçenekler
4. Daha fazla ülke kapsayan paketler

The recommended product is no longer repeated in any list below. Existing card design, selection behaviour, cart logic, copy style and section collapse behaviour stay as they are; only which products go into which list changes. Section titles for the two new/renamed groups are added to the TR/DE/EN copy already in this file. No size cap hides large packages (50 GB local products stay in Standard).

### 4. Tests (`src/domain/esim/__tests__/catalogue-sections.test.ts`)

Covers: duplicate provider product id collapses to one; unlimited global only in Unlimited; recommended standard and recommended unlimited appear only in Recommended; regional capped plan in Broader coverage; 50 GB local plan in Standard; locale change does not alter membership; five different countries yield no duplicates; the sum invariant holds in every case.

## Untouched

Supplier API, catalogue sync, coverage import, pricing, recommendation GB calculation, cart, checkout, admin, auth, routing, and the locked visual design.
