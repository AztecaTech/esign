# Local Docker stack (fork / esign)

## Default: two services

`pnpm run docker:local:up` starts only:

| Service        | Container name              | Role                          |
| -------------- | --------------------------- | ----------------------------- |
| `database`     | `esign-local-database`      | PostgreSQL                    |
| `application`  | `esign-local-application`   | Remix app (production image)  |

Check with `docker compose -f docker/local/compose.yml ps` — you should see those two services running.

The app is configured with **`NEXT_PRIVATE_JOBS_PROVIDER=local`** in Compose so it does not need Redis in this mode. SMTP comes from your root **`.env`** (use a real relay, or use the devtools stack below for Inbucket).

## Optional: mail + Redis (devtools profile)

For Inbucket (catch-all SMTP + mail UI) and Redis (e.g. BullMQ testing), use the merge file and profile:

```sh
pnpm run docker:local:up:devtools
```

Equivalent:

```sh
docker compose -f docker/local/compose.yml -f docker/local/compose.devtools.yml --profile devtools up -d --build
```

`pnpm run docker:local:down` passes the same files and profile so Inbucket/Redis containers are removed too.

## Prerequisites

- [Docker Desktop](https://docs.docker.com/desktop/) (or Docker Engine + Compose v2.20+ for `depends_on` `required: false`)
- A root **`.env`** file (copy from `.env.example` in the repository root if you do not have one yet)

## URLs

| Service    | URL                          |
| ---------- | ---------------------------- |
| App        | http://localhost:3000        |
| Mail (UI)  | http://localhost:9000        | (only with `devtools` profile) |
| Postgres   | `localhost:54320` (optional) |
| Redis      | `localhost:63790` (optional) | (only with `devtools` profile) |

## Scripts (repo root)

```sh
pnpm run docker:local:up
pnpm run docker:local:up:devtools
pnpm run docker:local:down
pnpm run docker:local:logs
```

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

With the **devtools** profile, set **`NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000`** in `.env` so links in emails match how you open the app. View messages in Inbucket at port **9000**.

## Development vs full Docker

- **Hot reload (typical dev):** `pnpm run dx:up` then `pnpm run dev` — only infra runs in Docker.
- **Full app in Docker:** this `docker/local` stack — use when you want to test the production image locally.
