# Brick Breaker

Static canvas game published at `/brick-breaker/`.

## Run

Serve the repository root over HTTP; service workers and module assets do not work reliably from `file://`.

## Product contract

- Language priority: `?lang=` → saved language → browser language → English.
- Ad serving, interstitials, rewarded revives, and cross-promotion are suspended while the site is under an invalid-traffic restriction.
- Funnel events are private GA4 events emitted at most once per page load:
  `brick_breaker_view`, `brick_breaker_start`, `brick_breaker_progress`,
  `brick_breaker_complete`, and `brick_breaker_share`.
- Share completion is counted only after the native share or clipboard action succeeds.
- The service worker caches only same-origin requests within `/brick-breaker/` and deletes only caches owned by this app.

## Validation

From the portfolio repository:

```powershell
npm run verify:brick-breaker-suspension
```
