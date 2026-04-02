# Local Docker stack (fork / esign)

Runs **PostgreSQL**, **Inbucket** (catch-all SMTP + mail UI), **Redis**, and the **Remix app image built from your repo** (same `docker/Dockerfile` as upstream).

## Prerequisites

- [Docker Desktop](https://docs.docker.com/desktop/) (or Docker Engine + Compose v2)
- A root **`.env`** file (copy from `.env.example` in the repository root if you do not have one yet)

## Start

From the **repository root**:

```sh
pnpm run docker:local:up
# or: docker compose -f docker/local/compose.yml up --build
```

Or use package scripts:

```sh
pnpm run docker:local:up
pnpm run docker:local:down
pnpm run docker:local:logs
```

## URLs

| Service    | URL                          |
| ---------- | ---------------------------- |
| App        | http://localhost:3000        |
| Mail (UI)  | http://localhost:9000        |
| Postgres   | `localhost:54320` (optional) |
| Redis      | `localhost:63790` (optional) |

## Sign in

The database starts **empty** (migrations only). Either:

1. **Sign up** at `/signup` with a new account, or  
2. From the repo root (with `pnpm install` done and `.env` using `127.0.0.1:54320` for the DB URL):  
   `pnpm --filter @documenso/prisma run prisma:seed`  
   Then sign in as **`example@documenso.com`** / **`password`** or **`admin@documenso.com`** / **`password`**.

Auth compares the browser `Origin` to `NEXT_PUBLIC_WEBAPP_URL`. This repo treats **`localhost` and `127.0.0.1`** as the same for local use so either URL works.

## Signing certificate

The compose file mounts **`apps/remix/example/cert.p12`** into the container for local testing. Set **`NEXT_PRIVATE_SIGNING_PASSPHRASE`** in your root `.env` if your certificate uses a password.

## Database seed (optional)

The container runs **`prisma migrate deploy`** on start (`docker/start.sh`). To seed sample data from your machine (same DB as the stack):

```sh
pnpm run with:env -- pnpm --filter @documenso/prisma run prisma:seed
```

Ensure your root `.env` uses **`127.0.0.1:54320`** for `NEXT_PRIVATE_DATABASE_URL` when running this from the host.

## Email / branding checks

Use **`NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000`** in `.env` so links and image URLs in emails match how you open the app. View messages in Inbucket at port **9000**.

## Development vs full Docker

- **Hot reload (typical dev):** `pnpm run dx:up` then `pnpm run dev` — only infra runs in Docker.
- **Full app in Docker:** this `docker/local` stack — use when you want to test the production image locally.
