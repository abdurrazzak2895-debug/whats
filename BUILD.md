# OpenWA — Build, Test & Run Guide

Verified working on: **Node v24.22.2 / npm 11.19.1** (engine requirement: `>=22.19`)
Repo: `kamalsvp247/whats` — branch `main` — v0.29.1

---

## 1. Install dependencies

```bash
cd /workspace
# Puppeteer downloads Chrome at install; skip it here (the Docker image installs Chrome itself).
PUPPETEER_SKIP_DOWNLOAD=true npm ci --include=dev
```

## 2. Build

### API (NestJS)
```bash
npm run build          # nest build  -> dist/
```

### Dashboard (React + Vite)
```bash
npm run dashboard:build   # -> dashboard/dist/
```

### Both at once
```bash
npm run build:all   # nest build && dashboard:build
```

## 3. Run

### Production (bare metal)
```bash
npm run start:prod   # node dist/main   (API + dashboard on port 2785)
```

### Development (watch mode)
```bash
npm run dev   # API watch + dashboard dev concurrently
```

### Docker Compose (production)
```bash
docker compose up -d   # openwa-api, postgres, redis, minio
# API: http://localhost:2785  |  API docs: http://localhost:2785/api/docs
```

Config: copy `.env.example` to `.env` and adjust. Most dashboard-owned keys stay commented out.

## 4. Test

```bash
npm test        # jest
npm run test:scripts   # node --test scripts/*.spec.*
```

Verified full-suite result (Node 24.22.2):
- **18,353 passed**, 114 skipped, **3 failed**, 18,470 total
- 745 suites passed, 12 skipped, 6 failed suites, 751 of 763 total
- Time: ~163 s

The 3 failing tests are **environmental, not code defects**:
- `ffmpeg-run.spec.ts` — `ffmpeg` binary not installed in this sandbox
- `release-tags.spec.ts`, `node-engine-floor.spec.ts`, `release-staging-cleanup.spec.ts`, `release-notes.spec.ts`, `split-php-sdk-workflow.spec.ts` — read `.github/workflows/*.yml` files that are not present in this fork

## 5. Project layout

| Path | Purpose |
|------|---------|
| `src/` | NestJS API (session, message, webhook, group, contact, auth, infra, engine, modules…) |
| `dashboard/` | React dashboard (Vite, TS) |
| `sdk/` | Official SDK |
| `charts/openwa/` | Helm chart |
| `docs/` | 29 design/ops documents |
| `scripts/` | backup/restore, smoke tests, patchers, check scripts |
| `docker-compose.yml` | openwa-api + postgres + redis + minio |
| `Dockerfile` | Multi-stage (builder on node:22-slim, prod installs Chrome) |

## 6. Git workflow

```bash
git checkout -b feature/your-change
# ... edit ...
git add .
git commit -m "feat: your change"
git push origin feature/your-change
# then open a PR against main
```

Default branch: `main` (protected via CI in upstream; this fork has no `.github/workflows` CI files yet).
