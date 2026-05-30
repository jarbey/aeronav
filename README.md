# AeroNav

A full-stack flight navigation application built with React + Vite (frontend) and Fastify + Prisma (backend), backed by PostgreSQL.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+
- [Node.js](https://nodejs.org/) 20+ (for local development without Docker)

## Quick Start

```bash
cp .env.example .env
docker compose up
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

## Database Migrations

Run Prisma migrations inside the running backend container:

```bash
docker compose exec backend npm run db:migrate
```

## Database Seeding

Populate the database with seed data:

```bash
docker compose exec backend npm run db:seed
```

## Project Structure

```
aeronav/
├── frontend/          # React + Vite application (port 5173 in dev)
│   ├── Dockerfile
│   ├── nginx.conf     # Production nginx config
│   └── src/
├── backend/           # Fastify API + Prisma ORM (port 3001)
│   ├── Dockerfile
│   └── src/
├── docker-compose.yml          # Development stack
├── docker-compose.prod.yml     # Production stack (pulls from GHCR)
└── .env.example                # Environment variable template
```

## Production Deployment

### VPS Setup

1. Install Docker and Docker Compose on the VPS.
2. Create the application directory and copy the production compose file:

```bash
mkdir -p /opt/aeronav
scp docker-compose.prod.yml user@your-vps:/opt/aeronav/
```

3. Create `/opt/aeronav/.env.prod` on the VPS with the required production values (see `.env.example` for reference). At minimum you need:

```
POSTGRES_DB=aeronav
POSTGRES_USER=aeronav
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://aeronav:<strong-password>@db:5432/aeronav
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
GITHUB_REPOSITORY=<owner>/<repo>
```

4. On first deploy, run migrations manually:

```bash
cd /opt/aeronav
docker compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
```

### CI/CD via GitHub Actions

Pushing to `main` triggers `.github/workflows/deploy.yml`, which:

1. Builds and pushes Docker images to GitHub Container Registry (GHCR).
2. SSHes into the VPS and runs `docker compose -f docker-compose.prod.yml up -d`.

### Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions** of your GitHub repository:

| Secret | Description |
|---|---|
| `VPS_HOST` | IP address or hostname of the production VPS |
| `VPS_USER` | SSH username on the VPS (e.g. `ubuntu` or `deploy`) |
| `VPS_SSH_KEY` | Private SSH key with access to the VPS (PEM format) |

`GITHUB_TOKEN` is provided automatically by GitHub Actions and does not need to be added manually.

## Environment Variables Reference

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | Backend | Full PostgreSQL connection string |
| `JWT_SECRET` | Backend | Secret for signing JWT tokens |
| `NODE_ENV` | Backend | `development` or `production` |
| `VITE_API_URL` | Frontend (build time) | Base URL for API calls |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Backend | Google OAuth credentials |
| `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` | Backend | Facebook OAuth credentials |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | Backend | Microsoft OAuth credentials |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Backend | Apple OAuth credentials |
