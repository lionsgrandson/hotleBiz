# Validation status

This source tree received static and focused logic validation in the generation environment.

## Completed

- All TypeScript/TSX source files were transpile-parsed for syntax errors after final security patches.
- `npm run self-test` checks weighted scoring, 0–100 reputation output, confidence thresholds and rebook-rate calculation.
- The same self-test checks AES-256-GCM encrypt/decrypt round-trip, deterministic normalized HMAC matching, identifier-domain separation and token helpers.
- Source scans checked for stale plaintext database-column references after encryption expansion.
- Deployment script is fail-fast: environment check, typecheck, production build, migration, schema verification, Vercel environment sync, then production deploy.
- Configuration and Vercel-environment helper scripts were syntax-checked with Node. The configuration wizard was exercised in an isolated pseudo-terminal, and Vercel environment synchronization was exercised against a mock CLI boundary without exposing values.
- Database verification now checks every application table plus that the evidence bucket is private.

## Environment limitation

The execution environment used to assemble this repository could not reach the public npm registry (DNS/network failure), so a fresh `npm install` and real `next build` could not be completed here. The project therefore does not claim a successful dependency-resolved production build inside this environment.

`deploy.cmd` performs the real dependency installation, TypeScript check and Next.js production build before it applies/deploys the web tier. Do not bypass failures.

## Launch validation still required

Run the deployment in a networked development/staging environment, complete the post-deploy checks in `DEPLOYMENT.md`, then run integration tests, browser/device QA, Supabase security advisors and an external security/privacy review before accepting real guest data.
